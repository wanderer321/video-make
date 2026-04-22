import asyncio
import os
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.database import init_db
from api.routes import projects, settings, generate, scripts, assets, boards, tts, compose
from services.task_worker import worker_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    worker_task = asyncio.create_task(worker_loop())
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="DramaForge Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:1420",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(scripts.router, prefix="/api/scripts", tags=["scripts"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(boards.router, prefix="/api/boards", tags=["boards"])
app.include_router(tts.router, prefix="/api/tts", tags=["tts"])
app.include_router(compose.router, prefix="/api/compose", tags=["compose"])


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    port = int(os.environ.get("DRAMAFORGE_PORT", "17321"))
    print(f"[DramaForge] Backend starting on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, reload=False)
