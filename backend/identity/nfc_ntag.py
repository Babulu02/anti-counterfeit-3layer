"""
backend/identity/nfc_ntag.py
==============================
NTAG 424 DNA-style emulation — OUR DESIGN (Layer 1 NFC identity).

⚠️  EMULATION NOTICE ⚠️
All cryptographic operations happen in Python objects (RAM).
No physical NFC chip is accessed.  The security assumption borrowed from the
real NTAG 424 DNA specification is:
    "The per-tag AES key is stored in write-once, read-protected memory on
     the chip and cannot be extracted even with physical access."
In this emulation, the key lives in a Python attribute.  An attacker with
access to the server database could extract it.  This is documented in
docs/LIMITATIONS.md §L-001.

Design overview
---------------
EmulatedTag
    Represents one physical NFC tag.
    - uid      : 7 random bytes, public (printed on tag / in database).
    - _key     : 16-byte AES key, derived per-tag from a master key.
                 Never exposed outside this object.
    - _counter : monotonically increasing tap count (starts at 0).
    - tap()    : increments counter, returns (uid_hex, counter, cmac_hex).
                 cmac = AES-CMAC(key, uid || counter_4bytes)[:8]  (64-bit)

Verifier
    Server-side.  Stores last-seen counter per UID.
    verify(uid, counter, cmac) -> VerifyResult
    Decisions:
        ACCEPT     counter > last AND counter <= last + W AND CMAC valid
        DISPUTED   counter <= last  (replay attack or counter rollback)
        DISPUTED   counter > last + W  (suspiciously large gap)
        REJECT     CMAC fails (key mismatch — attacker has no key)
    After a DISPUTED result, the tag is NOT permanently blocked.  A later
    valid tap with counter > last is ACCEPTED.  This means a genuine tag
    caught in a clone-first race is not permanently locked out.

CloneTag
    Represents an attacker's clone.  It copies uid, last_seen_counter, and
    last_cmac from an observed tap, but has NO key.  It can only replay the
    exact (uid, counter, cmac) it observed.

Gap tolerance W
    Real NFC tags may skip counters if the phone app misses a tap (RF dropout).
    W=5 means we accept up to 5 missed taps.  Larger gaps are DISPUTED so an
    attacker cannot jump the counter arbitrarily far ahead.
"""

from __future__ import annotations

import os
import struct
import hmac as _hmac
import hashlib
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional

from Crypto.Hash import CMAC
from Crypto.Cipher import AES


# ── Constants ────────────────────────────────────────────────────────────────

UID_LEN     = 7    # bytes — NTAG 424 uses 7-byte UID
KEY_LEN     = 16   # bytes — AES-128
CMAC_TRUNC  = 8    # bytes — truncate AES-CMAC to 64 bits (standard practice)
DEFAULT_GAP = 5    # W: maximum accepted counter jump per verify call


# ── Result type ──────────────────────────────────────────────────────────────

class Outcome(Enum):
    ACCEPT   = auto()
    DISPUTED = auto()
    REJECT   = auto()


@dataclass
class VerifyResult:
    outcome : Outcome
    reason  : str          # Human-readable, used in API response
    uid     : str          # hex
    counter : int

    @property
    def accepted(self) -> bool:
        return self.outcome == Outcome.ACCEPT

    @property
    def disputed(self) -> bool:
        return self.outcome == Outcome.DISPUTED

    @property
    def rejected(self) -> bool:
        return self.outcome == Outcome.REJECT

    def __repr__(self) -> str:
        return f"VerifyResult({self.outcome.name}, reason={self.reason!r}, ctr={self.counter})"


# ── Key derivation ───────────────────────────────────────────────────────────

def _derive_key(master_key: bytes, uid: bytes) -> bytes:
    """
    Derive a per-tag AES-128 key from the master key and the tag UID.

    Method: HMAC-SHA256(master_key, uid), take first 16 bytes.
    This is a simple KDF sufficient for a prototype; a real deployment would
    use SP 800-108 counter-mode KDF or SCP03 session key derivation.
    """
    digest = _hmac.new(master_key, uid, hashlib.sha256).digest()
    return digest[:KEY_LEN]


# ── AES-CMAC helper ──────────────────────────────────────────────────────────

def _compute_cmac(key: bytes, uid: bytes, counter: int) -> bytes:
    """
    Compute AES-CMAC over uid (7 bytes) || counter (4 bytes, little-endian).
    Returns first CMAC_TRUNC bytes (8 bytes = 64 bits).

    Using little-endian counter matches the NTAG 424 DNA SUN message format.
    """
    message = uid + struct.pack("<I", counter)   # 7 + 4 = 11 bytes
    cobj = CMAC.new(key, ciphermod=AES)
    cobj.update(message)
    return cobj.digest()[:CMAC_TRUNC]


# ── EmulatedTag ──────────────────────────────────────────────────────────────

