"""HOOPS AI - Player Repository"""
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.player import Player
from src.repositories.base_repository import BaseRepository


class PlayerRepository(BaseRepository[Player]):
    def __init__(self, session: AsyncSession):
        super().__init__(Player, session)
