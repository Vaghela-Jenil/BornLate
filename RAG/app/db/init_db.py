from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine

import app.models

async def init_db():
    async with engine.begin() as connection:
        await connection.execute(
            text("CREATE EXTENSION IF NOT EXISTS vector")
        )

        await connection.run_sync(
            Base.metadata.create_all
        )