class EmulatedTag:
    """
    Emulates one NTAG 424 DNA tag.

    ⚠️  EMULATION: key is stored in Python RAM, not in hardware.

    Parameters
    ----------
    master_key : bytes  16-byte AES master key (from .env NFC_MASTER_KEY).
    uid        : bytes | None  7-byte UID.  Random if None.
    start_counter : int  Initial counter value (default 0).
    """

    def __init__(
        self,
        master_key: bytes,
        uid: Optional[bytes] = None,
        start_counter: int = 0,
    ) -> None:
        if uid is None:
            uid = os.urandom(UID_LEN)
        if len(uid) != UID_LEN:
            raise ValueError(f"UID must be {UID_LEN} bytes, got {len(uid)}")
        if len(master_key) != KEY_LEN:
            raise ValueError(f"Master key must be {KEY_LEN} bytes")

        self.uid: bytes = uid
        # Per-tag key derived from master; never returned by any public method.
        self._key: bytes = _derive_key(master_key, uid)
        self._counter: int = start_counter

    @property
    def uid_hex(self) -> str:
        return self.uid.hex()

    @property
    def counter(self) -> int:
        """Current counter value (read-only view)."""
        return self._counter

    def tap(self) -> tuple[str, int, str]:
        """
        Simulate a tap: increment counter, compute CMAC, return public data.

        Returns
        -------
        (uid_hex, counter, cmac_hex)
            uid_hex  : 14-char hex string
            counter  : int (new value after increment)
            cmac_hex : 16-char hex string (8 bytes truncated AES-CMAC)
        """
        self._counter += 1
        cmac_bytes = _compute_cmac(self._key, self.uid, self._counter)
        return self.uid_hex, self._counter, cmac_bytes.hex()


# ── Verifier ──────────────────────────────────────────────────────────────────

class Verifier:
    """
    Server-side verifier for NTAG 424-style NFC tags.

    Maintains last-seen counter per UID.
    Holds the master key so it can re-derive per-tag keys.

    Parameters
    ----------
    master_key  : bytes  Same master key used to create EmulatedTags.
    gap_tolerance : int  W — max accepted counter jump (default DEFAULT_GAP=5).
    """

    def __init__(self, master_key: bytes, gap_tolerance: int = DEFAULT_GAP) -> None:
        if len(master_key) != KEY_LEN:
            raise ValueError(f"Master key must be {KEY_LEN} bytes")
        self._master_key   = master_key
        self._gap          = gap_tolerance
        # uid_hex -> last accepted counter (None = never seen)
        self._last: dict[str, int] = {}

    def verify(self, uid_hex: str, counter: int, cmac_hex: str) -> VerifyResult:
        """
        Verify a tap presentation.

        Decision tree (in order):
          1. CMAC wrong            -> REJECT   ("bad_mac")
          2. counter <= last_seen  -> DISPUTED ("replay")
          3. counter > last + W    -> DISPUTED ("gap")
          4. Otherwise             -> ACCEPT   (update last_seen)

        A DISPUTED result does NOT update last_seen, so the genuine tag can
        still be accepted on its next tap.
        """
        uid_bytes = bytes.fromhex(uid_hex)
        tag_key   = _derive_key(self._master_key, uid_bytes)

        # ── 1. Verify CMAC first (cheapest way to detect clones / bit errors) ──
        try:
            expected_cmac = _compute_cmac(tag_key, uid_bytes, counter)
        except Exception:
            return VerifyResult(Outcome.REJECT, "bad_mac", uid_hex, counter)

        try:
            received_cmac = bytes.fromhex(cmac_hex)
        except ValueError:
            return VerifyResult(Outcome.REJECT, "bad_mac_hex", uid_hex, counter)

        if not _hmac.compare_digest(expected_cmac, received_cmac):
            # Wrong CMAC: attacker has no key; clone presenting replayed CMAC
            # with a NEW counter will also fail here.
            return VerifyResult(Outcome.REJECT, "bad_mac", uid_hex, counter)

        # ── 2. Counter freshness check ──────────────────────────────────────
        last = self._last.get(uid_hex)

        if last is not None and counter <= last:
            # Replay: valid CMAC but stale counter.
            # Do NOT update last_seen — genuine tag's next tap is still valid.
            return VerifyResult(Outcome.DISPUTED, "replay", uid_hex, counter)

        if last is not None and counter > last + self._gap:
            # Suspiciously large gap.  Could be a clone that tapped many times
            # offline, or a genuine tag with missed RF reads.  Mark disputed
            # but do NOT permanently block (next valid tap in-range is fine).
            return VerifyResult(Outcome.DISPUTED, "gap", uid_hex, counter)

        # ── 3. Accept ────────────────────────────────────────────────────────
        self._last[uid_hex] = counter
        return VerifyResult(Outcome.ACCEPT, "ok", uid_hex, counter)

    def last_counter(self, uid_hex: str) -> Optional[int]:
        """Return the last accepted counter for a UID, or None if never seen."""
        return self._last.get(uid_hex)


# ── CloneTag ──────────────────────────────────────────────────────────────────

class CloneTag:
    """
    Attacker's clone: copies observed public tap data but has NO key.

    The clone can only replay (uid, counter, cmac) tuples it has observed.
    It cannot produce a new valid CMAC for a higher counter because it
    does not know the per-tag key.

    Parameters
    ----------
    uid_hex     : str  Observed UID.
    counter     : int  Last observed counter value.
    cmac_hex    : str  Last observed CMAC.
    """

    def __init__(self, uid_hex: str, counter: int, cmac_hex: str) -> None:
        self.uid_hex  = uid_hex
        self._counter = counter
        self._cmac    = cmac_hex

    def replay(self) -> tuple[str, int, str]:
        """
        Return the single observed tap data.  Counter never increases.

        NOTE: This will be caught as a replay (counter <= last_seen) once the
        genuine tag has been accepted, OR as bad_mac if the clone tries to
        increment the counter without the key.
        """
        return self.uid_hex, self._counter, self._cmac

    @classmethod
    def from_tap(cls, tap_result: tuple[str, int, str]) -> "CloneTag":
        """Convenience: create a CloneTag from a genuine tap() return value."""
        uid_hex, counter, cmac_hex = tap_result
        return cls(uid_hex, counter, cmac_hex)
