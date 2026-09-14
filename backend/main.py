import sys
from pathlib import Path

# Ensure backend directory is in sys.path for reliable module resolution in all deployment contexts
_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from api.shipments import router as shipments_router
from api.disruptions import router as disruptions_router
from api.stats import router as stats_router
from api.tracking import router as tracking_router
from api.weather import router as weather_router
from api.alerts import router as alerts_router
from api.ai import router as ai_router
from api.admin import router as admin_router
from api.receipts import router as receipts_router


app = FastAPI(
    title="Bob — Supply Chain Intelligence API",
    description="Backend API for Bob supply chain disruption management, tracking, weather, risk, and cold chain monitoring.",
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────
settings = get_settings()
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.frontend_origin and settings.frontend_origin not in origins:
    origins.append(settings.frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────
api_router = APIRouter()
api_router.include_router(tracking_router)
api_router.include_router(shipments_router)
api_router.include_router(disruptions_router)
api_router.include_router(stats_router)
api_router.include_router(weather_router)
api_router.include_router(alerts_router)
api_router.include_router(ai_router)
api_router.include_router(admin_router)
api_router.include_router(receipts_router)

# Mount routes at root, /api, and /svc/api for reverse-proxy & Vercel Services compatibility
app.include_router(api_router)
app.include_router(api_router, prefix="/api")
app.include_router(api_router, prefix="/svc/api")


@app.get("/", tags=["Health"])
@app.get("/svc/api", tags=["Health"])
async def root():
    """API root — health check."""
    return {"status": "ok", "service": "Bob Supply Chain Intelligence API", "version": "2.0.0"}


@app.get("/health", tags=["Health"])
@app.get("/svc/api/health", tags=["Health"])
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

