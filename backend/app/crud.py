"""
backend/app/crud.py
====================
Database read/write helpers (no FastAPI, no web3 — pure SQLAlchemy).

All device_id values are SHA-256 hashed before storage so raw device
fingerprints are never persisted (privacy by default).
"""

import hashlib
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select

from .models import Manufacturer, Product, Tag, Scan


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash_device(device_id: str | None) -> str | None:
    """Return SHA-256 hex of the device identifier, or None."""
    if not device_id:
        return None
    return hashlib.sha256(device_id.encode()).hexdigest()


# ── Manufacturers ──────────────────────────────────────────────────────────────

def get_manufacturer(db: Session, address: str) -> Manufacturer | None:
    return db.scalar(
        select(Manufacturer).where(Manufacturer.address == address)
    )


def create_manufacturer(db: Session, address: str, name: str) -> Manufacturer:
    mfr = Manufacturer(address=address, name=name)
    db.add(mfr)
    db.commit()
    db.refresh(mfr)
    return mfr


# ── Products ───────────────────────────────────────────────────────────────────

def get_product_by_pid(db: Session, product_id: str) -> Product | None:
    return db.scalar(
        select(Product).where(Product.product_id == product_id)
    )


def list_products(db: Session, skip: int = 0, limit: int = 100) -> list[Product]:
    return list(db.scalars(select(Product).offset(skip).limit(limit)))


def create_product(db: Session, **kwargs) -> Product:
    product = Product(**kwargs)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def mark_product_sold(db: Session, product_id: str) -> Product | None:
    product = get_product_by_pid(db, product_id)
    if product and product.status != "sold":
        product.status = "sold"
        db.commit()
        db.refresh(product)
    return product


# ── Tags ───────────────────────────────────────────────────────────────────────

def get_tag(db: Session, uid: str) -> Tag | None:
    return db.get(Tag, uid)


def upsert_tag(db: Session, uid: str, product_id: str,
               last_counter: int, state: str) -> Tag:
    tag = db.get(Tag, uid)
    if tag is None:
        tag = Tag(uid=uid, product_id=product_id,
                  last_counter=last_counter, state=state)
        db.add(tag)
    else:
        tag.last_counter = last_counter
        tag.state        = state
    db.commit()
    db.refresh(tag)
    return tag


# ── Scans ──────────────────────────────────────────────────────────────────────

def store_scan(
    db: Session,
    product_id: str,
    channel: str,
    ts: datetime,
    lat: float | None,
    lon: float | None,
    device_id: str | None,
    chain_result: str,
    identity_result: str,
    risk_score: float | None,
    verdict: str,
    reason: str,
) -> Scan:
    scan = Scan(
        product_id      = product_id,
        channel         = channel,
        ts              = ts,
        lat             = lat,
        lon             = lon,
        device_hash     = _hash_device(device_id),
        chain_result    = chain_result,
        identity_result = identity_result,
        risk_score      = risk_score,
        verdict         = verdict,
        reason          = reason,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


def list_scans(db: Session, product_id: str) -> list[Scan]:
    return list(db.scalars(
        select(Scan)
        .where(Scan.product_id == product_id)
        .order_by(Scan.ts)
    ))


def get_scan_history(db: Session, product_id: str) -> list[dict]:
    """Return all scans for a product as plain dicts (for ML feature computation)."""
    rows = list_scans(db, product_id)
    return [
        {
            "product_id":      r.product_id,
            "channel":         r.channel,
            "ts":              r.ts,
            "lat":             r.lat,
            "lon":             r.lon,
            "device_hash":     r.device_hash,
            "chain_result":    r.chain_result,
            "identity_result": r.identity_result,
            "risk_score":      r.risk_score,
            "verdict":         r.verdict,
        }
        for r in rows
    ]
