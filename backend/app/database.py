import os
from datetime import timezone
from sqlalchemy import create_engine, DateTime, TypeDecorator
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:devpassword@localhost:5432/deckden")

# The "engine" is the actual connection pool to Postgres
engine = create_engine(DATABASE_URL)

# SessionLocal is a factory that creates new DB sessions (think: a "conversation" with the db)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is what all our table models will inherit from
Base = declarative_base()


class TZDateTime(TypeDecorator):
    """A timezone-aware DateTime that also round-trips correctly on SQLite.

    Postgres' TIMESTAMPTZ always hands back tz-aware datetimes, but SQLite
    has no native timezone-aware storage — plain DateTime(timezone=True)
    silently returns naive datetimes on SQLite, which crashes any code that
    compares them against datetime.now(timezone.utc). Normalizing on both
    the way in and the way out means model code doesn't need to know or
    care which database it's actually running against.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


def get_db():
    """
    This function is a 'dependency' FastAPI will call for every request that needs
    the database. It opens a session, hands it to the endpoint, then closes it
    afterward — even if the endpoint raises an error.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()