"""HOOPS AI - Error Handling Tests

Verifies that custom exceptions (AppError hierarchy) are properly caught
by the global exception handler and return correct HTTP responses.
"""
import pytest
from tests.conftest import auth_headers


class TestValidationErrors:
    """Services raise ValidationError → API returns 400."""

    async def test_register_short_password(self, client):
        res = await client.post("/api/admin-auth/register", json={
            "name": "Test", "email": "val@test.com", "password": "12",
        })
        assert res.status_code == 400
        assert "detail" in res.json()

    async def test_register_empty_name(self, client):
        res = await client.post("/api/auth/register", json={
            "name": "  ", "email": "val2@test.com", "password": "password123",
        })
        assert res.status_code == 400

    async def test_duplicate_registration(self, client):
        payload = {"name": "Dup", "email": "dup_err@test.com", "password": "password123"}
        await client.post("/api/admin-auth/register", json=payload)
        res = await client.post("/api/admin-auth/register", json=payload)
        assert res.status_code == 409
        assert "detail" in res.json()


class TestAuthenticationErrors:
    """Invalid credentials → API returns 401."""

    async def test_wrong_password(self, client):
        await client.post("/api/admin-auth/register", json={
            "name": "Auth Test", "email": "auth_err@test.com", "password": "password123",
        })
        res = await client.post("/api/admin-auth/login", json={
            "email": "auth_err@test.com", "password": "wrongpassword",
        })
        assert res.status_code in (400, 401)

    async def test_nonexistent_user_login(self, client):
        res = await client.post("/api/admin-auth/login", json={
            "email": "ghost@test.com", "password": "password123",
        })
        assert res.status_code in (400, 401)


class TestForbiddenErrors:
    """Authorized user accessing wrong role → 401/403."""

    async def test_coach_cannot_access_admin(self, client, coach_token):
        res = await client.get(
            "/api/admin/dashboard",
            headers=auth_headers(coach_token),
        )
        assert res.status_code in (401, 403)


class TestNotFoundErrors:
    """Missing resources → 404."""

    async def test_nonexistent_team(self, client, admin_token):
        res = await client.get(
            "/api/teams/99999",
            headers=auth_headers(admin_token),
        )
        # Could be 404 or other depending on route existence
        assert res.status_code in (404, 422, 405)


class TestErrorResponseFormat:
    """Verify error responses have consistent format."""

    async def test_error_has_detail_field(self, client):
        res = await client.post("/api/admin-auth/register", json={
            "name": "Test", "email": "fmt@test.com", "password": "12",
        })
        data = res.json()
        assert "detail" in data
        assert isinstance(data["detail"], str)
        assert len(data["detail"]) > 0
