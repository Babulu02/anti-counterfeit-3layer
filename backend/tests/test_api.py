"""
backend/tests/test_api.py
==========================
Phase 3 pytest tests for the FastAPI backend.

All tests use:
  - The real deterministic Ganache CLI on port 7546
  - The anticounterfeit_test MySQL database
  - FastAPI TestClient

Groups
------
1.  GET /health
2.  POST /products — valid registration
3.  POST /products — missing fields
4.  GET /products and GET /products/{id}
5.  POST /products/{id}/sell
6.  POST /scan — QR valid
7.  POST /scan — QR invalid signature
8.  POST /scan — NFC valid
9.  POST /scan — NFC bad MAC
10. POST /scan — unregistered product
11. GET /products/{id}/scans
"""

import sys
import os
from pathlib import Path

import pytest

_REPO = Path(__file__).resolve().parents[2]
for p in [str(_REPO), str(_REPO / "backend")]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.config import get_settings
from backend.identity.qr_identity import make_qr_payload
from backend.identity.nfc_ntag import EmulatedTag

settings  = get_settings()
MFR_ADDR  = "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b"
MFR_KEY   = "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c"


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Health
# ═══════════════════════════════════════════════════════════════════════════════

class TestHealth:
    def test_health_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["db"]    == "ok"
        assert "ok" in data["chain"]
        assert "ok" in data["contract"]


# ═══════════════════════════════════════════════════════════════════════════════
# 2. POST /products — valid registration
# ═══════════════════════════════════════════════════════════════════════════════

class TestProductRegister:
    def test_register_returns_201(self, client):
        r = client.post("/products", data={
            "name": "Luxury Watch", "brand": "TimeCo",
            "serial": "TW-0001",
            "manufacturer_address": MFR_ADDR,
            "manufacturer_key": MFR_KEY,
        })
        assert r.status_code == 201

    def test_register_returns_product_fields(self, client):
        r = client.post("/products", data={
            "name": "Smart Bag", "brand": "BagCo",
            "serial": "SB-0001",
            "manufacturer_address": MFR_ADDR,
            "manufacturer_key": MFR_KEY,
        })
        body = r.json()
        p = body["product"]
        assert p["name"]   == "Smart Bag"
        assert p["brand"]  == "BagCo"
        assert p["status"] == "registered"
        assert p["product_id"].startswith("0x")
        assert len(p["product_id"]) == 66

    def test_register_returns_qr_payload(self, client):
        r = client.post("/products", data={
            "name": "A", "brand": "B", "serial": "S",
            "manufacturer_address": MFR_ADDR,
            "manufacturer_key": MFR_KEY,
        })
        body = r.json()
        assert "verify.example.com" in body["qr_payload"]
        assert "sig=" in body["qr_payload"]

    def test_register_returns_nfc_payload(self, client):
        r = client.post("/products", data={
            "name": "A", "brand": "B", "serial": "S2",
            "manufacturer_address": MFR_ADDR,
            "manufacturer_key": MFR_KEY,
        })
        nfc = r.json()["nfc_payload"]
        assert "uid"     in nfc
        assert "counter" in nfc
        assert "cmac"    in nfc
        assert nfc["counter"] == 1

    def test_register_returns_tx_hash(self, client):
        r = client.post("/products", data={
            "name": "A", "brand": "B", "serial": "S3",
            "manufacturer_address": MFR_ADDR,
            "manufacturer_key": MFR_KEY,
        })
        assert r.json()["tx_hash"].startswith("0x")


# ═══════════════════════════════════════════════════════════════════════════════
# 3. POST /products — missing fields
# ═══════════════════════════════════════════════════════════════════════════════

class TestProductRegisterValidation:
    def test_missing_name_returns_422(self, client):
        r = client.post("/products", data={
            "brand": "B", "serial": "S",
            "manufacturer_address": MFR_ADDR,
            "manufacturer_key": MFR_KEY,
        })
        assert r.status_code == 422

    def test_missing_key_returns_422(self, client):
        r = client.post("/products", data={
            "name": "A", "brand": "B", "serial": "S",
            "manufacturer_address": MFR_ADDR,
        })
        assert r.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# 4. GET /products and GET /products/{id}
