VIGEN — Technical Specification (Phase 1)
Version: 1.0 | Status: Developer-Ready | Date: March 2026

1. Database Schema (PostgreSQL + SQLAlchemy)
1.1 Core Tables

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    auth_provider VARCHAR(50) DEFAULT 'local', -- 'local', 'google', 'github'
    auth_provider_id VARCHAR(255), -- OAuth provider's user ID
    profile_picture_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'admin', 'api_partner'
    api_key_hash VARCHAR(255), -- For API access (Phase 2)
    credits_balance INTEGER DEFAULT 0, -- Current credit balance
    total_credits_purchased INTEGER DEFAULT 0, -- Lifetime credits bought
    total_videos_generated INTEGER DEFAULT 0, -- Metric tracking
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_api_key_hash ON users(api_key_hash);

-- Jobs table (core pipeline state machine)
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    audio_file_name VARCHAR(255) NOT NULL,
    audio_url TEXT NOT NULL, -- S3/R2 URL
    audio_duration_seconds FLOAT NOT NULL,
    audio_hash VARCHAR(64), -- SHA256 for deduplication
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- See state machine below
    current_stage VARCHAR(50), -- 'analysis', 'planning', 'rendering', 'assembly'
    style_preset_id UUID REFERENCES style_presets(id),
    prompt_template_version VARCHAR(50) DEFAULT '1.0', -- For quality tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    estimated_cost_usd DECIMAL(10, 4),
    actual_cost_usd DECIMAL(10, 4),
    cost_cap_usd DECIMAL(10, 4) DEFAULT 20.00, -- Hard limit per job
    
    -- Audio analysis results (stored as JSONB)
    audio_analysis JSONB, -- { bpm, beats, mood, energy_arc, key, genre }
    
    -- Storyboard (stored as JSONB)
    storyboard JSONB, -- Array of scene objects
    storyboard_approved BOOLEAN DEFAULT FALSE,
    storyboard_approved_at TIMESTAMP,
    storyboard_rejection_reason TEXT,
    storyboard_regeneration_count INTEGER DEFAULT 0,
    
    -- Rendering progress
    scenes_total INTEGER DEFAULT 0,
    scenes_completed INTEGER DEFAULT 0,
    scenes_failed INTEGER DEFAULT 0,
    
    -- Final output
    final_video_url TEXT, -- S3/R2 URL
    final_video_duration_seconds FLOAT,
    final_video_size_bytes BIGINT,
    thumbnail_url TEXT,
    
    -- Metadata
    user_notes TEXT,
    tags TEXT[], -- For filtering/search
    is_public BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'queued', 'analysing', 'planning', 
        'awaiting_approval', 'rendering', 'assembling', 
        'complete', 'failed', 'cancelled'
    ))
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_user_status ON jobs(user_id, status);

-- Scenes table (individual video clips)
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    scene_index INTEGER NOT NULL,
    start_time_seconds FLOAT NOT NULL,
    end_time_seconds FLOAT NOT NULL,
    duration_seconds FLOAT NOT NULL,
    
    -- Scene metadata (from storyboard)
    visual_prompt TEXT NOT NULL,
    motion_type VARCHAR(50), -- 'zoom', 'pan', 'static', 'dolly', 'rotate'
    lighting_style VARCHAR(100), -- 'cinematic', 'neon', 'natural', etc.
    color_palette TEXT[], -- Array of hex colors
    mood VARCHAR(50), -- 'energetic', 'calm', 'dramatic', etc.
    camera_angle VARCHAR(50), -- 'wide', 'medium', 'close-up'
    
    -- Beat synchronization
    beat_importance_score FLOAT, -- 0.0-1.0, used for cut timing
    bar_start_beat_index INTEGER, -- Which beat this scene starts on
    bar_end_beat_index INTEGER, -- Which beat this scene ends on
    
    -- Rendering
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'rendering', 'complete', 'failed'
    video_model_used VARCHAR(50), -- 'kling', 'wan'
    video_url TEXT, -- S3/R2 URL to rendered clip
    video_size_bytes BIGINT,
    
    -- Cost tracking
    cost_usd DECIMAL(10, 4),
    render_time_seconds FLOAT,
    
    -- Regeneration tracking
    regeneration_count INTEGER DEFAULT 0,
    regeneration_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_scene_status CHECK (status IN (
        'pending', 'rendering', 'complete', 'failed'
    ))
);

CREATE INDEX idx_scenes_job_id ON scenes(job_id);
CREATE INDEX idx_scenes_status ON scenes(status);
CREATE INDEX idx_scenes_job_index ON scenes(job_id, scene_index);

