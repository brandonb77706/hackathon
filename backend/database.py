from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client.get_default_database()
    # Ensure indexes
    await db.users.create_index("oauth_sub", unique=True)
    await db.shifts.create_index("user_id")
    await db.shifts.create_index([("city", 1), ("platform", 1)])
    await db.peak_cache.create_index(
        [("city", 1), ("platform", 1), ("hour_of_day", 1), ("day_of_week", 1)],
        unique=True,
    )
    await db.agent_insights.create_index("user_id")
    print("Connected to MongoDB")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return db
