"""HOOPS AI - Smoke Tests

Basic sanity checks for critical endpoints:
  - Auth registration & login (admin, coach)
  - Team creation
  - Billing overview
  - Protected endpoint access control
"""
import pytest
from tests.conftest import auth_headers


# ── Auth: Admin ───────────────────────────────────────────────────────────

class TestAdminAuth:
    async def test_register_admin(self, client):
        res = await client.post("/api/admin-auth/register", json={
            "name": "Admin One",
            "email": "admin1@test.com",
            "password": "password123",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "token" in data["data"]
        assert data["data"]["user"]["email"] == "admin1@test.com"

    async def test_register_admin_short_password(self, client):
        res = await client.post("/api/admin-auth/register", json={
            "name": "Admin",
            "email": "admin_short@test.com",
            "password": "123",
        })
        assert res.status_code == 400

    async def test_register_admin_duplicate_email(self, client):
        payload = {
            "name": "Admin Dup",
            "email": "dup@test.com",
            "password": "password123",
        }
        res1 = await client.post("/api/admin-auth/register", json=payload)
        assert res1.status_code == 200
        res2 = await client.post("/api/admin-auth/register", json=payload)
        assert res2.status_code in (400, 409)

    async def test_login_admin(self, client):
        # Register first
        await client.post("/api/admin-auth/register", json={
            "name": "Login Admin",
            "email": "login_admin@test.com",
            "password": "password123",
        })
        # Login
        res = await client.post("/api/admin-auth/login", json={
            "email": "login_admin@test.com",
            "password": "password123",
        })
        assert res.status_code == 200
        assert res.json()["data"]["token"]

    async def test_login_wrong_password(self, client):
        await client.post("/api/admin-auth/register", json={
            "name": "Wrong Pw",
            "email": "wrongpw@test.com",
            "password": "password123",
        })
        res = await client.post("/api/admin-auth/login", json={
            "email": "wrongpw@test.com",
            "password": "wrongpassword",
        })
        assert res.status_code in (400, 401)


# ── Auth: Coach ───────────────────────────────────────────────────────────

class TestCoachAuth:
    async def test_register_coach(self, client):
        res = await client.post("/api/auth/register", json={
            "name": "Coach One",
            "email": "coach1@test.com",
            "password": "password123",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "token" in data["data"]

    async def test_register_coach_empty_name(self, client):
        res = await client.post("/api/auth/register", json={
            "name": "   ",
            "email": "noname@test.com",
            "password": "password123",
        })
        assert res.status_code == 400


# ── Access Control ────────────────────────────────────────────────────────

class TestAccessControl:
    async def test_unauthenticated_admin_dashboard(self, client):
        res = await client.get("/api/admin/dashboard")
        assert res.status_code == 401 or res.status_code == 403

    async def test_unauthenticated_billing(self, client):
        res = await client.get("/api/billing/overview")
        assert res.status_code == 401 or res.status_code == 403

    async def test_admin_dashboard_with_token(self, client, admin_token):
        res = await client.get(
            "/api/admin/dashboard",
            headers=auth_headers(admin_token),
        )
        assert res.status_code == 200

    async def test_coach_cannot_access_admin_dashboard(self, client, coach_token):
        res = await client.get(
            "/api/admin/dashboard",
            headers=auth_headers(coach_token),
        )
        # Coach token should fail admin auth guard
        assert res.status_code in (401, 403)


# ── Teams ─────────────────────────────────────────────────────────────────

class TestTeams:
    async def test_create_team(self, client, admin_token):
        res = await client.post(
            "/api/teams",
            json={"name": "U14 Boys", "age_group": "U14"},
            headers=auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["name"] == "U14 Boys"

    async def test_list_teams(self, client, admin_token):
        # Create a team first
        await client.post(
            "/api/teams",
            json={"name": "U16 Girls", "age_group": "U16"},
            headers=auth_headers(admin_token),
        )
        res = await client.get(
            "/api/teams",
            headers=auth_headers(admin_token),
        )
        assert res.status_code == 200
        teams = res.json()["data"]
        assert len(teams) >= 1


# ── Billing ───────────────────────────────────────────────────────────────

class TestBilling:
    async def test_billing_overview(self, client, admin_token):
        res = await client.get(
            "/api/billing/overview",
            headers=auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True

    async def test_billing_overview_unauthenticated(self, client):
        res = await client.get("/api/billing/overview")
        assert res.status_code in (401, 403)
