from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017/peakpay"
    jwt_secret: str = "dev-secret-change-in-production"
    google_client_id: str = ""
    google_client_secret: str = ""
    agent_api_key: str = "dev-agent-key"
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
