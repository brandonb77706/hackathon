from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from auth import get_current_user
from database import get_db
from models import UserProfile, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/{user_id}", response_model=UserProfile)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    if current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    db = get_db()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id)},
        {"$set": update_data},
        return_document=True,
    )

    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    return UserProfile(
        user_id=str(result["_id"]),
        oauth_sub=result["oauth_sub"],
        email=result.get("email"),
        name=result.get("name"),
        city=result.get("city"),
        created_at=result.get("created_at"),
    )
