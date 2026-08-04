from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    env: str = "development"

    database_url: str

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # Seed-only credentials, read by app/seed.py. Kept in Settings (rather than
    # bare os.getenv) so the .env file is honoured without exporting variables.
    owner_email: str = "owner@kwt25.com"
    owner_password: str = ""

    upload_dir: str = "./uploads"
    public_media_base_url: str | None = None

    admin_cors_origins: list[str] = ["http://localhost:3000"]
    storefront_cors_origins: list[str] = ["http://localhost:3100"]


settings = Settings()
