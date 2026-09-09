"""S3 presigned URL helpers. Media bucket is private; all access is via presigned URLs."""

import uuid
from functools import lru_cache

import boto3
from botocore.config import Config

from app.config import get_settings

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 100 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image": {"image/jpeg", "image/png", "image/webp", "image/heic"},
    "video": {"video/mp4", "video/quicktime", "video/webm"},
}


@lru_cache
def _client():
    st = get_settings()
    return boto3.client(
        "s3",
        region_name=st.media_aws_region,
        aws_access_key_id=st.media_aws_access_key_id or None,
        aws_secret_access_key=st.media_aws_secret_access_key or None,
        config=Config(signature_version="s3v4"),
    )


def new_key(user_id: str, kind: str, content_type: str) -> str:
    ext = content_type.split("/")[-1].replace("quicktime", "mov")
    return f"users/{user_id}/{kind}s/{uuid.uuid4()}.{ext}"


def presign_put(key: str, content_type: str, expires: int = 600) -> str:
    return _client().generate_presigned_url(
        "put_object",
        Params={"Bucket": get_settings().media_bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )


def presign_get(key: str, expires: int = 3600) -> str:
    bucket = get_settings().media_bucket
    if not bucket:
        return ""
    return _client().generate_presigned_url(
        "get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=expires
    )


def delete_object(key: str) -> None:
    bucket = get_settings().media_bucket
    if bucket:
        _client().delete_object(Bucket=bucket, Key=key)
