from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./kaam.db"
    cognito_region: str = "us-west-2"
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""
    media_bucket: str = ""
    # Vercel reserves AWS_* names, hence the MEDIA_ prefix.
    media_aws_region: str = "us-west-2"
    media_aws_access_key_id: str = ""
    media_aws_secret_access_key: str = ""
    cors_origins: str = "http://localhost:8081"
    auth_dev_bypass: bool = False
    anthropic_api_key: str = ""
    cron_secret: str = ""
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_subject: str = "mailto:vidit.batta@gmail.com"
    site_url: str = "https://kaam-web-tau.vercel.app"
    # SMS fallback for message notifications; off until the toll-free number is verified.
    sms_notifications_enabled: bool = False
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    deletion_grace_days: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def cognito_issuer(self) -> str:
        return (
            f"https://cognito-idp.{self.cognito_region}.amazonaws.com/{self.cognito_user_pool_id}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
