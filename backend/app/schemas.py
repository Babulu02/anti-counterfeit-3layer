"""
backend/app/schemas.py
=======================
Pydantic request/response models for the FastAPI endpoints.

All timestamps are plain datetime objects (no timezone imposed here;
the client sends UTC ISO-8601 strings which FastAPI parses automatically).
"""

from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Product ────────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    """POST /products body (multipart fields, image uploaded separately)."""
    name:                  str = Field(..., min_length=1, max_length=200)
    brand:                 str = Field(..., min_length=1, max_length=120)
    serial:                str = Field(..., min_length=1, max_length=80)
    manufacturer_address:  str = Field(..., description="Ethereum address (checksummed)")
    manufacturer_key:      str = Field(..., description="Private key for on-chain registration")


class ProductOut(BaseModel):
    product_id:           str
    name:                 str
    brand:                str
    serial:               str
    status:               str
    manufacturer_address: str
    created_at:           datetime
    image_sha256:         Optional[str]
    record_hash:          str

    model_config = {"from_attributes": True}


class ProductRegisterResponse(BaseModel):
    product:      ProductOut
    qr_payload:   str          # signed URL to embed in QR
    nfc_payload:  dict         # {"uid": ..., "counter": ..., "cmac": ...}
    tx_hash:      str


# ── Scan ───────────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    product_id:  str
    channel:     Literal["qr", "nfc"]
    # QR fields
    qr_payload:  Optional[str] = None
    # NFC fields
    nfc_uid:     Optional[str] = None
    nfc_counter: Optional[int] = None
    nfc_cmac:    Optional[str] = None
    # Context
    lat:         Optional[float] = None
    lon:         Optional[float] = None
    device_id:   Optional[str]  = None    # hashed before storage
    timestamp:   Optional[datetime] = None


class ScanResponse(BaseModel):
    verdict:         str
    reason:          str
    risk_score:      Optional[float]
    chain_result:    str
    identity_result: str
    on_chain:        bool
    sold:            bool
    chain_tx:        Optional[str]   # logScan tx hash
    product_id:      str


class ScanOut(BaseModel):
    id:              int
    product_id:      str
    channel:         str
    ts:              datetime
    lat:             Optional[float]
    lon:             Optional[float]
    chain_result:    str
    identity_result: str
    risk_score:      Optional[float]
    verdict:         str
    reason:          str

    model_config = {"from_attributes": True}


# ── Health ─────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status:   str
    db:       str
    chain:    str
    contract: str
