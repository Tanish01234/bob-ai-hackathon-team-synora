"""
Bob — Auth Dependencies
Reusable FastAPI dependency to verify Supabase JWT tokens.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from config import get_settings

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """
    Verify the Supabase JWT and return the authenticated user ID.

    1. Reads Authorization: Bearer <token> header
    2. Decodes and verifies token signature using Supabase JWT secret
    3. Extracts user ID (sub claim)
    4. Returns 401 on missing/invalid/expired tokens
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    settings = get_settings()

    user_id = None

    # 1. Verify directly via Supabase Auth (supports ES256, RS256, HS256)
    try:
        from db import get_supabase
        sb = get_supabase()
        if sb:
            user_res = sb.auth.get_user(token)
            if user_res and user_res.user:
                user_id = user_res.user.id
    except Exception:
        pass

    # 2. Fallback to local JWT decode if secret is configured
    if not user_id and settings.supabase_jwt_secret:
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            user_id = payload.get("sub")
        except JWTError:
            pass

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id
