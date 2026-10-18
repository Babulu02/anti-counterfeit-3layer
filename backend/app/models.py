"""
backend/app/models.py
======================
SQLAlchemy 2.x ORM models.

Tables
------
manufacturers  Ethereum addresses allowed to register products.
products       Off-chain product details (hashes go on-chain).
tags           NFC tag state (last counter, disputed flag).
scans          Every scan event with all signals and the final verdict.

Images and personal data stay off-chain; only SHA-256 hashes go on-chain.
Device IDs are SHA-256 hashed before storage (see store_scan in crud.py).
"""

from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, DateTime, Enum, Float, Index,
    Integer, String, Text, func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Manufacturer(Base):
    """Whitelisted manufacturer Ethereum addresses."""
    __tablename__ = "manufacturers"

    id:      Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    address: Mapped[str] = mapped_column(String(42), unique=True, nullable=False,
                                         comment="Ethereum address (checksummed)")
    name:    Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )


class Product(Base):
    """Off-chain product details. record_hash links to the on-chain entry."""
    __tablename__ = "products"

    id:          Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id:  Mapped[str] = mapped_column(String(66), unique=True, nullable=False,
                                              comment="bytes32 hex, 0x-prefixed")
    name:        Mapped[str] = mapped_column(String(200), nullable=False)
    brand:       Mapped[str] = mapped_column(String(120), nullable=False)
    serial:      Mapped[str] = mapped_column(String(80),  nullable=False)
    image_path:  Mapped[str | None] = mapped_column(String(512), nullable=True,
                                                    comment="path under /data/product-images")
    image_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True,
                                                     comment="hex SHA-256 of the image file")
    record_hash: Mapped[str] = mapped_column(String(66), nullable=False,
                                              comment="bytes32 hex sent to registerProduct()")
    status:      Mapped[str] = mapped_column(
        Enum("registered", "sold", name="product_status"),
        nullable=False, default="registered"
    )
    manufacturer_address: Mapped[str] = mapped_column(String(42), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_products_product_id", "product_id"),
    )


class Tag(Base):
    """
    NFC tag state — one row per physical tag.
    uid is the 7-byte UID as a 14-char hex string.
    """
    __tablename__ = "tags"

    uid:          Mapped[str] = mapped_column(String(14), primary_key=True,
                                              comment="7-byte UID, 14 hex chars")
    product_id:   Mapped[str] = mapped_column(String(66), nullable=False)
    channel:      Mapped[str] = mapped_column(
        Enum("nfc", name="tag_channel"), nullable=False, default="nfc"
    )
    last_counter: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    state:        Mapped[str] = mapped_column(
        Enum("ok", "disputed", name="tag_state"), nullable=False, default="ok"
    )

    __table_args__ = (
        Index("ix_tags_product_id", "product_id"),
    )


class Scan(Base):
    """Every scan event — one row per POST /scan call."""
    __tablename__ = "scans"

    id:              Mapped[int]   = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id:      Mapped[str]   = mapped_column(String(66), nullable=False)
    channel:         Mapped[str]   = mapped_column(
        Enum("qr", "nfc", name="scan_channel"), nullable=False
    )
    ts:              Mapped[datetime] = mapped_column(DateTime, nullable=False)
    lat:             Mapped[float | None] = mapped_column(Float, nullable=True)
    lon:             Mapped[float | None] = mapped_column(Float, nullable=True)
    device_hash:     Mapped[str | None] = mapped_column(String(64), nullable=True,
                                                        comment="SHA-256 of raw device_id")
    # Signals
    chain_result:    Mapped[str]   = mapped_column(
        Enum("on_chain", "not_found", name="chain_result_enum"), nullable=False
    )
    identity_result: Mapped[str]   = mapped_column(
        Enum("valid", "invalid", "disputed", "bad_mac", name="identity_result_enum"),
        nullable=False
    )
    risk_score:      Mapped[float | None] = mapped_column(Float, nullable=True)
    verdict:         Mapped[str]   = mapped_column(
        Enum("Verified", "Manual review", "Suspicious activity", "Unregistered product",
             name="verdict_enum"),
        nullable=False
    )
    reason:          Mapped[str]   = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index("ix_scans_product_id", "product_id"),
        Index("ix_scans_ts",         "ts"),
    )