-- Credits table (atomic transaction ledger)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'render', 'refund', 'admin_adjustment'
    amount_credits INTEGER NOT NULL, -- Positive for credit, negative for debit
    amount_usd DECIMAL(10, 4),
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
        'purchase', 'render', 'refund', 'admin_adjustment'
    ))
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_job_id ON credit_transactions(job_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Style presets table
CREATE TABLE style_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    prompt_modifier TEXT NOT NULL, -- Injected into visual prompts
    color_palette TEXT[], -- Default colors for this style
    motion_bias VARCHAR(50), -- Preferred motion type
    lighting_bias VARCHAR(50), -- Preferred lighting
    sample_video_url TEXT, -- 10-second demo clip
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audio beat map table (for efficient querying)
CREATE TABLE audio_beat_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    bpm FLOAT NOT NULL,
    beat_times FLOAT[] NOT NULL, -- Array of beat timestamps in seconds
    bar_times FLOAT[] NOT NULL, -- Array of bar (4-beat) timestamps
    downbeat_times FLOAT[] NOT NULL, -- Array of downbeat timestamps
    onset_times FLOAT[] NOT NULL, -- Onset detection for energy peaks
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audio_beat_maps_job_id ON audio_beat_maps(job_id);

1.2 SQLAlchemy ORM Models

# backend/app/models/user.py
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    auth_provider = Column(String(50), default="local")
    auth_provider_id = Column(String(255))
    profile_picture_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    role = Column(String(50), default="user")  # 'user', 'admin', 'api_partner'
    api_key_hash = Column(String(255), index=True)
    credits_balance = Column(Integer, default=0)
    total_credits_purchased = Column(Integer, default=0)
    total_videos_generated = Column(Integer, default=0)
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255))
    email_verification_expires_at = Column(DateTime)
    
    # Relationships
    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    credit_transactions = relationship("CreditTransaction", back_populates="user", cascade="all, delete-orphan")

# backend/app/models/job.py
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, Boolean, ForeignKey, JSON, ARRAY, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from enum import Enum

class JobStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    ANALYSING = "analysing"
    PLANNING = "planning"
    AWAITING_APPROVAL = "awaiting_approval"
    RENDERING = "rendering"
    ASSEMBLING = "assembling"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    audio_file_name = Column(String(255), nullable=False)
    audio_url = Column(Text, nullable=False)
    audio_duration_seconds = Column(Float, nullable=False)
    audio_hash = Column(String(64))
    status = Column(String(50), default=JobStatus.PENDING, nullable=False, index=True)
    current_stage = Column(String(50))
    style_preset_id = Column(UUID(as_uuid=True), ForeignKey("style_presets.id"))
    prompt_template_version = Column(String(50), default="1.0")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    failed_at = Column(DateTime)
    failure_reason = Column(Text)
    estimated_cost_usd = Column(Numeric(10, 4))
    actual_cost_usd = Column(Numeric(10, 4))
    cost_cap_usd = Column(Numeric(10, 4), default=20.00)
    
    audio_analysis = Column(JSONB)  # { bpm, beats, mood, energy_arc, key, genre }
    storyboard = Column(JSONB)  # Array of scene objects
    storyboard_approved = Column(Boolean, default=False)
    storyboard_approved_at = Column(DateTime)
    storyboard_rejection_reason = Column(Text)
    storyboard_regeneration_count = Column(Integer, default=0)
    
    scenes_total = Column(Integer, default=0)
    scenes_completed = Column(Integer, default=0)
    scenes_failed = Column(Integer, default=0)
    
    final_video_url = Column(Text)
    final_video_duration_seconds = Column(Float)
    final_video_size_bytes = Column(Integer)
    thumbnail_url = Column(Text)
    
    user_notes = Column(Text)
    tags = Column(ARRAY(String))
    is_public = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="jobs")
    scenes = relationship("Scene", back_populates="job", cascade="all, delete-orphan")
    beat_map = relationship("AudioBeatMap", back_populates="job", uselist=False, cascade="all, delete-orphan")

# backend/app/models/scene.py
class SceneStatus(str, Enum):
    PENDING = "pending"
    RENDERING = "rendering"
    COMPLETE = "complete"
    FAILED = "failed"

