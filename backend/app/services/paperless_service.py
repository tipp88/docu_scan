import httpx
import asyncio
from typing import List, Optional, Dict
from app.config import settings


async def upload_to_paperless(
    pdf_bytes: bytes,
    title: str,
    tags: Optional[List[str]] = None,
    correspondent: Optional[str] = None,
    document_type: Optional[str] = None,
    paperless_url: Optional[str] = None,
    paperless_token: Optional[str] = None
) -> Dict:
    """
    Upload a PDF document to Paperless-ngx via REST API

    Args:
        pdf_bytes: PDF file as bytes
        title: Document title
        tags: List of tag names (will be converted to IDs)
        correspondent: Correspondent name
        document_type: Document type name
        paperless_url: Override Paperless URL (from frontend settings)
        paperless_token: Override Paperless token (from frontend settings)

    Returns:
        Response from Paperless API with document ID

    Raises:
        httpx.HTTPError: If upload fails
    """
    # Use provided URL/token or fall back to settings
    url = paperless_url or settings.paperless_url
    token = paperless_token or settings.paperless_token

    if not url:
        raise ValueError("Paperless URL is not configured")

    if not token:
        raise ValueError("Paperless API token is not configured")

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Get or create tag IDs from tag names
        tag_ids = []
        if tags:
            for tag_name in tags:
                tag_id = await _get_or_create_tag_id(client, tag_name, url, token)
                if tag_id:
                    tag_ids.append(tag_id)

        # Get correspondent and document_type IDs if names provided
        correspondent_id = None
        if correspondent:
            correspondent_id = await _get_correspondent_id(client, correspondent, url, token)

        document_type_id = None
        if document_type:
            document_type_id = await _get_document_type_id(client, document_type, url, token)

        # Prepare multipart form data
        upload_url = f"{url}/api/documents/post_document/"

        # Use bytes directly, not BytesIO (AsyncClient requires it)
        files = {
            'document': ('scan.pdf', pdf_bytes, 'application/pdf')
        }

        # Build form data as dict (simpler approach)
        data = {'title': title}

        # For tags, we need to send as a list
        if tag_ids:
            data['tags'] = ','.join(str(tid) for tid in tag_ids)

        if correspondent_id:
            data['correspondent'] = str(correspondent_id)

        if document_type_id:
            data['document_type'] = str(document_type_id)

        # Make request
        response = await client.post(
            upload_url,
            files=files,
            data=data,
            headers={
                'Authorization': f'Token {token}'
            }
        )

        response.raise_for_status()

        # Paperless post_document returns just the task ID as a string
        task_id = response.json()

        if isinstance(task_id, str):
            return {"id": task_id}
        return task_id


async def _get_or_create_tag_id(client: httpx.AsyncClient, tag_name: str, paperless_url: str, paperless_token: str) -> Optional[int]:
    """Get tag ID by name, creating it if it doesn't exist"""
    try:
        # Try to find existing tag - use URL encoding for name search
        import urllib.parse
        encoded_name = urllib.parse.quote(tag_name)
        response = await client.get(
            f"{paperless_url}/api/tags/?name__iexact={encoded_name}",
            headers={'Authorization': f'Token {paperless_token}'}
        )
        response.raise_for_status()
        results = response.json().get('results', [])

        if results:
            return results[0]['id']

        # Create new tag
        create_response = await client.post(
            f"{paperless_url}/api/tags/",
            json={'name': tag_name},
            headers={'Authorization': f'Token {paperless_token}'}
        )
        create_response.raise_for_status()
        return create_response.json()['id']

    except Exception as e:
        print(f"Warning: Failed to get/create tag '{tag_name}': {e}")

    return None


async def _get_correspondent_id(client: httpx.AsyncClient, correspondent_name: str, paperless_url: str, paperless_token: str) -> Optional[int]:
    """Get correspondent ID by name"""
    try:
        import urllib.parse
        encoded_name = urllib.parse.quote(correspondent_name)
        response = await client.get(
            f"{paperless_url}/api/correspondents/?name__iexact={encoded_name}",
            headers={'Authorization': f'Token {paperless_token}'}
        )
        response.raise_for_status()
        results = response.json().get('results', [])
        return results[0]['id'] if results else None
    except Exception as e:
        print(f"Warning: Failed to get correspondent '{correspondent_name}': {e}")
        return None


async def _get_document_type_id(client: httpx.AsyncClient, document_type_name: str, paperless_url: str, paperless_token: str) -> Optional[int]:
    """Get document type ID by name"""
    try:
        import urllib.parse
        encoded_name = urllib.parse.quote(document_type_name)
        response = await client.get(
            f"{paperless_url}/api/document_types/?name__iexact={encoded_name}",
            headers={'Authorization': f'Token {paperless_token}'}
        )
        response.raise_for_status()
        results = response.json().get('results', [])
        return results[0]['id'] if results else None
    except Exception as e:
        print(f"Warning: Failed to get document type '{document_type_name}': {e}")
        return None


async def get_paperless_tags() -> List[Dict]:
    """
    Get available tags from Paperless-ngx

    Returns:
        List of tags with id and name
    """
    if not settings.paperless_enabled or not settings.paperless_token:
        return []

    url = f"{settings.paperless_url}/api/tags/"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            headers={'Authorization': f'Token {settings.paperless_token}'}
        )
        response.raise_for_status()
        data = response.json()
        return data.get('results', [])


async def get_paperless_correspondents() -> List[Dict]:
    """
    Get available correspondents from Paperless-ngx

    Returns:
        List of correspondents with id and name
    """
    if not settings.paperless_enabled or not settings.paperless_token:
        return []

    url = f"{settings.paperless_url}/api/correspondents/"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            headers={'Authorization': f'Token {settings.paperless_token}'}
        )
        response.raise_for_status()
        data = response.json()
        return data.get('results', [])


async def get_paperless_document_types() -> List[Dict]:
    """
    Get available document types from Paperless-ngx

    Returns:
        List of document types with id and name
    """
    if not settings.paperless_enabled or not settings.paperless_token:
        return []

    url = f"{settings.paperless_url}/api/document_types/"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            headers={'Authorization': f'Token {settings.paperless_token}'}
        )
        response.raise_for_status()
        data = response.json()
        return data.get('results', [])


async def test_paperless_connection() -> Dict:
    """
    Test connection to Paperless-ngx

    Returns:
        Dict with status and message
    """
    if not settings.paperless_enabled:
        return {
            'status': 'disabled',
            'message': 'Paperless-ngx integration is not enabled'
        }

    if not settings.paperless_token:
        return {
            'status': 'error',
            'message': 'Paperless API token is not configured'
        }

    try:
        url = f"{settings.paperless_url}/api/documents/"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                url,
                headers={'Authorization': f'Token {settings.paperless_token}'}
            )
            response.raise_for_status()

            return {
                'status': 'connected',
                'message': 'Successfully connected to Paperless-ngx',
                'url': settings.paperless_url
            }
    except httpx.HTTPError as e:
        return {
            'status': 'error',
            'message': f'Failed to connect to Paperless-ngx: {str(e)}'
        }
