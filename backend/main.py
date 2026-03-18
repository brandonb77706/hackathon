"""
GigWorker Peak Time Optimizer — FastAPI backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import connect_db, close_db, get_db
from analytics import rebuild_peak_cache
from routes.auth_routes import router as auth_router
from routes.shift_routes import router as shift_router
from routes.analytics_routes import router as analytics_router
from routes.agent_routes import router as agent_router
from routes.user_routes import router as user_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    async def startup():
        await connect_db()
        await rebuild_peak_cache(get_db())
    asyncio.create_task(startup())
    yield
    await close_db()


app = FastAPI(title="GigWorker Peak Time Optimizer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(shift_router)
app.include_router(analytics_router)
app.include_router(agent_router)
app.include_router(user_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
