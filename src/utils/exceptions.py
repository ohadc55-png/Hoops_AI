"""HOOPS AI - Centralized Exception Classes

Replaces the scattered `raise ValueError` → `except ValueError → HTTPException` pattern.
Services raise these exceptions; the global handler in app.py converts them to HTTP responses.
"""


class AppError(Exception):
    """Base application error. Caught by the global exception handler in app.py."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ValidationError(AppError):
    """Invalid input / business rule violation (400)."""

    def __init__(self, message: str):
        super().__init__(message, 400)


class AuthenticationError(AppError):
    """Invalid credentials or expired token (401)."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, 401)


class ForbiddenError(AppError):
    """Authenticated but not authorized (403)."""

    def __init__(self, message: str = "Access denied"):
        super().__init__(message, 403)


class NotFoundError(AppError):
    """Resource not found (404)."""

    def __init__(self, resource: str = "Resource", id: int = None):
        msg = f"{resource} not found" + (f" (id={id})" if id else "")
        super().__init__(msg, 404)


class ConflictError(AppError):
    """Duplicate or conflicting state (409)."""

    def __init__(self, message: str):
        super().__init__(message, 409)
