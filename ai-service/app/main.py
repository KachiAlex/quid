from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.routers import classification
from app.config import settings

app = FastAPI(
    title="Quid AI Service",
    description="Transaction classification and financial product detection",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classification.router, prefix="/classify", tags=["classification"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "quid-ai"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
