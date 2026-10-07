import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "atm_kiosk"
    
    # 3 Gemini API keys for dynamic failover rotator
    GEMINI_API_KEY_1: str = ""
    GEMINI_API_KEY_2: str = ""
    GEMINI_API_KEY_3: str = ""
    
    # Optional comma-separated fallback
    GEMINI_API_KEYS: str = ""
    
    SECRET_KEY: str = "super-secret-atm-kiosk-jwt-token-key-2026"
    ALGORITHM: str = "HS256"
    ATM_SESSION_EXPIRY_SECONDS: int = 180
    GEMINI_FAILOVER_COOLDOWN_SECONDS: int = 60
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8081",
        "http://localhost:19006",
        "*"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def gemini_keys_list(self) -> List[str]:
        keys = []
        for k in [self.GEMINI_API_KEY_1, self.GEMINI_API_KEY_2, self.GEMINI_API_KEY_3]:
            cleaned = k.strip()
            if cleaned and not cleaned.startswith("AIzaSy_DEMO") and "REPLACE_ME" not in cleaned:
                keys.append(cleaned)
        
        if not keys and self.GEMINI_API_KEYS:
            for k in self.GEMINI_API_KEYS.split(","):
                cleaned = k.strip()
                if cleaned and not cleaned.startswith("AIzaSy_DEMO") and "REPLACE_ME" not in cleaned:
                    keys.append(cleaned)
        return keys


settings = Settings()
