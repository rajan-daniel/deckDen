import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:devpassword@localhost:5432/deckden")

# The "engine" is the actual connection pool to Postgres
engine = create_engine(DATABASE_URL)

# SessionLocal is a factory that creates new DB sessions (think: a "conversation" with the db)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is what all our table models will inherit from
Base = declarative_base()


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