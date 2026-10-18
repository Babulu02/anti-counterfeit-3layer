"""
backend/seed.py
================
Creates ~20 demo products in the database and on the Ganache chain.

Images are read from /data/product-images.  If no images exist, placeholder
records are created without images.

Usage (from repo root with venv active):
    python backend/seed.py

Prerequisites:
  - Ganache CLI running on port 7546 (deterministic)
  - Contract deployed and address in .env
  - account[2] whitelisted as manufacturer (run scripts/setup_chain.py first,
    or run: python backend/scripts/setup_chain.py)

NOTE: This script registers products on-chain using real Ganache transactions.
      It is safe to run multiple times — duplicate product IDs will be skipped.
"""

import hashlib
import json
import sys
import uuid
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────────────
_REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_REPO))
sys.path.insert(0, str(_REPO / "backend"))

from app.config import get_settings
from app.database import SessionLocal
from app.crud import create_product, get_product_by_pid, upsert_tag
from app.chain import chain_register_product
try:
    from identity.qr_identity import make_qr_payload
    from identity.nfc_ntag import EmulatedTag
except ImportError:
    from backend.identity.qr_identity import make_qr_payload
    from backend.identity.nfc_ntag import EmulatedTag

settings = get_settings()

# 20 demo products
DEMO_PRODUCTS = [
    {"name": "Luxury Watch Alpha",     "brand": "TimeCraft",    "serial": "TC-0001"},
    {"name": "Smart Handbag Classic",  "brand": "LuxBag",       "serial": "LB-0001"},
    {"name": "Premium Sunglasses X1",  "brand": "VisionLux",    "serial": "VL-0001"},
    {"name": "Artisan Wallet Pro",     "brand": "LeatherKing",  "serial": "LK-0001"},
    {"name": "Designer Scarf Rouge",   "brand": "SilkHouse",    "serial": "SH-0001"},
    {"name": "Luxury Watch Beta",      "brand": "TimeCraft",    "serial": "TC-0002"},
    {"name": "Smart Handbag Mini",     "brand": "LuxBag",       "serial": "LB-0002"},
    {"name": "Premium Sneakers V2",    "brand": "SoleCraft",    "serial": "SC-0001"},
    {"name": "Artisan Belt Elite",     "brand": "LeatherKing",  "serial": "LK-0002"},
    {"name": "Designer Cap Summer",    "brand": "HeadStyle",    "serial": "HS-0001"},
    {"name": "Cologne OakWood",        "brand": "ScentLux",     "serial": "SL-0001"},
    {"name": "Cologne BlueMarine",     "brand": "ScentLux",     "serial": "SL-0002"},
    {"name": "Smart Bracelet Pro",     "brand": "TechWear",     "serial": "TW-0001"},
    {"name": "Smart Ring Titanium",    "brand": "TechWear",     "serial": "TW-0002"},
    {"name": "Luxury Pen Gold",        "brand": "ScriptCo",     "serial": "SP-0001"},
    {"name": "Luxury Pen Silver",      "brand": "ScriptCo",     "serial": "SP-0002"},
    {"name": "Artisan Keychain Oak",   "brand": "LeatherKing",  "serial": "LK-0003"},
    {"name": "Premium Tie Silk Red",   "brand": "SilkHouse",    "serial": "SH-0002"},
    {"name": "Collector Card Alpha",   "brand": "CardVault",    "serial": "CV-0001"},
    {"name": "Collector Card Beta",    "brand": "CardVault",    "serial": "CV-0002"},
]

MFR_KEY     = settings.manufacturer_private_key
MFR_ADDRESS = "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b"

IMAGES_DIR  = _REPO / "data" / "product-images"


def _find_image(serial: str) -> tuple[str | None, str | None]:
    """Look for an image file matching the serial; return (rel_path, sha256)."""
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        p = IMAGES_DIR / f"{serial}{ext}"
        if p.exists():
            content = p.read_bytes()
            sha256  = hashlib.sha256(content).hexdigest()
            return str(p.relative_to(_REPO)), sha256
    # Fall back to any image in the directory
    images = list(IMAGES_DIR.glob("*.jpg")) + list(IMAGES_DIR.glob("*.png"))
    if images:
        p      = images[0]
        content = p.read_bytes()
        sha256  = hashlib.sha256(content).hexdigest()
        return str(p.relative_to(_REPO)), sha256
    return None, None


def _make_product_id() -> str:
    return "0x" + hashlib.sha256(uuid.uuid4().bytes).hexdigest()


def _compute_record_hash(name, brand, serial, image_sha256) -> str:
    raw = f"{name}|{brand}|{serial}|{image_sha256 or ''}"
    return "0x" + hashlib.sha256(raw.encode()).hexdigest()


def seed():
    db = SessionLocal()
    created = 0
    skipped = 0

    for p in DEMO_PRODUCTS:
        name   = p["name"]
        brand  = p["brand"]
        serial = p["serial"]

        image_path, image_sha256 = _find_image(serial)
        product_id  = _make_product_id()
        record_hash = _compute_record_hash(name, brand, serial, image_sha256)

        # Register on-chain
        try:
            receipt = chain_register_product(product_id, record_hash, MFR_KEY)
            if receipt["status"] != 1:
                print(f"  SKIP {serial}: chain tx reverted")
                skipped += 1
                continue
        except Exception as e:
            print(f"  SKIP {serial}: {e}")
            skipped += 1
            continue

        # Store in DB
        create_product(
            db,
            product_id=product_id,
            name=name,
            brand=brand,
            serial=serial,
            image_path=image_path,
            image_sha256=image_sha256,
            record_hash=record_hash,
            status="registered",
            manufacturer_address=MFR_ADDRESS,
        )

        # Create NFC tag entry
        import hashlib as _h
        uid_bytes = _h.sha256(product_id.encode()).digest()[:7]
        tag       = EmulatedTag(settings.nfc_master_key, uid=uid_bytes)
        uid_h, _, _ = tag.tap()   # advance to counter=1
        upsert_tag(db, uid=uid_h, product_id=product_id, last_counter=0, state="ok")

        qr = make_qr_payload(product_id, f"{created+1:06d}", settings.identity_hmac_secret)
        print(f"  OK  [{serial}] {name}  id={product_id[:14]}...  tx={receipt['tx_hash'][:14]}...")
        created += 1

    db.close()
    print(f"\nDone: {created} created, {skipped} skipped")


if __name__ == "__main__":
    seed()
