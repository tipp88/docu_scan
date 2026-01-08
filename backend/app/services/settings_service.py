import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel

# Settings file location - can be overridden with environment variable
SETTINGS_FILE = os.getenv('DOCUSCAN_SETTINGS_FILE', '/app/data/settings.json')


class UserSettings(BaseModel):
    """User-configurable settings stored persistently"""
    paperlessUrl: str = ""
    paperlessToken: str = ""
    paperlessDefaultTags: str = "docu_scan"
    defaultEnhancement: str = "auto"


def _ensure_settings_dir():
    """Ensure the settings directory exists"""
    settings_path = Path(SETTINGS_FILE)
    settings_path.parent.mkdir(parents=True, exist_ok=True)


def load_settings() -> UserSettings:
    """
    Load user settings from JSON file

    Returns:
        UserSettings object with loaded or default values
    """
    _ensure_settings_dir()

    if not os.path.exists(SETTINGS_FILE):
        # Return default settings if file doesn't exist
        return UserSettings()

    try:
        with open(SETTINGS_FILE, 'r') as f:
            data = json.load(f)
            return UserSettings(**data)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Warning: Failed to load settings from {SETTINGS_FILE}: {e}")
        return UserSettings()


def save_settings(settings: UserSettings) -> bool:
    """
    Save user settings to JSON file

    Args:
        settings: UserSettings object to save

    Returns:
        True if saved successfully, False otherwise
    """
    _ensure_settings_dir()

    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings.model_dump(), f, indent=2)
        return True
    except IOError as e:
        print(f"Error: Failed to save settings to {SETTINGS_FILE}: {e}")
        return False


def get_paperless_config() -> Dict[str, Any]:
    """
    Get Paperless configuration from saved settings

    Returns:
        Dict with url, token, and tags
    """
    settings = load_settings()
    return {
        'url': settings.paperlessUrl,
        'token': settings.paperlessToken,
        'tags': settings.paperlessDefaultTags.split(',') if settings.paperlessDefaultTags else ['docu_scan']
    }
