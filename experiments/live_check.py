"""
experiments/live_check.py
==========================
End-to-end verification script testing the live FastAPI API against Ganache and MySQL.

Actions tested:
  1. GET  /health
  2. POST /products          (register on-chain & in DB, receive QR/NFC keys)
  3. POST /scan              (verify legitimate QR)
  4. POST /scan              (verify legitimate NFC tap)
  5. POST /scan              (NFC replay attack -> soft dispute / manual review)
  6. POST /products/{id}/sell (mark product sold on-chain)
  7. POST /scan              (scan after sale in new distant city -> suspicious)
  8. POST /scan              (scan unregistered product -> unregistered)
"""

import sys
from pathlib import Path
import httpx

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

BASE_URL = "http://127.0.0.1:8000"

def run_live_check():
    print("=" * 70)
    print("LIVE END-TO-END SYSTEM CHECK (FastAPI + Ganache + MySQL)")
    print("=" * 70)

    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Health check
    print("\n[1/8] Checking API Health (GET /health)...")
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"  OK: {res.json()}")

    # 2. Register product
    print("\n[2/8] Registering Product (POST /products)...")
    reg_data = {
        "name": "Live Check Diamond Watch",
        "brand": "ChronoLux",
        "serial": "CH-LIVE-999",
        "manufacturer_address": "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b",
        "manufacturer_key": "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c",
    }
    res = client.post("/products", data=reg_data)
    assert res.status_code == 201, f"Product registration failed: {res.text}"
    prod_resp = res.json()
    product_id = prod_resp["product"]["product_id"]
    qr_payload = prod_resp["qr_payload"]
    nfc_payload = prod_resp["nfc_payload"]
    tx_hash = prod_resp["tx_hash"]
    print(f"  Registered: id={product_id[:16]}... on-chain tx={tx_hash[:16]}...")
    print(f"  QR payload: {qr_payload[:32]}...")
    print(f"  NFC payload: uid={nfc_payload['uid']}, ctr={nfc_payload['counter']}, cmac={nfc_payload['cmac'][:8]}...")

    # 3. Verify QR
    print("\n[3/8] Verifying Genuine QR (POST /scan)...")
    qr_scan = {
        "channel": "qr",
        "product_id": product_id,
        "qr_payload": qr_payload,
        "lat": 19.0760,
        "lon": 72.8777,
        "device_id": "live-dev-01",
    }
    res = client.post("/scan", json=qr_scan)
    assert res.status_code == 200, f"QR scan failed: {res.text}"
    qr_res = res.json()
    print(f"  Verdict: {qr_res['verdict']}")
    print(f"  Reason: {qr_res['reason']}")
    assert qr_res["verdict"] == "Verified", f"Expected Verified, got: {qr_res['verdict']}"

    # 4. Verify NFC First Tap
    print("\n[4/8] Verifying Genuine NFC Tap (POST /scan)...")
    nfc_scan = {
        "channel": "nfc",
        "product_id": product_id,
        "nfc_uid": nfc_payload["uid"],
        "nfc_counter": nfc_payload["counter"],
        "nfc_cmac": nfc_payload["cmac"],
        "lat": 19.0760,
        "lon": 72.8777,
        "device_id": "live-dev-01",
    }
    res = client.post("/scan", json=nfc_scan)
    assert res.status_code == 200, f"NFC scan failed: {res.text}"
    nfc_res = res.json()
    print(f"  Verdict: {nfc_res['verdict']}")
    print(f"  Reason: {nfc_res['reason']}")
    assert nfc_res["verdict"] == "Verified", f"Expected Verified, got: {nfc_res['verdict']}"

    # 5. NFC Replay Attack
    print("\n[5/8] Testing NFC Replay Attack (POST /scan with stale counter)...")
    res = client.post("/scan", json=nfc_scan)
    assert res.status_code == 200, f"Replay request failed: {res.text}"
    replay_res = res.json()
    print(f"  Verdict: {replay_res['verdict']}")
    print(f"  Reason: {replay_res['reason']}")
    assert replay_res["verdict"] in ("Manual review", "Suspicious"), f"Expected Manual review/Suspicious, got: {replay_res['verdict']}"

    # 6. Mark product sold
    print(f"\n[6/8] Marking Product as Sold (POST /products/{product_id[:16]}.../sell)...")
    res = client.post(f"/products/{product_id}/sell")
    assert res.status_code == 200, f"Mark sold failed: {res.text}"
    sell_res = res.json()
    print(f"  Sold status: {sell_res['status']} tx={sell_res['tx_hash'][:16]}...")

    # 7. Scan after sale in distant location (impossible relocation)
    print("\n[7/8] Scanning Sold Product in Distant Location (London vs Mumbai)...")
    post_sale_scan = {
        "channel": "qr",
        "product_id": product_id,
        "qr_payload": qr_payload,
        "lat": 51.5074,
        "lon": -0.1278,
        "device_id": "live-dev-attacker",
    }
    res = client.post("/scan", json=post_sale_scan)
    assert res.status_code == 200, f"Post-sale scan failed: {res.text}"
    post_sale_res = res.json()
    print(f"  Verdict: {post_sale_res['verdict']}")
    print(f"  Reason: {post_sale_res['reason']}")
    assert post_sale_res["verdict"] in ("Manual review", "Suspicious activity"), f"Expected Suspicious/Review, got: {post_sale_res['verdict']}"

    # 8. Unregistered product scan
    print("\n[8/8] Scanning Completely Unregistered Product ID...")
    fake_id = "0x" + "ff" * 32
    from identity.qr_identity import make_qr_payload
    from app.config import get_settings
    fake_qr = make_qr_payload(fake_id, "999999", get_settings().identity_hmac_secret)
    unreg_scan = {
        "channel": "qr",
        "product_id": fake_id,
        "qr_payload": fake_qr,
        "lat": 19.0760,
        "lon": 72.8777,
        "device_id": "live-dev-unreg",
    }
    res = client.post("/scan", json=unreg_scan)
    assert res.status_code == 200, f"Unregistered scan failed: {res.text}"
    unreg_res = res.json()
    print(f"  Verdict: {unreg_res['verdict']}")
    print(f"  Reason: {unreg_res['reason']}")
    assert unreg_res["verdict"] == "Unregistered product", f"Expected Unregistered product, got: {unreg_res['verdict']}"

    print("\n" + "=" * 70)
    print("ALL 8 LIVE END-TO-END VERIFICATION CHECKS PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    run_live_check()
