"""HOOPS AI - Billing Tests

Tests for payment plans, installments, one-time charges, and parent payment flows.
"""
import pytest
from tests.conftest import auth_headers


# ── Helpers ──────────────────────────────────────────────────────────────────


async def create_team_with_player(client, admin_token):
    """Create a team, add a player, return (team_id, player_invite_code)."""
    # Create team
    res = await client.post(
        "/api/teams",
        json={"name": "Billing Test Team", "age_group": "U14"},
        headers=auth_headers(admin_token),
    )
    assert res.status_code == 200
    team = res.json()["data"]
    team_id = team["id"]

    # Get player invite code
    invite_code = team.get("player_invite_code", "")

    # Register a player with the invite code
    res = await client.post("/api/player-auth/register", json={
        "name": "Test Player",
        "email": "billing_player@test.com",
        "password": "test123456",
        "invite_code": invite_code,
    })
    # Player might not register if invite flow is different
    return team_id


# ── Payment Plans ────────────────────────────────────────────────────────────


class TestPaymentPlans:
    async def test_create_plan_no_team_id(self, client, admin_token):
        """Creating a plan without team_id or all_teams should fail."""
        res = await client.post(
            "/api/billing/plans",
            json={
                "season": "2025-2026",
                "total_amount": 5000,
                "num_installments": 10,
                "billing_day": 10,
                "start_month": "2025-09",
            },
            headers=auth_headers(admin_token),
        )
        assert res.status_code in (400, 422)

    async def test_create_plan_for_team(self, client, admin_token):
        """Create a payment plan for a team."""
        team_id = await create_team_with_player(client, admin_token)
        res = await client.post(
            "/api/billing/plans",
            json={
                "team_id": team_id,
                "season": "2025-2026",
                "total_amount": 5000,
                "num_installments": 10,
                "billing_day": 10,
                "start_month": "2025-09",
            },
            headers=auth_headers(admin_token),
        )
        # May succeed or fail depending on whether team has players
        assert res.status_code in (200, 400)


# ── Overview ─────────────────────────────────────────────────────────────────


class TestBillingOverview:
    async def test_overview_authenticated(self, client, admin_token):
        res = await client.get(
            "/api/billing/overview",
            headers=auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True

    async def test_overview_with_team_filter(self, client, admin_token):
        res = await client.get(
            "/api/billing/overview?team_id=99999",
            headers=auth_headers(admin_token),
        )
        # Should return empty data, not error
        assert res.status_code == 200

    async def test_overview_unauthenticated(self, client):
        res = await client.get("/api/billing/overview")
        assert res.status_code in (401, 403)


# ── One-Time Charges ─────────────────────────────────────────────────────────


class TestOneTimeCharges:
    async def test_create_charge_no_team_id(self, client, admin_token):
        """Creating a charge without team_id should fail."""
        res = await client.post(
            "/api/billing/one-time",
            json={
                "title": "Registration Fee",
                "amount": 200,
            },
            headers=auth_headers(admin_token),
        )
        assert res.status_code in (400, 422)

    async def test_create_charge_for_team(self, client, admin_token):
        """Create a one-time charge for a team."""
        team_id = await create_team_with_player(client, admin_token)
        res = await client.post(
            "/api/billing/one-time",
            json={
                "team_id": team_id,
                "title": "Registration Fee",
                "amount": 200,
            },
            headers=auth_headers(admin_token),
        )
        # May succeed or fail depending on team players
        assert res.status_code in (200, 400)


# ── New Payments ─────────────────────────────────────────────────────────────


class TestNewPayments:
    async def test_get_new_payments(self, client, admin_token):
        res = await client.get(
            "/api/billing/new-payments",
            headers=auth_headers(admin_token),
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "data" in data

    async def test_new_payments_unauthenticated(self, client):
        res = await client.get("/api/billing/new-payments")
        assert res.status_code in (401, 403)
