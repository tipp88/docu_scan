from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra='ignore'
    )
    # FastAPI
    backend_host: str = "0.0.0.0"
    backend_port: int = 8888
    backend_cors_origins: str = "http://localhost:3000"
    log_level: str = "info"

    # PDF Generation - Maximum quality settings
    pdf_compression_quality: int = 98  # Maximum quality for best OCR (95+ is excellent)
    pdf_max_image_size: int = 5000     # Allow very large images for maximum detail

    # Paperless-ngx
    paperless_enabled: bool = True
    paperless_url: str = "http://192.168.178.113:8000"
    paperless_token: str = ""
    paperless_default_tags: str = "scanned,mobile"

    # WebDAV Storage
    webdav_enabled: bool = False
    webdav_url: str = ""
    webdav_username: str = ""
    webdav_password: str = ""
    webdav_default_path: str = "/Scans/"

    # SMB Storage
    smb_enabled: bool = False
    smb_server: str = ""
    smb_share: str = ""
    smb_username: str = ""
    smb_password: str = ""
    smb_domain: str = "WORKGROUP"
    smb_default_path: str = "/Scans/"

    # FTP Storage
    ftp_enabled: bool = False
    ftp_host: str = ""
    ftp_port: int = 21
    ftp_username: str = ""
    ftp_password: str = ""
    ftp_tls: bool = False
    ftp_default_path: str = "/Scans/"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",")]


settings = Settings()
