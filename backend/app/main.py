from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import text
from app.database import get_db, engine, Base
from app import models, schemas
from app import email as email_service
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_reset_token,
    hash_reset_token,
    SECRET_KEY,
)

RESET_TOKEN_EXPIRE_MINUTES = 30

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DeckDen API")

@app.get("/")
def root():
    return {"message": "DeckDen API is running"}

@app.get("/health/db")
def db_health_check(db: Session = Depends(get_db)):
    """Proves FastAPI can actually talk to Postgres."""
    result = db.execute(text("SELECT 1"))
    return {"database": "connected", "result": result.scalar()}

@app.post("/signup", response_model=schemas.UserResponse)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if username or email is already taken
    existing_user = db.query(models.User).filter(
        (models.User.username == payload.username) | (models.User.email == payload.email)
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    # Hash the password before storing anything
    new_user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@app.post("/login")
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/password-reset/request")
def request_password_reset(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    if user:
        raw_token = generate_reset_token()
        db.add(models.PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
        ))
        db.commit()
        email_service.send_password_reset_email(user.email, raw_token)

    # Same response either way — this must not reveal whether an email is registered.
    return {"message": "If that email is registered, we've sent a password reset link."}

@app.post("/password-reset/confirm")
def confirm_password_reset(payload: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == hash_reset_token(payload.token),
        models.PasswordResetToken.used_at.is_(None),
    ).first()

    if not reset_token or reset_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    user.hashed_password = hash_password(payload.new_password)
    reset_token.used_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Password updated"}

#GET CURRENT USER
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import os

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

ALGORITHM = "HS256"

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user

@app.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.delete("/me")
def delete_my_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted"}
#GET CURRENT USER

# DECK ENDPOINTS
@app.post("/decks", response_model=schemas.DeckResponse)
def create_deck(
    payload: schemas.DeckCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_deck = models.Deck(
        name=payload.name,
        game=payload.game,
        format=payload.format,
        play_style=payload.play_style,
        description=payload.description,
        is_public=payload.is_public,
        owner_id=current_user.id,
    )

    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)

    return new_deck

def _deck_summary(deck: models.Deck) -> models.Deck:
    """Attach the fields DeckSummaryResponse needs that aren't plain columns."""
    deck.owner_username = deck.owner.username
    first_card = min(deck.cards, key=lambda c: c.id, default=None)
    deck.preview_image_url = first_card.image_url if first_card else None
    deck.card_count = sum(c.quantity for c in deck.cards)
    return deck

@app.get("/me/decks", response_model=list[schemas.DeckSummaryResponse])
def get_my_decks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    decks = db.query(models.Deck).options(
        joinedload(models.Deck.owner), selectinload(models.Deck.cards)
    ).filter(models.Deck.owner_id == current_user.id).all()
    return [_deck_summary(deck) for deck in decks]

@app.get("/me/decks/{deck_id}", response_model=schemas.DeckWithCardsResponse)
def get_my_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deck = db.query(models.Deck).filter(
        models.Deck.id == deck_id,
        models.Deck.owner_id == current_user.id,
    ).first()

    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    return deck
# DECK ENDPOINTS

# Public Browse Decks that are Public with no Auth #
@app.get("/decks", response_model=list[schemas.DeckSummaryResponse])
def get_public_decks(
    game: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Deck).options(
        joinedload(models.Deck.owner), selectinload(models.Deck.cards)
    ).filter(models.Deck.is_public.is_(True))

    if game is not None:
        query = query.filter(models.Deck.game == game)

    return [_deck_summary(deck) for deck in query.all()]

# Private get deck by deck ID #
@app.get("/decks/{deck_id}", response_model=schemas.DeckWithCardsResponse)
def get_public_deck(deck_id: int, db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()

    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    if not deck.is_public:
        raise HTTPException(status_code=404, detail="Deck not found")

    return deck

# Private UPDATE deck by deck ID #
@app.put("/decks/{deck_id}", response_model=schemas.DeckResponse)
def update_deck(
    deck_id: int,
    payload: schemas.DeckUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()

    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    if deck.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this deck")

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(deck, field, value)

    db.commit()
    db.refresh(deck)

    return deck

# Private DELETE deck by deck ID #
@app.delete("/decks/{deck_id}")
def delete_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()

    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    if deck.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this deck")

    db.delete(deck)
    db.commit()

    return {"message": "Deck deleted"}

# Card endpoints
@app.post("/decks/{deck_id}/cards", response_model=schemas.DeckCardResponse)
def add_card_to_deck(
    deck_id: int,
    payload: schemas.DeckCardCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()

    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    if deck.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this deck")

    new_card = models.DeckCard(
    deck_id=deck.id,
    card_name=payload.card_name,
    external_card_id=payload.external_card_id,
    image_url=payload.image_url,
    quantity=payload.quantity,
    category=payload.category,
    notes=payload.notes,
)

    db.add(new_card)
    db.commit()
    db.refresh(new_card)

    return new_card

@app.get("/decks/{deck_id}/cards", response_model=list[schemas.DeckCardResponse])
def get_deck_cards(deck_id: int, db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()

    if deck is None or not deck.is_public:
        raise HTTPException(status_code=404, detail="Deck not found")

    return db.query(models.DeckCard).filter(models.DeckCard.deck_id == deck_id).all()

@app.put("/decks/{deck_id}/cards/{card_id}", response_model=schemas.DeckCardResponse)
def update_deck_card(
    deck_id: int,
    card_id: int,
    payload: schemas.DeckCardUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()

    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    if deck.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this deck")

    card = db.query(models.DeckCard).filter(
        models.DeckCard.id == card_id,
        models.DeckCard.deck_id == deck_id,
    ).first()

    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(card, field, value)

    db.commit()
    db.refresh(card)

    return card

@app.delete("/decks/{deck_id}/cards/{card_id}")
def delete_deck_card(
    deck_id: int,
    card_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id).first()

    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")

    if deck.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this deck")

    card = db.query(models.DeckCard).filter(
        models.DeckCard.id == card_id,
        models.DeckCard.deck_id == deck_id,
    ).first()

    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(card)
    db.commit()

    return {"message": "Card deleted"}

# Card endpoints

@app.get("/users/{username}/decks", response_model=list[schemas.DeckSummaryResponse])
def get_user_public_decks(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    decks = db.query(models.Deck).options(
        joinedload(models.Deck.owner), selectinload(models.Deck.cards)
    ).filter(
        models.Deck.owner_id == user.id,
        models.Deck.is_public.is_(True),
    ).all()
    return [_deck_summary(deck) for deck in decks]

@app.get("/users/search", response_model=list[schemas.UserSearchResult])
def search_users(q: str, db: Session = Depends(get_db)):
    if len(q.strip()) < 2:
        return []

    return db.query(models.User).filter(
        models.User.username.ilike(f"%{q}%")
    ).limit(8).all()

# CORS
from fastapi.middleware.cors import CORSMiddleware

# Comma-separated list so this can carry a production domain, a Vercel
# preview URL, and local dev all at once. Defaults to local dev only so
# nothing is silently wide-open if this is ever left unset in production.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/card-search/union-arena")
def search_union_arena_cards(q: str, db: Session = Depends(get_db)):
    if len(q.strip()) < 2:
        return []

    cards = db.query(models.UnionArenaCard).filter(
        models.UnionArenaCard.name.ilike(f"%{q}%")
        | models.UnionArenaCard.card_code.ilike(f"%{q}%")
    ).order_by(
        models.UnionArenaCard.name, models.UnionArenaCard.card_code
    ).limit(50).all()

    return [
        {"name": c.name, "externalId": c.card_code, "imageUrl": c.image_url or ""}
        for c in cards
    ]