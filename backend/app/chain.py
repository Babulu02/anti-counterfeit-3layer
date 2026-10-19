"""
backend/app/chain.py
=====================
web3.py v8 client for ProductRegistry.

Provides:
  get_contract()   — cached contract instance
  chain_get_product() — read product from chain
  chain_register_product() — send registerProduct tx (manufacturer key)
  chain_mark_sold()        — send markSold tx (operator key)
  chain_log_scan()         — send logScan tx (operator key)
  build_scan_hash()        — privacy-preserving hash logged on-chain

All state-changing calls use EIP-1559 if available, falling back to legacy.
Private keys are read once from Settings; never logged.
"""

import json
import hashlib
from functools import lru_cache
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.contract import Contract

from .config import get_settings


# ── Initialise web3 ───────────────────────────────────────────────────────────

def _make_w3(rpc_url: str) -> Web3:
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        raise RuntimeError(f"Cannot connect to Ethereum node at {rpc_url}")
    return w3


@lru_cache(maxsize=1)
def get_w3() -> Web3:
    return _make_w3(get_settings().rpc_url)


@lru_cache(maxsize=1)
def get_contract() -> Contract:
    """Return a cached ProductRegistry contract instance."""
    s = get_settings()
    w3 = get_w3()
    with open(s.abi_path) as f:
        artifact = json.load(f)
    abi = artifact["abi"]
    addr = Web3.to_checksum_address(s.contract_address)
    return w3.eth.contract(address=addr, abi=abi)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _send_tx(w3: Web3, account: Any, fn_call) -> dict:
    """
    Build, sign and send a transaction.  Returns the receipt as a dict.
    Uses gas estimation + 20% buffer.
    """
    nonce = w3.eth.get_transaction_count(account.address, "pending")
    gas_est = fn_call.estimate_gas({"from": account.address})
    tx = fn_call.build_transaction({
        "from":  account.address,
        "nonce": nonce,
        "gas":   int(gas_est * 1.2),
    })
    signed  = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    return {
        "tx_hash": "0x" + receipt.transactionHash.hex(),
        "status":  receipt.status,           # 1 = success, 0 = reverted
        "gas_used": receipt.gasUsed,
        "block":   receipt.blockNumber,
    }


def build_scan_hash(product_id: str, channel: str, device_hash: str,
                    lat: float | None, lon: float | None, ts: str,
                    salt: bytes | str | None = None) -> bytes:
    """
    Compute a privacy-preserving 32-byte salted hash to log on-chain.
    Raw coordinates and device IDs never touch the blockchain in plaintext.
    A server-side secret salt prevents dictionary and rainbow-table attacks
    against coarse geographic coordinates and timestamps.
    """
    if salt is None:
        try:
            salt = get_settings().identity_hmac_secret
        except Exception:
            salt = b"anti-counterfeit-salt-fallback"
    salt_str = salt.hex() if isinstance(salt, bytes) else str(salt)
    raw = f"{salt_str}|{product_id}|{channel}|{device_hash or ''}|{lat or ''}|{lon or ''}|{ts}"
    return hashlib.sha256(raw.encode()).digest()



# ── Read functions ─────────────────────────────────────────────────────────────

def chain_get_product(product_id_hex: str) -> dict:
    """
    Call getProduct() on-chain.
    Returns a dict with record_hash, manufacturer, registered_at, sold, exists.
    product_id_hex must be a 0x-prefixed 32-byte hex string.
    """
    contract = get_contract()
    pid = bytes.fromhex(product_id_hex.removeprefix("0x"))
    result = contract.functions.getProduct(pid).call()
    return {
        "record_hash":   "0x" + result[0].hex(),
        "manufacturer":  result[1],
        "registered_at": result[2],
        "sold":          result[3],
        "exists":        result[4],
    }


# ── Write functions ────────────────────────────────────────────────────────────

def chain_register_product(product_id_hex: str, record_hash_hex: str,
                            manufacturer_key: str) -> dict:
    """
    Call registerProduct() signed by the manufacturer's private key.
    Both args are 0x-prefixed 32-byte hex strings.
    """
    w3       = get_w3()
    contract = get_contract()
    account  = Account.from_key(manufacturer_key)
    pid      = bytes.fromhex(product_id_hex.removeprefix("0x"))
    rhash    = bytes.fromhex(record_hash_hex.removeprefix("0x"))
    return _send_tx(w3, account, contract.functions.registerProduct(pid, rhash))


def chain_mark_sold(product_id_hex: str) -> dict:
    """Call markSold() signed by the operator account."""
    s        = get_settings()
    w3       = get_w3()
    contract = get_contract()
    account  = Account.from_key(s.operator_private_key)
    pid      = bytes.fromhex(product_id_hex.removeprefix("0x"))
    return _send_tx(w3, account, contract.functions.markSold(pid))


def chain_log_scan(product_id_hex: str, scan_hash: bytes, verdict_code: int) -> dict:
    """
    Call logScan() signed by the operator account.
    verdict_code: 0=Verified 1=ManualReview 2=Suspicious 3=Unregistered
    """
    s        = get_settings()
    w3       = get_w3()
    contract = get_contract()
    account  = Account.from_key(s.operator_private_key)
    pid      = bytes.fromhex(product_id_hex.removeprefix("0x"))
    shash    = scan_hash if isinstance(scan_hash, bytes) else bytes.fromhex(scan_hash)
    return _send_tx(w3, account, contract.functions.logScan(pid, shash, verdict_code))
