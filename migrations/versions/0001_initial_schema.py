"""Initial schema — baseline for all existing tables.

Revision ID: 0001
Revises:
Create Date: 2026-09-10

This migration represents the full schema as it existed before Alembic was
wired up.  For databases that were already created by create_all(), this
migration is a no-op (tables exist, Alembic stamps the revision).  For a
brand-new empty database it creates all tables from scratch so that
subsequent incremental migrations have a clean base to build on.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def _table_exists(conn, name: str) -> bool:
    return conn.dialect.has_table(conn, name)


def upgrade() -> None:
    bind = op.get_bind()

    # users
    if not _table_exists(bind, "users"):
        op.create_table(
            "users",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("username", sa.String(100), nullable=False),
            sa.Column("email", sa.String(255), nullable=False),
            sa.Column("hashed_password", sa.String(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("username"),
            sa.UniqueConstraint("email"),
        )

    # categories
    if not _table_exists(bind, "categories"):
        op.create_table(
            "categories",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("parent_id", sa.String(), nullable=True),
            sa.Column("image_path", sa.Text(), nullable=True),
            sa.Column("created_by", sa.String(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["parent_id"], ["categories.id"]),
        )

    # tags
    if not _table_exists(bind, "tags"):
        op.create_table(
            "tags",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("tag_type", sa.String(50), nullable=True),
            sa.Column("created_by", sa.String(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )

    # storage_locations
    if not _table_exists(bind, "storage_locations"):
        op.create_table(
            "storage_locations",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("created_by", sa.String(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        )

    # inventory_items
    if not _table_exists(bind, "inventory_items"):
        op.create_table(
            "inventory_items",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("category_id", sa.String(), nullable=False),
            sa.Column("item_name", sa.String(200), nullable=False),
            sa.Column("item_image_path", sa.Text(), nullable=True),
            sa.Column("bought_date", sa.Date(), nullable=True),
            sa.Column("expiration_date", sa.Date(), nullable=True),
            sa.Column("net_weight", sa.Numeric(10, 2), nullable=True),
            sa.Column("quantity", sa.Integer(), nullable=True),
            sa.Column(
                "status",
                sa.Enum("InUse", "Stocked", "Finished", "NotInStock", name="item_status"),
                nullable=True,
            ),
            sa.Column("usage_percentage", sa.Integer(), nullable=True),
            sa.Column("amount", sa.Numeric(10, 2), nullable=True),
            sa.Column("carbohydrate", sa.Numeric(10, 2), nullable=True),
            sa.Column("fiber", sa.Numeric(10, 2), nullable=True),
            sa.Column("sugar", sa.Numeric(10, 2), nullable=True),
            sa.Column("fat", sa.Numeric(10, 2), nullable=True),
            sa.Column("protein", sa.Numeric(10, 2), nullable=True),
            sa.Column("stored_location_id", sa.String(), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by", sa.String(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
            sa.ForeignKeyConstraint(["stored_location_id"], ["storage_locations.id"]),
        )

    # inventory_item_tags  (join table)
    if not _table_exists(bind, "inventory_item_tags"):
        op.create_table(
            "inventory_item_tags",
            sa.Column("item_id", sa.String(), nullable=False),
            sa.Column("tag_id", sa.String(), nullable=False),
            sa.PrimaryKeyConstraint("item_id", "tag_id"),
            sa.ForeignKeyConstraint(["item_id"], ["inventory_items.id"]),
            sa.ForeignKeyConstraint(["tag_id"], ["tags.id"]),
        )

    # meal_preps
    if not _table_exists(bind, "meal_preps"):
        op.create_table(
            "meal_preps",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("year", sa.Integer(), nullable=False),
            sa.Column("month", sa.Integer(), nullable=False),
            sa.Column("day", sa.Integer(), nullable=False),
            sa.Column("created_by", sa.String(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("year", "month", "day", "created_by"),
        )

    # meal_prep_entries
    if not _table_exists(bind, "meal_prep_entries"):
        op.create_table(
            "meal_prep_entries",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("meal_prep_id", sa.String(), nullable=False),
            sa.Column(
                "meal_time",
                sa.Enum("Breakfast", "Lunch", "Dinner", name="meal_time_enum"),
                nullable=True,
            ),
            sa.Column("video_url", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "status",
                sa.Enum("Planned", "Done", "Skipped", name="meal_status_enum"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["meal_prep_id"], ["meal_preps.id"]),
        )

    # meal_prep_items
    if not _table_exists(bind, "meal_prep_items"):
        op.create_table(
            "meal_prep_items",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("meal_prep_entry_id", sa.String(), nullable=False),
            sa.Column("inventory_item_id", sa.String(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["meal_prep_entry_id"], ["meal_prep_entries.id"]),
            sa.ForeignKeyConstraint(["inventory_item_id"], ["inventory_items.id"]),
        )

    # theme_settings
    if not _table_exists(bind, "theme_settings"):
        op.create_table(
            "theme_settings",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("wallpaper_path", sa.Text(), nullable=True),
            sa.Column("extracted_palette", sa.JSON(), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )


def downgrade() -> None:
    # Downgrade drops all tables in reverse dependency order.
    # WARNING: this destroys all data — only for dev/test use.
    op.drop_table("theme_settings")
    op.drop_table("meal_prep_items")
    op.drop_table("meal_prep_entries")
    op.drop_table("meal_preps")
    op.drop_table("inventory_item_tags")
    op.drop_table("inventory_items")
    op.drop_table("storage_locations")
    op.drop_table("tags")
    op.drop_table("categories")
    op.drop_table("users")
