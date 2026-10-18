"""
backend/app/main.py
====================
FastAPI application — anti-counterfeit Layer 1 + 3 API.

Endpoints
---------
GET  /health
POST /products                   register product on-chain, return QR+NFC payload
GET  /products                   list all products
GET  /products/{id}              get one product
POST /products/{id}/sell         mark product as sold
POST /scan                       verify identity, read chain, return signals
GET  /products/{id}/scans        scan history for a product

Images are stored under /data/product-images (off-chain).
Only SHA-256 hashes go on-chain.  Device IDs are hashed before DB storage.
"""

import hashlib
import io
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from .chain import (
    build_scan_hash,
    chain_get_product,
    chain_log_scan,
    chain_mark_sold,
    chain_register_product,
    get_contract,
    get_w3,
)
from .config import get_settings
from .crud import (
    create_product,
    get_product_by_pid,
    get_scan_history,
    list_products,
    list_scans,
    mark_product_sold,
    store_scan,
    upsert_tag,
)
from .database import get_db
from .identity_service import verify_nfc, verify_qr
from .models import Base
from .schemas import (
    HealthResponse,
    ProductOut,
    ProductRegisterResponse,
    ScanOut,
    ScanRequest,
    ScanResponse,
)

# Import identity helpers for QR generation
import sys
_ROOT = str(Path(__file__).resolve().parents[2])
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)
from backend.identity.qr_identity import make_qr_payload, make_qr_image
from backend.identity.nfc_ntag import EmulatedTag

app = FastAPI(
    title="Anti-Counterfeit API",
    description="Three-layer anti-counterfeiting: blockchain + ML + fusion",
    version="0.3.0",
)

settings = get_settings()

# Directory for uploaded product images
_IMAGES_DIR = Path(_ROOT) / "data" / "product-images"
_IMAGES_DIR.mkdir(parents=True, exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_product_id() -> str:
    """Generate a unique bytes32 product ID (0x-prefixed hex)."""
    return "0x" + hashlib.sha256(uuid.uuid4().bytes).hexdigest()


def _compute_record_hash(name: str, brand: str, serial: str,
                          image_sha256: str | None) -> str:
    """
    Compute the record hash that goes on-chain.
    SHA-256 of "name|brand|serial|image_sha256"
    Returns 0x-prefixed hex.
    """
    raw = f"{name}|{brand}|{serial}|{image_sha256 or ''}"
    return "0x" + hashlib.sha256(raw.encode()).hexdigest()


def _save_image(upload: UploadFile) -> tuple[str, str]:
    """Save uploaded image, return (relative_path, sha256_hex)."""
    # Read synchronously — works in both sync and async handlers
    content = upload.file.read()
    sha256  = hashlib.sha256(content).hexdigest()
    ext     = Path(upload.filename or "img.jpg").suffix or ".jpg"
    fname   = sha256[:16] + ext
    fpath   = _IMAGES_DIR / fname
    fpath.write_bytes(content)
    return str(fpath.relative_to(Path(_ROOT))), sha256


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["infra"])
def health(db: Session = Depends(get_db)):
    """Liveness check: verify DB and chain connectivity."""
    # DB check
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"

    # Chain check
    try:
        w3 = get_w3()
        block = w3.eth.block_number
        chain_status = f"ok (block {block})"
    except Exception as e:
        chain_status = f"error: {e}"

    # Contract check
    try:
        c = get_contract()
        owner = c.functions.owner().call()
        contract_status = f"ok (owner {owner[:10]}...)"
    except Exception as e:
        contract_status = f"error: {e}"

    return HealthResponse(
        status="ok" if "error" not in db_status else "degraded",
        db=db_status,
        chain=chain_status,
        contract=contract_status,
    )


@app.post("/products", response_model=ProductRegisterResponse,
          status_code=status.HTTP_201_CREATED, tags=["products"])
def register_product(
    name:                 str = Form(...),
    brand:                str = Form(...),
    serial:               str = Form(...),
    manufacturer_address: str = Form(...),
    manufacturer_key:     str = Form(...),
    image:                Optional[UploadFile] = File(None),
    db:                   Session = Depends(get_db),
):
    """
    Register a new product on-chain and in the database.

    - Computes SHA-256 of the uploaded image (image stays off-chain).
    - Computes record_hash = SHA-256(name|brand|serial|image_sha256).
    - Calls registerProduct() on-chain with the manufacturer's key.
    - Generates a QR payload URL and an NFC emulated tag first tap.
    - Returns the QR payload string and NFC payload dict.
    """
    # Process image
    image_path, image_sha256 = None, None
    if image and image.filename:
        image_path, image_sha256 = _save_image(image)

    # Generate IDs and hashes
    product_id  = _make_product_id()
    record_hash = _compute_record_hash(name, brand, serial, image_sha256)

    # Register on-chain
    try:
        receipt = chain_register_product(product_id, record_hash, manufacturer_key)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chain error: {e}")

    if receipt["status"] != 1:
        raise HTTPException(status_code=502, detail="On-chain transaction reverted")

    # Store in DB
    product = create_product(
        db,
        product_id=product_id,
        name=name,
        brand=brand,
        serial=serial,
        image_path=image_path,
        image_sha256=image_sha256,
        record_hash=record_hash,
        status="registered",
        manufacturer_address=manufacturer_address,
    )

    # Generate QR payload
    serial_str  = f"{product.id:06d}"
    qr_payload  = make_qr_payload(product_id, serial_str, settings.identity_hmac_secret)

    # Generate NFC emulated tag first tap
    uid_bytes = hashlib.sha256(product_id.encode()).digest()[:7]
    tag       = EmulatedTag(settings.nfc_master_key, uid=uid_bytes)
    uid_h, ctr, cmac = tag.tap()
    nfc_payload = {"uid": uid_h, "counter": ctr, "cmac": cmac}

    # Store tag initial state in DB
    upsert_tag(db, uid=uid_h, product_id=product_id,
               last_counter=0, state="ok")

    return ProductRegisterResponse(
        product=ProductOut.model_validate(product),
        qr_payload=qr_payload,
        nfc_payload=nfc_payload,
        tx_hash=receipt["tx_hash"],
    )


