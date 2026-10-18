"""
backend/tests/conftest.py
==========================
pytest fixtures shared across all backend tests.

Key design decisions:
- Every test uses the TEST_DB_NAME database (anticounterfeit_test), never the
  real database.
- Each test gets a fresh DB session via a transaction rollback — fast and
  deterministic.
- The FastAPI TestClient is configured to use the test DB via dependency
  override.
- Chain calls use the real deterministic Ganache CLI on port 7546.
  A fresh ProductRegistry is deployed per-session and setOperator is called
  so logScan works.
- The NFC verifier is reset between tests to avoid counter state bleed.
"""

import json
import sys
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# ── Path setup ────────────────────────────────────────────────────────────────
_REPO = Path(__file__).resolve().parents[2]
_BACK = _REPO / "backend"
for p in [str(_REPO), str(_BACK)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ── Force test DB before any app import ───────────────────────────────────────
os.environ.setdefault("DB_NAME", os.environ.get("DB_NAME", "anticounterfeit"))
# We'll override the engine in the fixture; config is loaded once.

from app.config import get_settings
from app.models import Base
from app.database import get_db
from app.main import app
from app.chain import get_contract, get_w3
from app.identity_service import reset_nfc_verifier

settings = get_settings()

# ── Test DB engine (uses TEST_DB_NAME) ────────────────────────────────────────
test_engine = create_engine(
    settings.db_url(settings.test_db_name),
    pool_pre_ping=True,
    echo=False,
)
TestSessionLocal = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)


@pytest.fixture(scope="session", autouse=True)
def ensure_test_tables():
    """Make sure all tables exist in the test DB (idempotent)."""
    Base.metadata.create_all(bind=test_engine)
    yield


@pytest.fixture(autouse=True)
def clean_test_db():
    """
    Truncate all data tables before each test so tests are independent.
    Faster than drop/recreate; preserves table structure.
    """
    with test_engine.connect() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        conn.commit()
    yield


@pytest.fixture
def db_session() -> Session:
    """Yield a test DB session."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session) -> TestClient:
    """
    TestClient with the real FastAPI app, but DB calls go to the test DB
    via dependency override.
    """
    reset_nfc_verifier()   # fresh NFC counter state for each test

    def override_get_db():
        try:
            yield db_session
        finally:
            pass   # session closed by db_session fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ── Chain fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def w3():
    return get_w3()


@pytest.fixture(scope="session")
def contract():
    return get_contract()


@pytest.fixture(scope="session")
def ganache_accounts(w3):
    """Return the 10 deterministic Ganache accounts."""
    return w3.eth.accounts


@pytest.fixture(scope="session", autouse=True)
def whitelist_manufacturer(w3, contract):
    """
    Whitelist account[2] as a manufacturer once per test session.
    Uses account[0] (owner) private key.
    This is idempotent — repeated runs check isManufacturer first.
    """
    from eth_account import Account as EthAccount
    mfr_addr   = "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b"
    owner_key  = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"
    already    = contract.functions.isManufacturer(mfr_addr).call()
    if not already:
        owner   = EthAccount.from_key(owner_key)
        nonce   = w3.eth.get_transaction_count(owner.address, "pending")
        tx      = contract.functions.addManufacturer(mfr_addr).build_transaction({
            "from": owner.address, "nonce": nonce, "gas": 100000,
        })
        signed  = owner.sign_transaction(tx)
        txhash  = w3.eth.send_raw_transaction(signed.raw_transaction)
        w3.eth.wait_for_transaction_receipt(txhash)


# ── Product registration helper ───────────────────────────────────────────────

@pytest.fixture
def registered_product(client) -> dict:
    """
    Register one product via POST /products and return the full response dict.
    Uses manufacturer account[2] key.
    """
    resp = client.post("/products", data={
        "name":                 "Test Widget",
        "brand":                "TestBrand",
        "serial":               "SN-001",
        "manufacturer_address": "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b",
        "manufacturer_key":     "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c",
    })
    assert resp.status_code == 201, resp.text
    return resp.json()
