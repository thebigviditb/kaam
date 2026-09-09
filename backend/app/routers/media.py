from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import storage
from app.db import get_db
from app.deps import get_current_user
from app.models import Media, User
from app.schemas import MediaOut, MediaRegister, PresignRequest, PresignResponse

router = APIRouter(prefix="/media", tags=["media"])

MAX_ITEMS_PER_USER = 12


def _out(m: Media) -> MediaOut:
    return MediaOut(
        id=m.id,
        kind=m.kind,
        content_type=m.content_type,
        url=storage.presign_get(m.s3_key),
        created_at=m.created_at,
    )


@router.post("/presign", response_model=PresignResponse)
def presign(body: PresignRequest, user: User = Depends(get_current_user)):
    if body.content_type not in storage.ALLOWED_CONTENT_TYPES[body.kind]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "unsupported content type")
    limit = storage.MAX_IMAGE_BYTES if body.kind == "image" else storage.MAX_VIDEO_BYTES
    if body.size_bytes > limit:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"file too large (max {limit})")
    if len(user.media) >= MAX_ITEMS_PER_USER:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "media limit reached")
    key = storage.new_key(user.id, body.kind, body.content_type)
    return PresignResponse(
        upload_url=storage.presign_put(key, body.content_type),
        s3_key=key,
        headers={"Content-Type": body.content_type},
    )


@router.post("", response_model=MediaOut, status_code=status.HTTP_201_CREATED)
def register(
    body: MediaRegister, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if not body.s3_key.startswith(f"users/{user.id}/"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "key does not belong to you")
    m = Media(
        owner_user_id=user.id, kind=body.kind, s3_key=body.s3_key, content_type=body.content_type
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _out(m)


@router.get("", response_model=list[MediaOut])
def list_mine(user: User = Depends(get_current_user)):
    return [_out(m) for m in user.media]


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(media_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Media, media_id)
    if m is None or m.owner_user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "media not found")
    storage.delete_object(m.s3_key)
    db.delete(m)
    db.commit()
