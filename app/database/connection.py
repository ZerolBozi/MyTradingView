import os
from typing import Optional

import aiosqlite

from app.config import settings

class DB:
    db_conn = None
    db_path: Optional[str]= None

    @classmethod
    async def get_db(cls):
        if cls.db_conn is None:
            await cls.connect()
        return cls.db_conn

    @classmethod
    async def connect(cls):
        if cls.db_conn is None:
            cls.db_path = os.path.join(settings.DB_DIR, "app_data.db")

            cls.db_conn = await aiosqlite.connect(cls.db_path)

            await cls.db_conn.execute("PRAGMA foreign_keys = ON")

            cls.db_conn.row_factory = aiosqlite.Row

            print(f"Connected to SQLite at {cls.db_path}")

            await cls.init_schema()

    @classmethod
    async def init_schema(cls):
        async with cls.db_conn.cursor() as cursor:
            # Create charts_storage table
            await cursor.execute("""
            CREATE TABLE IF NOT EXISTS charts_storage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                symbol TEXT NOT NULL,
                resolution TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                update_time TEXT NOT NULL
            )
            """)
            
            # Create a unique index on the name column for charts_storage
            await cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_chart_name ON charts_storage (name)
            """)
            
            # Create watch_lists table to store list metadata
            await cursor.execute("""
            CREATE TABLE IF NOT EXISTS watch_lists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                create_time TEXT NOT NULL,
                update_time TEXT NOT NULL
            )
            """)
            
            # Create watch_list_items table to store symbols in each list
            await cursor.execute("""
            CREATE TABLE IF NOT EXISTS watch_list_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                list_id INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                full_name TEXT NOT NULL,
                description TEXT,
                exchange TEXT NOT NULL,
                create_time TEXT NOT NULL,
                update_time TEXT NOT NULL,
                FOREIGN KEY (list_id) REFERENCES watch_lists (id) ON DELETE CASCADE,
                UNIQUE (list_id, symbol, exchange)
            )
            """)
            
            # Create an index on list_id for faster queries
            await cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_watch_list_items_list_id 
            ON watch_list_items (list_id)
            """)

            await cursor.execute("""
            CREATE TABLE IF NOT EXISTS markets_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exchange TEXT NOT NULL,
                symbols TEXT NOT NULL,
                last_updated INTEGER NOT NULL,
                UNIQUE(exchange)
            )
            """)

            await cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_market_exchange ON markets_cache (exchange)
            """)
            
            await cls.db_conn.commit()

    @classmethod
    async def close(cls):
        if cls.db_conn:
            await cls.db_conn.close()
            cls.db_conn = None
            print("Database connection closed")