@app.get("/products", response_model=list[ProductOut], tags=["products"])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all registered products."""
    return list_products(db, skip=skip, limit=limit)


@app.get("/products/{product_id}", response_model=ProductOut, tags=["products"])
def get_product(product_id: str, db: Session = Depends(get_db)):
    """Get a single product by its bytes32 product_id."""
    p = get_product_by_pid(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@app.post("/products/{product_id}/sell", response_model=dict, tags=["products"])
def sell_product(product_id: str, db: Session = Depends(get_db)):
    """Mark a product as sold (on-chain + DB)."""
    p = get_product_by_pid(db, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    if p.status == "sold":
        raise HTTPException(status_code=400, detail="Already sold")

    try:
        receipt = chain_mark_sold(product_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chain error: {e}")

    if receipt["status"] != 1:
        raise HTTPException(status_code=502, detail="On-chain transaction reverted")

    mark_product_sold(db, product_id)
    return {"product_id": product_id, "status": "sold", "tx_hash": receipt["tx_hash"]}


@app.post("/scan", response_model=ScanResponse, tags=["scan"])
def scan_product(req: ScanRequest, db: Session = Depends(get_db)):
    """
    Verify a product scan.

    1. Verify identity (QR signature or NFC counter+CMAC).
    2. Read product from chain.
    3. Store scan row in DB.
    4. Return signals (chain, identity, risk placeholder).

    The fusion verdict is set by Phase 5; here we return a basic verdict
    so the endpoint is functional end-to-end for Phase 3 tests.
    Phase 5 replaces the verdict logic with full fusion.
    """
    ts = req.timestamp or datetime.now(timezone.utc).replace(tzinfo=None)
    product_id = req.product_id

    # ── 1. Identity check ────────────────────────────────────────────────────
    if req.channel == "qr":
        if not req.qr_payload:
            raise HTTPException(status_code=422, detail="qr_payload required for channel=qr")
        id_result = verify_qr(req.qr_payload)
    else:
        if req.nfc_uid is None or req.nfc_counter is None or req.nfc_cmac is None:
            raise HTTPException(status_code=422,
                                detail="nfc_uid, nfc_counter, nfc_cmac required for channel=nfc")
        id_result = verify_nfc(req.nfc_uid, req.nfc_counter, req.nfc_cmac)

    # ── 2. Chain check ───────────────────────────────────────────────────────
    try:
        chain_data = chain_get_product(product_id)
        on_chain   = chain_data["exists"]
        sold       = chain_data["sold"]
        chain_res  = "on_chain" if on_chain else "not_found"
    except Exception:
        on_chain  = False
        sold      = False
        chain_res = "not_found"

    # ── 3. Basic verdict (Phase 5 will replace this) ─────────────────────────
    if not on_chain:
        verdict = "Unregistered product"
        reason  = "Product ID not found on-chain"
    elif id_result["result"] == "bad_mac":
        verdict = "Suspicious activity"
        reason  = id_result["reason"]
    elif id_result["result"] == "invalid":
        verdict = "Suspicious activity"
        reason  = id_result["reason"]
    elif id_result["result"] == "disputed":
        verdict = "Manual review"
        reason  = id_result["reason"]
    elif sold:
        verdict = "Manual review"
        reason  = "Product already sold"
    else:
        verdict = "Verified"
        reason  = "On-chain and identity check passed"

    # ── 4. Log scan on-chain ─────────────────────────────────────────────────
    verdict_map = {
        "Verified": 0, "Manual review": 1,
        "Suspicious activity": 2, "Unregistered product": 3,
    }
    scan_hash  = build_scan_hash(product_id, req.channel,
                                  req.device_id or "", req.lat, req.lon, str(ts))
    chain_tx   = None
    try:
        log_receipt = chain_log_scan(product_id, scan_hash, verdict_map[verdict])
        chain_tx    = log_receipt["tx_hash"]
    except Exception:
        pass   # logScan failure is non-fatal for Phase 3

    # ── 5. Store in DB ───────────────────────────────────────────────────────
    store_scan(
        db,
        product_id      = product_id,
        channel         = req.channel,
        ts              = ts,
        lat             = req.lat,
        lon             = req.lon,
        device_id       = req.device_id,
        chain_result    = chain_res,
        identity_result = id_result["result"],
        risk_score      = None,   # set in Phase 5
        verdict         = verdict,
        reason          = reason,
    )

    return ScanResponse(
        verdict         = verdict,
        reason          = reason,
        risk_score      = None,
        chain_result    = chain_res,
        identity_result = id_result["result"],
        on_chain        = on_chain,
        sold            = sold,
        chain_tx        = chain_tx,
        product_id      = product_id,
    )


@app.get("/products/{product_id}/scans", response_model=list[ScanOut], tags=["scan"])
def get_scans(product_id: str, db: Session = Depends(get_db)):
    """Return all scan events for a product."""
    return list_scans(db, product_id)