# ═══════════════════════════════════════════════════════════════════════════════

class TestProductGet:
    def test_list_empty_initially(self, client):
        r = client.get("/products")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_after_register(self, registered_product, client):
        r = client.get("/products")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_get_by_id(self, registered_product, client):
        pid = registered_product["product"]["product_id"]
        r   = client.get(f"/products/{pid}")
        assert r.status_code == 200
        assert r.json()["product_id"] == pid

    def test_get_unknown_returns_404(self, client):
        r = client.get("/products/0x" + "ab" * 32)
        assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# 5. POST /products/{id}/sell
# ═══════════════════════════════════════════════════════════════════════════════

class TestProductSell:
    def test_sell_changes_status(self, registered_product, client):
        pid = registered_product["product"]["product_id"]
        r   = client.post(f"/products/{pid}/sell")
        assert r.status_code == 200
        assert r.json()["status"] == "sold"

    def test_double_sell_returns_400(self, registered_product, client):
        pid = registered_product["product"]["product_id"]
        client.post(f"/products/{pid}/sell")
        r2 = client.post(f"/products/{pid}/sell")
        assert r2.status_code == 400

    def test_sell_unknown_returns_404(self, client):
        r = client.post("/products/0x" + "cd" * 32 + "/sell")
        assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# 6. POST /scan — QR valid
# ═══════════════════════════════════════════════════════════════════════════════

