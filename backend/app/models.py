from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base, TZDateTime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(TZDateTime, server_default=func.now())

    decks = relationship("Deck", back_populates="owner", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", cascade="all, delete-orphan")

class Deck(Base):
    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    game = Column(String, nullable=False)  # "Union Arena", "Yu-Gi-Oh!", "Pokemon"
    format = Column(String, nullable=True)  # optional for now
    play_style = Column(String, nullable=True)  # optional deck vibe/purpose tag

    description = Column(String, nullable=True)
    is_public = Column(Boolean, default=True, nullable=False)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(TZDateTime, server_default=func.now())

    cards = relationship("DeckCard", back_populates="deck", cascade="all, delete-orphan")
    owner = relationship("User", back_populates="decks")

class DeckCard(Base):
    __tablename__ = "deck_cards"

    id = Column(Integer, primary_key=True, index=True)

    deck_id = Column(Integer, ForeignKey("decks.id"), nullable=False)

    card_name = Column(String, nullable=False)
    external_card_id = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    category = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    created_at = Column(TZDateTime, server_default=func.now())

    deck = relationship("Deck", back_populates="cards")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(TZDateTime, nullable=False)
    used_at = Column(TZDateTime, nullable=True)
    created_at = Column(TZDateTime, server_default=func.now())

class UnionArenaCard(Base):
    __tablename__ = "union_arena_cards"

    id = Column(Integer, primary_key=True, index=True)
    card_code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)
    image_url = Column(String, nullable=True)