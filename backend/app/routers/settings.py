from fastapi import APIRouter, HTTPException
from app.services.settings_service import UserSettings, load_settings, save_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings():
    """
    Get current user settings

    Returns:
        Current settings (credentials are included - this endpoint should be protected in production)
    """
    try:
        settings = load_settings()
        return settings.model_dump()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load settings: {str(e)}"
        )


@router.post("")
async def update_settings(settings: UserSettings):
    """
    Update user settings

    Args:
        settings: New settings to save

    Returns:
        Success message
    """
    try:
        success = save_settings(settings)
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to save settings"
            )

        return {
            "success": True,
            "message": "Settings saved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save settings: {str(e)}"
        )