class Scene(Base):
    __tablename__ = "scenes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_index = Column(Integer, nullable=False)
    start_time_seconds = Column(Float, nullable=False)
    end_time_seconds = Column(Float, nullable=False)
    duration_seconds = Column(Float, nullable=False)
    
    visual_prompt = Column(Text, nullable=False)
    motion_type = Column(String(50))  # 'zoom', 'pan', 'static', 'dolly', 'rotate'
    lighting_style = Column(String(100))
    color_palette = Column(ARRAY(String))
    mood = Column(String(50))
    camera_angle = Column(String(50))
    
    beat_importance_score = Column(Float)  # 0.0-1.0
    bar_start_beat_index = Column(Integer)
    bar_end_beat_index = Column(Integer)
    
    status = Column(String(50), default=SceneStatus.PENDING, index=True)
    video_model_used = Column(String(50))
    video_url = Column(Text)
    video_size_bytes = Column(Integer)
    
    cost_usd = Column(Numeric(10, 4))
    render_time_seconds = Column(Float)
    
    regeneration_count = Column(Integer, default=0)
    regeneration_reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    job = relationship("Job", back_populates="scenes")

# backend/app/models/credit.py
class CreditTransactionType(str, Enum):
    PURCHASE = "purchase"
    RENDER = "render"
    REFUND = "refund"
    ADMIN_ADJUSTMENT = "admin_adjustment"

class CreditTransaction(Base):
    __tablename__ = "credit_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="SET NULL"))
    transaction_type = Column(String(50), nullable=False)
    amount_credits = Column(Integer, nullable=False)
    amount_usd = Column(Numeric(10, 4))
    balance_before = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User", back_populates="credit_transactions")


1.3 Job State Machine

stateDiagram-v2
    [*] --> PENDING: Job created
    
    PENDING --> QUEUED: Queued for analysis
    QUEUED --> ANALYSING: Analysis worker picks up
    
    ANALYSING --> PLANNING: Audio analysis complete
    ANALYSING --> FAILED: Analysis error
    
    PLANNING --> AWAITING_APPROVAL: Storyboard generated
    PLANNING --> FAILED: Planning error
    
    AWAITING_APPROVAL --> RENDERING: User approves storyboard
    AWAITING_APPROVAL --> PLANNING: User rejects, regenerate
    AWAITING_APPROVAL --> CANCELLED: User cancels
    
    RENDERING --> ASSEMBLING: All scenes rendered
    RENDERING --> FAILED: Render error (scene failure)
    
    ASSEMBLING --> COMPLETE: Video assembled & uploaded
    ASSEMBLING --> FAILED: Assembly error
    
    FAILED --> [*]
    COMPLETE --> [*]
    CANCELLED --> [*]
    
    note right of AWAITING_APPROVAL
        User reviews storyboard
        before GPU cost incurred
    end note
    
    note right of RENDERING
        Celery fan-out renders
        scenes in parallel
    end note

1.4 Credit Transaction Atomicity

# backend/app/services/credit_service.py
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

class CreditService:
    """
    Ensures atomic credit transactions with no double-spending.
    Uses database-level locking and transactions.
    """
    
    @staticmethod
    async def deduct_credits(
        session: AsyncSession,
        user_id: UUID,
        amount_credits: int,
        job_id: UUID,
        description: str
    ) -> bool:
        """
        Atomically deduct credits from user balance.
        Returns True if successful, False if insufficient balance.
        
        Uses SELECT FOR UPDATE to lock the user row during transaction.
        """
        try:
            # Lock user row for update (prevents concurrent deductions)
            stmt = select(User).where(User.id == user_id).with_for_update()
            user = await session.execute(stmt)
            user = user.scalar_one()
            
            # Check balance
            if user.credits_balance < amount_credits:
                await session.rollback()
                return False
            
            # Record transaction
            balance_before = user.credits_balance
            balance_after = balance_before - amount_credits
            
            transaction = CreditTransaction(
                user_id=user_id,
                job_id=job_id,
                transaction_type=CreditTransactionType.RENDER,
                amount_credits=-amount_credits,
                balance_before=balance_before,
                balance_after=balance_after,
                description=description
            )
            session.add(transaction)
            
            # Update user balance
            user.credits_balance = balance_after
            
            # Commit atomically
            await session.commit()
            return True
            
        except Exception as e:
            await session.rollback()
            raise e
    
    @staticmethod
    async def add_credits(
        session: AsyncSession,
        user_id: UUID,
        amount_credits: int,
        amount_usd: Decimal,
        description: str
    ) -> None:
        """
        Atomically add credits (purchase or admin adjustment).
        """
        try:
            stmt = select(User).where(User.id == user_id).with_for_update()
            user = await session.execute(stmt)
            user = user.scalar_one()
            
            balance_before = user.credits_balance
            balance_after = balance_before + amount_credits
            
            transaction = CreditTransaction(
                user_id=user_id,
                transaction_type=CreditTransactionType.PURCHASE,
                amount_credits=amount_credits,
                amount_usd=amount_usd,
                balance_before=balance_before,
                balance_after=balance_after,
                description=description
            )
            session.add(transaction)
            
            user.credits_balance = balance_after
            user.total_credits_purchased += amount_credits
            
            await session.commit()
            
        except Exception as e:
            await session.rollback()
            raise e

