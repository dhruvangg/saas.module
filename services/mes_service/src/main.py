from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.work_orders import router as work_orders_router

app = FastAPI(
    title="MES Core Microservice",
    version="1.0.0",
    description="Dedicated microservice for MES production operations, decoupled from Auth.",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(work_orders_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "service": "mes_service"}
