"""initial_schema

Revision ID: 0001
Revises:
Create Date: 2026-10-18

Creates tables: manufacturers, products, tags, scans.
"""

from alembic import op
import sqlalchemy as sa

revision    = "0001"
down_revision = None
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_table(
        "manufacturers",
        sa.Column("id",         sa.Integer(),     primary_key=True, autoincrement=True),
        sa.Column("address",    sa.String(42),    nullable=False, unique=True),
        sa.Column("name",       sa.String(120),   nullable=False),
        sa.Column("created_at", sa.DateTime(),    nullable=False,
                  server_default=sa.func.now()),
    )

    op.create_table(
        "products",
        sa.Column("id",                   sa.Integer(),   primary_key=True, autoincrement=True),
        sa.Column("product_id",           sa.String(66),  nullable=False, unique=True),
        sa.Column("name",                 sa.String(200), nullable=False),
        sa.Column("brand",                sa.String(120), nullable=False),
        sa.Column("serial",               sa.String(80),  nullable=False),
        sa.Column("image_path",           sa.String(512), nullable=True),
        sa.Column("image_sha256",         sa.String(64),  nullable=True),
        sa.Column("record_hash",          sa.String(66),  nullable=False),
        sa.Column("status",               sa.Enum("registered", "sold",
                                                  name="product_status"),
                  nullable=False, server_default="registered"),
        sa.Column("manufacturer_address", sa.String(42),  nullable=False),
        sa.Column("created_at",           sa.DateTime(),  nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index("ix_products_product_id", "products", ["product_id"])

    op.create_table(
        "tags",
        sa.Column("uid",          sa.String(14),  primary_key=True),
        sa.Column("product_id",   sa.String(66),  nullable=False),
        sa.Column("channel",      sa.Enum("nfc", name="tag_channel"),
                  nullable=False, server_default="nfc"),
        sa.Column("last_counter", sa.Integer(),   nullable=False, server_default="0"),
        sa.Column("state",        sa.Enum("ok", "disputed", name="tag_state"),
                  nullable=False, server_default="ok"),
    )
    op.create_index("ix_tags_product_id", "tags", ["product_id"])

    op.create_table(
        "scans",
        sa.Column("id",              sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("product_id",      sa.String(66),   nullable=False),
        sa.Column("channel",         sa.Enum("qr", "nfc", name="scan_channel"),
                  nullable=False),
        sa.Column("ts",              sa.DateTime(),   nullable=False),
        sa.Column("lat",             sa.Float(),      nullable=True),
        sa.Column("lon",             sa.Float(),      nullable=True),
        sa.Column("device_hash",     sa.String(64),   nullable=True),
        sa.Column("chain_result",    sa.Enum("on_chain", "not_found",
                                             name="chain_result_enum"),
                  nullable=False),
        sa.Column("identity_result", sa.Enum("valid", "invalid",
                                             "disputed", "bad_mac",
                                             name="identity_result_enum"),
                  nullable=False),
        sa.Column("risk_score",      sa.Float(),      nullable=True),
        sa.Column("verdict",         sa.Enum("Verified", "Manual review",
                                             "Suspicious activity",
                                             "Unregistered product",
                                             name="verdict_enum"),
                  nullable=False),
        sa.Column("reason",          sa.Text(),       nullable=False),
    )
    op.create_index("ix_scans_product_id", "scans", ["product_id"])
    op.create_index("ix_scans_ts",         "scans", ["ts"])


def downgrade() -> None:
    op.drop_table("scans")
    op.drop_table("tags")
    op.drop_table("products")
    op.drop_table("manufacturers")