2. Storyboard JSON Schema (Pydantic)

# backend/app/schemas/storyboard.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from enum import Enum

class MotionType(str, Enum):
    ZOOM = "zoom"
    PAN = "pan"
    STATIC = "static"
    DOLLY = "dolly"
    ROTATE = "rotate"
    TILT = "tilt"

class LightingStyle(str, Enum):
    CINEMATIC = "cinematic"
    NEON = "neon"
    NATURAL = "natural"
    DRAMATIC = "dramatic"
    SOFT = "soft"
    HARSH = "harsh"

class CameraAngle(str, Enum):
    WIDE = "wide"
    MEDIUM = "medium"
    CLOSE_UP = "close_up"
    EXTREME_CLOSE_UP = "extreme_close_up"
    OVERHEAD = "overhead"
    LOW_ANGLE = "low_angle"

class Mood(str, Enum):
    ENERGETIC = "energetic"
    CALM = "calm"
    DRAMATIC = "dramatic"
    PLAYFUL = "playful"
    MELANCHOLIC = "melancholic"
    AGGRESSIVE = "aggressive"
    ROMANTIC = "romantic"
    MYSTERIOUS = "mysterious"

class SceneSchema(BaseModel):
    """
    Individual scene in the storyboard.
    Generated by Claude Sonnet 4.5.
    """
    scene_index: int = Field(..., ge=0, description="0-indexed scene number")
    start_time_seconds: float = Field(..., ge=0, description="Scene start time in seconds")
    end_time_seconds: float = Field(..., gt=0, description="Scene end time in seconds")
    duration_seconds: float = Field(..., gt=0, description="Scene duration (end - start)")
    
    visual_description: str = Field(
        ...,
        min_length=20,
        max_length=500,
        description="Detailed visual prompt for video generation"
    )
    
    motion_type: MotionType = Field(
        ...,
        description="Primary camera motion for this scene"
    )
    
    lighting_style: LightingStyle = Field(
        ...,
        description="Lighting aesthetic for this scene"
    )
    
    color_palette: List[str] = Field(
        ...,
        min_items=2,
        max_items=5,
        description="Hex color codes for dominant colors"
    )
    
    mood: Mood = Field(
        ...,
        description="Emotional tone of the scene"
    )
    
    camera_angle: CameraAngle = Field(
        ...,
        description="Primary camera angle"
    )
    
    beat_importance_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="0.0-1.0 score indicating importance for beat sync"
    )
    
    bar_start_beat_index: int = Field(
        ...,
        ge=0,
        description="Which beat (in the beat map) this scene starts on"
    )
    
    bar_end_beat_index: int = Field(
        ...,
        ge=0,
        description="Which beat this scene ends on"
    )
    
    transition_type: Optional[str] = Field(
        None,
        description="Optional: 'cut', 'fade', 'dissolve'"
    )
    
    @validator('end_time_seconds')
    def end_after_start(cls, v, values):
        if 'start_time_seconds' in values and v <= values['start_time_seconds']:
            raise ValueError('end_time_seconds must be > start_time_seconds')
        return v
    
    @validator('duration_seconds')
    def duration_matches(cls, v, values):
        if 'start_time_seconds' in values and 'end_time_seconds' in values:
            expected = values['end_time_seconds'] - values['start_time_seconds']
            if abs(v - expected) > 0.01:  # Allow 10ms tolerance
                raise ValueError(f'duration_seconds must equal end - start ({expected})')
        return v
    
    @validator('color_palette')
    def valid_hex_colors(cls, v):
        import re
        hex_pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')
        for color in v:
            if not hex_pattern.match(color):
                raise ValueError(f'Invalid hex color: {color}')
        return v
    
    class Config:
        use_enum_values = True

