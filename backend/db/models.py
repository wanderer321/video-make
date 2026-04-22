import uuid
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    type = Column(String, default="manga_2d")  # manga_2d / manga_3d / live_action
    style = Column(String)
    cover_path = Column(String)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    episodes = relationship("Episode", back_populates="project", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")


class Episode(Base):
    __tablename__ = "episodes"

    id = Column(String, primary_key=True, default=gen_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    episode_no = Column(Integer, nullable=False)
    title = Column(String)
    status = Column(String, default="draft")  # draft / scripting / storyboard / generating / done
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="episodes")
    boards = relationship("Board", back_populates="episode", cascade="all, delete-orphan")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=gen_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    type = Column(String, nullable=False)  # character / scene / prop
    name = Column(String, nullable=False)
    description = Column(Text)
    prompt = Column(Text)
    negative_prompt = Column(Text)
    reference_image_path = Column(String)
    tts_config = Column(JSON)
    tags = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="assets")
    variants = relationship("AssetVariant", back_populates="asset", cascade="all, delete-orphan")


class AssetVariant(Base):
    __tablename__ = "asset_variants"

    id = Column(String, primary_key=True, default=gen_id)
    asset_id = Column(String, ForeignKey("assets.id"), nullable=False)
    label = Column(String)
    image_path = Column(String)
    prompt = Column(Text)

    asset = relationship("Asset", back_populates="variants")


class Board(Base):
    __tablename__ = "boards"

    id = Column(String, primary_key=True, default=gen_id)
    episode_id = Column(String, ForeignKey("episodes.id"), nullable=False)
    shot_id = Column(String)
    order_index = Column(Integer, default=0)
    image_path = Column(String)
    video_path = Column(String)
    audio_path = Column(String)
    prompt = Column(Text)
    characters = Column(JSON)
    scene_id = Column(String)
    camera_angle = Column(String)
    shot_size = Column(String)
    duration_sec = Column(Float, default=4.0)
    dialogue = Column(Text)
    notes = Column(Text)

    episode = relationship("Episode", back_populates="boards")


class GenTask(Base):
    __tablename__ = "gen_tasks"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String)  # image / video / tts / script
    status = Column(String, default="pending")  # pending / running / done / failed
    provider = Column(String)
    input_params = Column(JSON)
    output_path = Column(String)
    error_msg = Column(Text)
    cost_estimate = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime)


class ApiConfig(Base):
    __tablename__ = "api_configs"

    id = Column(String, primary_key=True, default=gen_id)
    provider = Column(String, unique=True, nullable=False)
    encrypted_data = Column(Text)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
