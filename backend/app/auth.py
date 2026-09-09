"""Cognito JWT verification.

The frontend sends the Cognito *access* token. We verify signature via the pool's JWKS,
the issuer, and the client id. In local dev (AUTH_DEV_BYPASS=true) a token of the form
``dev:<sub>:<email>`` is accepted so the API can be exercised without Cognito.
"""

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings

bearer = HTTPBearer(auto_error=False)


@dataclass
class Claims:
    sub: str
    email: str | None = None
    access_token: str | None = None

    def resolve_email(self, settings: Settings) -> str | None:
        """Cognito access tokens carry no email; ask Cognito for it when needed."""
        if self.email or not self.access_token or not settings.cognito_user_pool_id:
            return self.email
        try:
            import boto3

            resp = boto3.client("cognito-idp", region_name=settings.cognito_region).get_user(
                AccessToken=self.access_token
            )
            attrs = {a["Name"]: a["Value"] for a in resp.get("UserAttributes", [])}
            self.email = attrs.get("email")
        except Exception:  # noqa: BLE001 - email is best-effort
            self.email = None
        return self.email


@lru_cache
def _jwk_client(issuer: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{issuer}/.well-known/jwks.json", cache_keys=True)


def verify_token(token: str, settings: Settings) -> Claims:
    if settings.auth_dev_bypass and token.startswith("dev:"):
        parts = token.split(":", 2)
        return Claims(sub=parts[1], email=parts[2] if len(parts) > 2 else None)

    if not settings.cognito_user_pool_id:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "auth not configured")

    try:
        signing_key = _jwk_client(settings.cognito_issuer).get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.cognito_issuer,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"invalid token: {e}") from e

    # Access tokens carry client_id; id tokens carry aud. Accept either.
    client = payload.get("client_id") or payload.get("aud")
    if settings.cognito_client_id and client != settings.cognito_client_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token not for this app")

    return Claims(sub=payload["sub"], email=payload.get("email"), access_token=token)


def get_claims(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> Claims:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    return verify_token(creds.credentials, settings)
