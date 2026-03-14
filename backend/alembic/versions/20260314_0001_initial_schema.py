"""initial schema

Revision ID: 20260314_0001
Revises:
Create Date: 2026-03-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260314_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("auth_provider", sa.String(length=50), nullable=False),
        sa.Column("auth_provider_id", sa.String(length=255), nullable=True),
        sa.Column("profile_picture_url", sa.Text(), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("api_key_hash", sa.String(length=255), nullable=True),
        sa.Column("credits_balance", sa.Integer(), nullable=False),
        sa.Column("total_credits_purchased", sa.Integer(), nullable=False),
        sa.Column("total_videos_generated", sa.Integer(), nullable=False),
        sa.Column("email_verified", sa.Boolean(), nullable=False),
        sa.Column("email_verification_token", sa.String(length=255), nullable=True),
        sa.Column("email_verification_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )
    op.create_index(op.f("ix_users_api_key_hash"), "users", ["api_key_hash"], unique=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "style_presets",
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("prompt_modifier", sa.Text(), nullable=False),
        sa.Column("color_palette", sa.JSON(), nullable=False),
        sa.Column("motion_bias", sa.String(length=50), nullable=True),
        sa.Column("lighting_bias", sa.String(length=50), nullable=True),
        sa.Column("sample_video_url", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "jobs",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("audio_file_name", sa.String(length=255), nullable=False),
        sa.Column("audio_url", sa.Text(), nullable=False),
        sa.Column("audio_duration_seconds", sa.Float(), nullable=False),
        sa.Column("audio_hash", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("current_stage", sa.String(length=50), nullable=True),
        sa.Column("style_preset_id", sa.String(length=36), nullable=True),
        sa.Column("prompt_template_version", sa.String(length=50), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("estimated_cost_usd", sa.Numeric(10, 4), nullable=True),
        sa.Column("actual_cost_usd", sa.Numeric(10, 4), nullable=True),
        sa.Column("cost_cap_usd", sa.Numeric(10, 4), nullable=False),
        sa.Column("audio_analysis", sa.JSON(), nullable=False),
        sa.Column("storyboard", sa.JSON(), nullable=False),
        sa.Column("storyboard_approved", sa.Boolean(), nullable=False),
        sa.Column("storyboard_approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("storyboard_rejection_reason", sa.Text(), nullable=True),
        sa.Column("storyboard_regeneration_count", sa.Integer(), nullable=False),
        sa.Column("scenes_total", sa.Integer(), nullable=False),
        sa.Column("scenes_completed", sa.Integer(), nullable=False),
        sa.Column("scenes_failed", sa.Integer(), nullable=False),
        sa.Column("final_video_url", sa.Text(), nullable=True),
        sa.Column("final_video_duration_seconds", sa.Float(), nullable=True),
        sa.Column("final_video_size_bytes", sa.Integer(), nullable=True),
        sa.Column("preview_video_url", sa.Text(), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("user_notes", sa.Text(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["style_preset_id"], ["style_presets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_jobs_status"), "jobs", ["status"], unique=False)
    op.create_index(op.f("ix_jobs_user_id"), "jobs", ["user_id"], unique=False)

    op.create_table(
        "audio_beat_maps",
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("bpm", sa.Float(), nullable=False),
        sa.Column("beat_times", sa.JSON(), nullable=False),
        sa.Column("bar_times", sa.JSON(), nullable=False),
        sa.Column("downbeat_times", sa.JSON(), nullable=False),
        sa.Column("onset_times", sa.JSON(), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id"),
    )

    op.create_table(
        "scenes",
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("scene_index", sa.Integer(), nullable=False),
        sa.Column("start_time_seconds", sa.Float(), nullable=False),
        sa.Column("end_time_seconds", sa.Float(), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=False),
        sa.Column("visual_prompt", sa.Text(), nullable=False),
        sa.Column("motion_type", sa.String(length=50), nullable=True),
        sa.Column("lighting_style", sa.String(length=100), nullable=True),
        sa.Column("color_palette", sa.JSON(), nullable=False),
        sa.Column("mood", sa.String(length=50), nullable=True),
        sa.Column("camera_angle", sa.String(length=50), nullable=True),
        sa.Column("beat_importance_score", sa.Float(), nullable=True),
        sa.Column("bar_start_beat_index", sa.Integer(), nullable=True),
        sa.Column("bar_end_beat_index", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("video_model_used", sa.String(length=50), nullable=True),
        sa.Column("video_url", sa.Text(), nullable=True),
        sa.Column("video_size_bytes", sa.Integer(), nullable=True),
        sa.Column("cost_usd", sa.Numeric(10, 4), nullable=True),
        sa.Column("render_time_seconds", sa.Float(), nullable=True),
        sa.Column("regeneration_count", sa.Integer(), nullable=False),
        sa.Column("regeneration_reason", sa.Text(), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_scenes_job_id"), "scenes", ["job_id"], unique=False)
    op.create_index(op.f("ix_scenes_status"), "scenes", ["status"], unique=False)

    op.create_table(
        "credit_transactions",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=True),
        sa.Column("transaction_type", sa.String(length=50), nullable=False),
        sa.Column("amount_credits", sa.Integer(), nullable=False),
        sa.Column("amount_usd", sa.Numeric(10, 4), nullable=True),
        sa.Column("balance_before", sa.Integer(), nullable=False),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_credit_transactions_user_id"), "credit_transactions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_credit_transactions_user_id"), table_name="credit_transactions")
    op.drop_table("credit_transactions")
    op.drop_index(op.f("ix_scenes_status"), table_name="scenes")
    op.drop_index(op.f("ix_scenes_job_id"), table_name="scenes")
    op.drop_table("scenes")
    op.drop_table("audio_beat_maps")
    op.drop_index(op.f("ix_jobs_user_id"), table_name="jobs")
    op.drop_index(op.f("ix_jobs_status"), table_name="jobs")
    op.drop_table("jobs")
    op.drop_table("style_presets")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_api_key_hash"), table_name="users")
    op.drop_table("users")
