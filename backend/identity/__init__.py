"""
backend/identity
================
Product identity layer for the anti-counterfeit-3layer prototype.

Modules
-------
qr_identity         Static QR baseline (HMAC-SHA256 signed URL payload).
nfc_ntag            NTAG 424 DNA-style emulation (AES-CMAC + rolling counter).
nfc_rewrite_baseline  HACP5-style server-rewrite baseline.

NOTE: All NFC functionality is EMULATED in software.
      No physical NFC chip is read or written.
      See docs/LIMITATIONS.md §L-001.
"""

from .qr_identity import make_qr_payload, verify_qr_payload, make_qr_image
from .nfc_ntag import EmulatedTag, Verifier, CloneTag, VerifyResult
from .nfc_rewrite_baseline import RewriteTag, RewriteVerifier

__all__ = [
    "make_qr_payload",
    "verify_qr_payload",
    "make_qr_image",
    "EmulatedTag",
    "Verifier",
    "CloneTag",
    "VerifyResult",
    "RewriteTag",
    "RewriteVerifier",
]
