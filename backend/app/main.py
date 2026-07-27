from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db, engine, Base
from app import models, schemas
from app.security import hash_password, verify_password, create_access_token

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

#GET CURRENT USER
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import os

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
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
        description=payload.description,
        is_public=payload.is_public,
        owner_id=current_user.id,
    )

    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)

    return new_deck

@app.get("/me/decks", response_model=list[schemas.DeckResponse])
def get_my_decks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Deck).filter(models.Deck.owner_id == current_user.id).all()

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
@app.get("/decks", response_model=list[schemas.DeckResponse])
def get_public_decks(
    game: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Deck).filter(models.Deck.is_public.is_(True))

    if game is not None:
        query = query.filter(models.Deck.game == game)

    return query.all()

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

# CORS
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)