class TestScanQRValid:
    def test_scan_valid_qr_verified(self, registered_product, client):
        pid     = registered_product["product"]["product_id"]
        payload = make_qr_payload(pid, "000001", settings.identity_hmac_secret)
        r = client.post("/scan", json={
            "product_id": pid,
            "channel":    "qr",
            "qr_payload": payload,
            "device_id":  "device-abc",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["verdict"]         == "Verified"
        assert body["on_chain"]        is True
        assert body["identity_result"] == "valid"
        assert body["chain_result"]    == "on_chain"

    def test_scan_stores_in_db(self, registered_product, client):
        pid     = registered_product["product"]["product_id"]
        payload = make_qr_payload(pid, "000002", settings.identity_hmac_secret)
        client.post("/scan", json={
            "product_id": pid, "channel": "qr",
            "qr_payload": payload,
        })
        r = client.get(f"/products/{pid}/scans")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_scan_returns_chain_tx(self, registered_product, client):
        pid     = registered_product["product"]["product_id"]
        payload = make_qr_payload(pid, "000003", settings.identity_hmac_secret)
        r = client.post("/scan", json={
            "product_id": pid, "channel": "qr",
            "qr_payload": payload,
        })
        assert r.json()["chain_tx"] is not None


# ═══════════════════════════════════════════════════════════════════════════════
# 7. POST /scan — QR invalid
# ═══════════════════════════════════════════════════════════════════════════════

class TestScanQRInvalid:
    def test_tampered_qr_suspicious(self, registered_product, client):
        pid = registered_product["product"]["product_id"]
        r   = client.post("/scan", json={
            "product_id": pid, "channel": "qr",
            "qr_payload": "https://verify.example.com/v?pid=bad&ser=x&sig=00000000000000000000000000000000",
        })
        assert r.status_code == 200
        assert r.json()["verdict"] == "Suspicious activity"
        assert r.json()["identity_result"] == "invalid"


# ═══════════════════════════════════════════════════════════════════════════════
# 8. POST /scan — NFC valid
# ═══════════════════════════════════════════════════════════════════════════════

class TestScanNFCValid:
    def test_scan_valid_nfc_verified(self, registered_product, client):
        pid      = registered_product["product"]["product_id"]
        import hashlib
        uid_bytes = hashlib.sha256(pid.encode()).digest()[:7]
        tag       = EmulatedTag(settings.nfc_master_key, uid=uid_bytes)
        uid_h, ctr, cmac = tag.tap()
        r = client.post("/scan", json={
            "product_id": pid, "channel": "nfc",
            "nfc_uid": uid_h, "nfc_counter": ctr, "nfc_cmac": cmac,
        })
        assert r.status_code == 200
        body = r.json()
        assert body["verdict"]         == "Verified"
        assert body["identity_result"] == "valid"

    def test_second_nfc_tap_accepted(self, registered_product, client):
        pid       = registered_product["product"]["product_id"]
        import hashlib
        uid_bytes = hashlib.sha256(pid.encode()).digest()[:7]
        tag       = EmulatedTag(settings.nfc_master_key, uid=uid_bytes)
        # First tap
        uid_h, ctr, cmac = tag.tap()
        client.post("/scan", json={
            "product_id": pid, "channel": "nfc",
            "nfc_uid": uid_h, "nfc_counter": ctr, "nfc_cmac": cmac,
        })
        # Second tap
        uid_h2, ctr2, cmac2 = tag.tap()
        r2 = client.post("/scan", json={
            "product_id": pid, "channel": "nfc",
            "nfc_uid": uid_h2, "nfc_counter": ctr2, "nfc_cmac": cmac2,
        })
        assert r2.json()["identity_result"] == "valid"


# ═══════════════════════════════════════════════════════════════════════════════
# 9. POST /scan — NFC bad MAC
# ═══════════════════════════════════════════════════════════════════════════════

class TestScanNFCBadMAC:
    def test_bad_mac_suspicious(self, registered_product, client):
        pid = registered_product["product"]["product_id"]
        r   = client.post("/scan", json={
            "product_id": pid, "channel": "nfc",
            "nfc_uid":    "aabbccddeeff00",
            "nfc_counter": 1,
            "nfc_cmac":   "deadbeefdeadbeef",
        })
        assert r.status_code == 200
        assert r.json()["verdict"]         == "Suspicious activity"
        assert r.json()["identity_result"] == "bad_mac"


# ═══════════════════════════════════════════════════════════════════════════════
# 10. POST /scan — unregistered product
# ═══════════════════════════════════════════════════════════════════════════════

class TestScanUnregistered:
    def test_unknown_product_id_unregistered(self, client):
        fake_pid = "0x" + "ff" * 32
        r = client.post("/scan", json={
            "product_id": fake_pid, "channel": "qr",
            "qr_payload": make_qr_payload(fake_pid, "001",
                                          settings.identity_hmac_secret),
        })
        assert r.status_code == 200
        assert r.json()["verdict"]      == "Unregistered product"
        assert r.json()["on_chain"]     is False
        assert r.json()["chain_result"] == "not_found"


# ═══════════════════════════════════════════════════════════════════════════════
# 11. GET /products/{id}/scans
# ═══════════════════════════════════════════════════════════════════════════════

class TestScansHistory:
    def test_scans_empty_initially(self, registered_product, client):
        pid = registered_product["product"]["product_id"]
        r   = client.get(f"/products/{pid}/scans")
        assert r.status_code == 200
        assert r.json() == []

    def test_multiple_scans_stored(self, registered_product, client):
        pid     = registered_product["product"]["product_id"]
        payload = make_qr_payload(pid, "000010", settings.identity_hmac_secret)
        for _ in range(3):
            client.post("/scan", json={
                "product_id": pid, "channel": "qr",
                "qr_payload": payload,
            })
        r = client.get(f"/products/{pid}/scans")
        assert len(r.json()) == 3

    def test_scan_fields_present(self, registered_product, client):
        pid     = registered_product["product"]["product_id"]
        payload = make_qr_payload(pid, "000011", settings.identity_hmac_secret)
        client.post("/scan", json={
            "product_id": pid, "channel": "qr", "qr_payload": payload,
        })
        scans = client.get(f"/products/{pid}/scans").json()
        s = scans[0]
        assert "verdict"   in s
        assert "channel"   in s
        assert "ts"        in s
        assert s["channel"] == "qr"