class StoryboardSchema(BaseModel):
    """
    Complete storyboard output from Claude Sonnet 4.5.
    This is the "contract" between LLM and backend.
    """
    scenes: List[SceneSchema] = Field(
        ...,
        min_items=1,
        max_items=30,
        description="Array of scenes (max 30 for Phase 1)"
    )
    
    total_duration_seconds: float = Field(
        ...,
        gt=0,
        description="Total video duration (should match audio duration)"
    )
    
    narrative_arc: str = Field(
        ...,
        min_length=50,
        max_length=500,
        description="High-level description of the story/visual journey"
    )
    
    dominant_mood: Mood = Field(
        ...,
        description="Overall mood of the entire video"
    )
    
    quality_score: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Claude's self-assessment of storyboard quality (0-10)"
    )
    
    @validator('scenes')
    def scenes_contiguous(cls, v):
        """Ensure scenes are contiguous (no gaps or overlaps)."""
        if not v:
            return v
        
        sorted_scenes = sorted(v, key=lambda s: s.start_time_seconds)
        
        for i in range(len(sorted_scenes) - 1):
            current_end = sorted_scenes[i].end_time_seconds
            next_start = sorted_scenes[i + 1].start_time_seconds
            
            if abs(current_end - next_start) > 0.1:  # Allow 100ms tolerance
                raise ValueError(
                    f'Scene gap detected: Scene {i} ends at {current_end}s, '
                    f'Scene {i+1} starts at {next_start}s'
                )
        
        return v
    
    @validator('total_duration_seconds')
    def duration_matches_scenes(cls, v, values):
        if 'scenes' in values and values['scenes']:
            last_scene = max(values['scenes'], key=lambda s: s.end_time_seconds)
            if abs(v - last_scene.end_time_seconds) > 0.1:
                raise ValueError(
                    f'total_duration_seconds ({v}s) does not match '
                    f'last scene end time ({last_scene.end_time_seconds}s)'
                )
        return v
    
    class Config:
        use_enum_values = True

# Example usage in planning worker
async def validate_storyboard(storyboard_json: dict) -> StoryboardSchema:
    """
    Validates Claude's output against the schema.
    Raises ValidationError if invalid.
    """
    return StoryboardSchema(**storyboard_json)

3. Authentication & Security Flow
3.1 Auth Strategy Recommendation
Recommendation: Custom FastAPI JWT + Supabase Auth (optional social login)

Rationale:

Phase 1 needs simple, fast auth without external dependencies
Custom JWT gives full control over token claims and expiry
Supabase Auth can be added in Phase 2 for social login (Google/GitHub)
No vendor lock-in; can swap providers later

sequenceDiagram
    participant User
    participant Frontend
    participant FastAPI
    participant PostgreSQL
    participant Redis

    User->>Frontend: 1. Enter email/password
    Frontend->>FastAPI: 2. POST /auth/register or /auth/login
    
    alt Registration
        FastAPI->>PostgreSQL: Check email exists
        PostgreSQL-->>FastAPI: Not found
        FastAPI->>PostgreSQL: Create user (password_hash)
        FastAPI->>FastAPI: Generate JWT (access + refresh)
        FastAPI->>Redis: Store refresh token (TTL: 7 days)
        FastAPI-->>Frontend: { access_token, refresh_token, user }
    else Login
        FastAPI->>PostgreSQL: Fetch user by email
        PostgreSQL-->>FastAPI: User record
        FastAPI->>FastAPI: Verify password_hash
        FastAPI->>FastAPI: Generate JWT (access + refresh)
        FastAPI->>Redis: Store refresh token
        FastAPI-->>Frontend: { access_token, refresh_token, user }
    end
    
    Frontend->>Frontend: Store access_token (memory)
    Frontend->>Frontend: Store refresh_token (httpOnly cookie)
    
    User->>Frontend: 3. Upload audio file
    Frontend->>FastAPI: 4. POST /api/jobs (Authorization: Bearer {access_token})
    
    FastAPI->>FastAPI: Verify JWT signature
    FastAPI->>FastAPI: Check token expiry
    FastAPI->>FastAPI: Extract user_id from claims
    FastAPI->>PostgreSQL: Create job record
    FastAPI-->>Frontend: { job_id, status }
    
    alt Token expired
        Frontend->>FastAPI: 5. POST /auth/refresh (refresh_token in cookie)
        FastAPI->>Redis: Validate refresh token
        FastAPI->>FastAPI: Generate new access_token
        FastAPI-->>Frontend: { access_token }
        Frontend->>Frontend: Update memory with new token
    end

3.3 JWT Token Structure

# backend/app/core/security.py
from datetime import datetime, timedelta
from typing import Optional
import jwt
from pydantic import BaseModel

class TokenPayload(BaseModel):
    sub: str  # user_id (UUID as string)
    email: str
    role: str  # '
