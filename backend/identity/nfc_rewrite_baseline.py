"""
backend/identity/nfc_rewrite_baseline.py
==========================================
HACP5-style server-rewrite baseline.

What is HACP5?
--------------
The "HACP5" scheme (described in the base paper) works like this:
  1. Each tag holds a "current product ID" (a random token).
  2. When scanned, the server checks if the presented ID matches the stored one.
  3. If it matches → VALID.  The server then generates a NEW random ID and
     "writes" it back to the tag.
  4. If it does NOT match → DUPLICATE (old ID = already-scanned copy).

The idea is that after every scan the ID changes, so a static clone becomes
stale.

KNOWN FLAW (reproduced in tests and experiments)
-------------------------------------------------
Clone-first race:
  - Attacker clones the current ID from the genuine tag.
  - Attacker's clone is scanned FIRST → verifies OK, server writes new ID to
    clone's "memory".
  - Genuine tag still holds the OLD ID → server sees it as a duplicate and
    REJECTS it.

In other words: whoever is scanned first wins.  If the clone wins the race,
the genuine tag is permanently rejected (until manual reset).

This flaw motivates our counter+CMAC design (nfc_ntag.py) where the genuine
tag can always be recovered after a disputed scan.

Implementation notes
--------------------
- "Writing" a new ID back to the tag is emulated: the tag object has a
  current_id attribute that the verifier updates after a successful scan.
- Tags are identified by a stable physical_uid (separate from current_id).
- In a real deployment the write-back requires NFC hardware and a secure
  channel; here it is a direct attribute assignment.
"""

from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass, field
from typing import Optional


# ── RewriteTag ────────────────────────────────────────────────────────────────

class RewriteTag:
    """
    Emulated HACP5-style tag.

    Attributes
    ----------
    physical_uid : bytes  Stable hardware UID (7 bytes).  Not part of the
                          authentication — only used to index the verifier's DB.
    current_id   : bytes  The currently valid random token (32 bytes).
                          Updated by the verifier after every successful scan.
    """

    def __init__(
        self,
        physical_uid: Optional[bytes] = None,
        initial_id: Optional[bytes] = None,
    ) -> None:
        self.physical_uid: bytes = physical_uid or os.urandom(7)
        self.current_id:   bytes = initial_id   or os.urandom(32)

    @property
    def uid_hex(self) -> str:
        return self.physical_uid.hex()

    def present(self) -> tuple[str, str]:
        """
        Present the tag to a reader.
        Returns (uid_hex, current_id_hex).
        """
        return self.uid_hex, self.current_id.hex()

    def _write_new_id(self, new_id: bytes) -> None:
        """
        Simulate the server writing a new ID back to the tag.
        In hardware this requires an authenticated NFC write command.
        """
        self.current_id = new_id


# ── RewriteVerifier ────────────────────────────────────────────────────────────

@dataclass
class ScanRecord:
    """Server-side record for one tag."""
    current_id_hex: str        # Expected current token
    scan_count:     int = 0    # How many times this tag has been scanned


class RewriteVerifier:
    """
    Server-side verifier for the HACP5-style rewrite scheme.

    Workflow per scan
    -----------------
    1. Tag presents (uid, current_id).
    2. Server looks up uid in its DB.
    3. If current_id matches → VALID.  Server generates new_id, updates DB,
       and "writes" new_id back to the tag object.
    4. If current_id does not match → DUPLICATE.  Tag is NOT updated.

    FLAW: If a clone presents the current_id before the genuine tag, the
    genuine tag is thereafter stuck with the old id and will always be
    flagged DUPLICATE.
    """

    def __init__(self) -> None:
        # uid_hex -> ScanRecord
        self._db: dict[str, ScanRecord] = {}

    def register(self, tag: RewriteTag) -> None:
        """Register a tag in the verifier's database (called at manufacture)."""
        self._db[tag.uid_hex] = ScanRecord(current_id_hex=tag.current_id.hex())

    def scan(self, tag: RewriteTag) -> dict:
        """
        Verify a tag presentation and (if valid) write a new ID back.

        Returns
        -------
        dict with keys:
            valid      : bool
            status     : "valid" | "duplicate" | "unknown"
            uid        : str (hex)
            scan_count : int  (after this scan if valid)
            reason     : str
        """
        uid_hex, presented_id_hex = tag.present()

        if uid_hex not in self._db:
            return {
                "valid":      False,
                "status":     "unknown",
                "uid":        uid_hex,
                "scan_count": 0,
                "reason":     "uid_not_registered",
            }

        record = self._db[uid_hex]

        if presented_id_hex != record.current_id_hex:
            # ID mismatch → duplicate / clone detected.
            # FLAW: genuine tag also ends up here if clone was scanned first.
            return {
                "valid":      False,
                "status":     "duplicate",
                "uid":        uid_hex,
                "scan_count": record.scan_count,
                "reason":     "id_mismatch",
            }

        # ── Valid scan: generate new ID and write back ─────────────────────
        new_id = os.urandom(32)
        record.current_id_hex = new_id.hex()
        record.scan_count    += 1
        # Write-back to the physical tag (emulated)
        tag._write_new_id(new_id)

        return {
            "valid":      True,
            "status":     "valid",
            "uid":        uid_hex,
            "scan_count": record.scan_count,
            "reason":     "ok",
        }
