"""Temporary script: update admin#1 credentials and remove duplicate"""
import asyncio
from src.utils.database import AsyncSessionLocal
from sqlalchemy import text
from bcrypt import hashpw, gensalt


async def update():
    async with AsyncSessionLocal() as s:
        h = hashpw(b"6279986", gensalt()).decode()
        await s.execute(
            text("UPDATE users SET email=:e, password_hash=:h, name=:n WHERE id=1"),
            {"e": "ohadc55@gmail.com", "h": h, "n": "Ohad"},
        )
        await s.execute(text("DELETE FROM users WHERE id=242"))
        await s.commit()
        r = await s.execute(text("SELECT id, name, email, role FROM users WHERE id=1"))
        print(dict(r.mappings().first()))
        print("Admin updated successfully!")


asyncio.run(update())
