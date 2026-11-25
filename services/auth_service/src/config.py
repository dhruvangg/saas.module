from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "MES Boilerplate - Auth & IAM Service"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "mysql+aiomysql://mes_user:mes_password@localhost:3306/mes_db"
    )

    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        "9f8a3c8e5d2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"


settings = Settings()
