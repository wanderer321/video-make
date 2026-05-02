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
    workflow_step = Column(Integer, default=1)  # 1-剧本 2-资产 3-分镜 4-生成 5-配音 6-剪辑 7-导出
    breakdown_result = Column(JSON)  # 保存剧本拆解结果
    asset_prompts_map = Column(JSON)  # 保存提示词和assetId映射 {"character": [{"prompt": "...", "assetId": "..."}], ...}
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
    script_content = Column(Text)  # 存储剧本内容
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
    audio_path = Column(String)  # Generated audio file path
    has_audio = Column(Integer, default=0)  # 0=未生成, 1=已生成
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
    """Board represents a story segment (片段).
    A segment can be broken into multiple shots (镜头) when gen_mode='image'.
    Each shot generates one storyboard image, then composite into a segment video.
    """
    __tablename__ = "boards"

    id = Column(String, primary_key=True, default=gen_id)
    episode_id = Column(String, ForeignKey("episodes.id"), nullable=False)
    order_index = Column(Integer, default=0)
    # Segment-level fields
    prompt = Column(Text)  # Chinese description for display (中文片段描述)
    prompt_en = Column(Text)  # English prompt for generation (英文生图提示词)
    characters = Column(JSON)
    scene_id = Column(String)
    dialogue = Column(Text)
    notes = Column(Text)
    duration_sec = Column(Float, default=4.0)  # Total segment duration
    gen_mode = Column(String, default="image")  # "image" (分镜图→视频) or "video" (直接视频)
    reference_images = Column(JSON)
    # Provider settings for this segment
    image_provider = Column(String)  # Image generation provider for this segment
    video_provider = Column(String)  # Video generation provider for this segment
    # Generated outputs
    video_path = Column(String)  # Final composite video for this segment
    audio_path = Column(String)
    has_video = Column(Integer, default=0)  # 0=未生成, 1=已生成

    episode = relationship("Episode", back_populates="boards")
    shots = relationship("Shot", back_populates="board", cascade="all, delete-orphan", order_by="Shot.order_index")


class Shot(Base):
    """Shot represents a single storyboard frame (镜头).
    Multiple shots belong to one Board (segment).
    """
    __tablename__ = "shots"

    id = Column(String, primary_key=True, default=gen_id)
    board_id = Column(String, ForeignKey("boards.id"), nullable=False)
    order_index = Column(Integer, default=0)  # Order within the segment
    # Shot-level fields
    prompt = Column(Text)  # Chinese description for display (中文镜头描述)
    prompt_en = Column(Text)  # English prompt for image generation (英文生图提示词)
    characters = Column(JSON)  # Characters in this shot (镜头中的角色列表)
    shot_size = Column(String, default="中景")  # 特写/近景/中景/全景/远景
    camera_angle = Column(String)  # 固定/推进/拉远/摇镜/跟拍
    duration_sec = Column(Float, default=2.0)  # Shot duration
    # Generated output
    image_path = Column(String)  # Generated storyboard image
    has_image = Column(Integer, default=0)  # 0=未生成, 1=已生成

    board = relationship("Board", back_populates="shots")


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
