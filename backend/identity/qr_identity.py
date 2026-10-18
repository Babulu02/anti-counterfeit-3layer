"""
backend/identity/qr_identity.py
================================
Static QR identity — the CLONEABLE BASELINE.

Design
------
Each product gets a URL-style payload:
    https://verify.example.com/v?pid=<product_id>&ser=<serial>&sig=<hmac>

where sig = HMAC-SHA256(secret, "pid=<product_id>&ser=<serial>") truncated to
16 bytes and hex-encoded.

KNOWN WEAKNESS (by design)
---------------------------
A photograph or screenshot of the QR code is sufficient to clone the payload.
The HMAC signature only proves the payload was issued by this server; it does
NOT prove freshness, uniqueness of scan event, or physical possession of the
original label.  This weakness is the static-QR baseline measured in Phase 7.
Any printed copy of the QR will verify correctly — that is the EXPECTED behaviour
of this module and is the attack we measure against.
"""

import hmac
import hashlib
import os
import io
from urllib.parse import urlencode, parse_qs, urlparse

import qrcode
from PIL import Image

# Base URL embedded in every QR payload.
# In production this would be the real verification endpoint.
VERIFY_BASE_URL = "https://verify.example.com/v"


def _sign(secret: bytes, message: str) -> str:
    """Return a 16-byte (32 hex char) HMAC-SHA256 truncated signature."""
    full = hmac.new(secret, message.encode("utf-8"), hashlib.sha256).digest()
    return full[:16].hex()  # 128-bit truncation — enough for URL payloads


def make_qr_payload(product_id: str, serial: str, secret: bytes) -> str:
    """
    Build and sign a QR payload URL.

    Parameters
    ----------
    product_id : str   Unique product identifier (e.g. UUID).
    serial     : str   Per-label serial number (e.g. "001").
    secret     : bytes Server HMAC secret (read from .env; never embedded here).

    Returns
    -------
    str  Full URL to embed in the QR image, e.g.:
         https://verify.example.com/v?pid=abc&ser=001&sig=deadbeef...
    """
    # The message that gets signed: just the data fields, no base URL.
    message = f"pid={product_id}&ser={serial}"
    sig = _sign(secret, message)
    params = urlencode({"pid": product_id, "ser": serial, "sig": sig})
    return f"{VERIFY_BASE_URL}?{params}"


def verify_qr_payload(payload: str, secret: bytes) -> dict:
    """
    Verify a QR payload URL.

    Returns a dict:
        {"valid": True,  "product_id": ..., "serial": ...}
    or
        {"valid": False, "reason": ...}

    IMPORTANT: A valid result means the payload was originally signed by this
    server.  It does NOT mean the scan is fresh or that this is the original
    physical label.  A cloned/photographed QR will return valid=True — this is
    the expected baseline behaviour.  The ML layer (Phase 4) is responsible for
    detecting clone attacks through scan-pattern analysis.
    """
    try:
        parsed = urlparse(payload)
        qs = parse_qs(parsed.query)

        # Extract fields — parse_qs returns lists
        product_id = qs.get("pid", [None])[0]
        serial     = qs.get("ser", [None])[0]
        sig        = qs.get("sig", [None])[0]

        if not (product_id and serial and sig):
            return {"valid": False, "reason": "missing_fields"}

        expected = _sign(secret, f"pid={product_id}&ser={serial}")

        # Constant-time comparison prevents timing-oracle attacks
        if not hmac.compare_digest(expected, sig):
            return {"valid": False, "reason": "bad_signature"}

        return {"valid": True, "product_id": product_id, "serial": serial}

    except Exception as exc:  # noqa: BLE001
        return {"valid": False, "reason": f"parse_error: {exc}"}


def make_qr_image(payload: str, box_size: int = 10, border: int = 4) -> Image.Image:
    """
    Generate a QR code PNG image for the given payload.

    Parameters
    ----------
    payload  : str  The URL string returned by make_qr_payload().
    box_size : int  Pixel size of each QR module (default 10).
    border   : int  Quiet-zone width in modules (default 4, QR spec minimum).

    Returns
    -------
    PIL.Image.Image  Ready to call .save(path) or .tobytes() on.
    """
    qr = qrcode.QRCode(
        version=None,           # Auto-size to fit the data
        error_correction=qrcode.constants.ERROR_CORRECT_M,  # ~15% recovery
        box_size=box_size,
        border=border,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").convert("RGB")
