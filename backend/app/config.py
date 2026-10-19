"""
backend/app/config.py
======================
Reads all configuration from the .env file at the project root.
Never logs or exposes passwords or private keys.

Provides a single Settings instance imported by every other module.
URL is built with sqlalchemy.engine.URL.create so special chars in passwords
are percent-encoded safely — no manual string concatenation.
"""

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import URL

# Load .env from the project root (two levels above this file)
_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_PATH, override=False)


class Settings:
    """All environment variables with typed defaults."""

    # ── Database ─────────────────────────────────────────────────────────────
    db_user:     str = os.environ["DB_USER"]
    db_password: str = os.environ["DB_PASSWORD"]   # never printed
    db_host:     str = os.getenv("DB_HOST", "127.0.0.1")
    db_port:     int = int(os.getenv("DB_PORT", "3306"))
    db_name:     str = os.environ["DB_NAME"]
    test_db_name: str = os.environ["TEST_DB_NAME"]

    # ── Blockchain ────────────────────────────────────────────────────────────
    rpc_url:              str = os.getenv("RPC_URL", "http://127.0.0.1:7546")
    contract_address:     str = os.environ["CONTRACT_ADDRESS"]
    operator_private_key: str = os.environ["OPERATOR_PRIVATE_KEY"]
    owner_private_key:    str = os.getenv("OWNER_PRIVATE_KEY", "")
    manufacturer_private_key: str = os.getenv("MANUFACTURER_PRIVATE_KEY", "")

    # ABI path — relative to project root
    abi_path: Path = Path(__file__).resolve().parents[2] / \
        "contracts" / "build" / "contracts" / "ProductRegistry.json"

    # ── Identity secrets ──────────────────────────────────────────────────────
    identity_hmac_secret: bytes = bytes.fromhex(os.environ["IDENTITY_HMAC_SECRET"])
    nfc_master_key:        bytes = bytes.fromhex(os.environ["NFC_MASTER_KEY"])

    # ── ML artefacts ──────────────────────────────────────────────────────────
    ml_model_path:      str = os.getenv("ML_MODEL_PATH",
                                        "experiments/results/rf_model.joblib")
    ml_thresholds_path: str = os.getenv("ML_THRESHOLDS_PATH",
                                        "experiments/results/thresholds.json")
    sop_root:           str = os.getenv("SOP_ROOT",
                                        "C:\\Project-MF\\Stanford_Online_Products")

    def db_url(self, db_name: str | None = None) -> URL:
        """Return a SQLAlchemy URL for the given database name (default: DB_NAME)."""
        return URL.create(
            drivername="mysql+pymysql",
            username=self.db_user,
            password=self.db_password,   # URL.create handles encoding
            host=self.db_host,
            port=self.db_port,
            database=db_name or self.db_name,
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings singleton."""
    return Settings()
