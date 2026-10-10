from datetime import datetime, timedelta, timezone
import httpx
from fastapi import FastAPI, Depends, HTTPException, status
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

# Proxied so the API key stays server-side instead of sitting in a client-side
# fetch where anyone's devtools could read it and burn through our quota.
POKEMON_TCG_API_KEY = os.getenv("POKEMON_TCG_API_KEY")

async def _fetch_pokemon_cards(query: str) -> list[dict]:
    headers = {"X-Api-Key": POKEMON_TCG_API_KEY} if POKEMON_TCG_API_KEY else {}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                "https://api.pokemontcg.io/v2/cards",
                params={"q": f"name:*{query}*", "pageSize": 50},
                headers=headers,
            )
    except httpx.HTTPError:
        # Covers timeouts and connection failures, not just a bad status
        # code - the whole point of proxying is to survive the upstream
        # API being slow or flaky, so this can't be allowed to bubble up
        # as a raw 500.
        raise HTTPException(status_code=502, detail="Pokemon card search failed")

    if res.status_code != 200:
        raise HTTPException(status_code=502, detail="Pokemon card search failed")

    return res.json().get("data", [])

@app.get("/card-search/pokemon")
async def search_pokemon_cards(q: str):
    if len(q.strip()) < 2:
        return []

    cards = await _fetch_pokemon_cards(q)

    return [
        {
            "name": c["name"],
            "externalId": c["id"],
            "imageUrl": c.get("images", {}).get("small", ""),
        }
        for c in cards
    ]

#webauthn Section Passkeys
import json
import logging
from webauthn import generate_registration_options, options_to_json, verify_registration_response, generate_authentication_options, verify_authentication_response
from webauthn.helpers import bytes_to_base64url, parse_registration_credential_json, base64url_to_bytes, parse_authentication_credential_json
from sqlalchemy.exc import IntegrityError
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    UserVerificationRequirement,
)

logger = logging.getLogger("deckden.webauthn")

@app.post("/webauthn/register/options")
async def get_registration_options(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    WEBAUTHN_RP_ID = os.getenv("WEBAUTHN_RP_ID", "localhost")

    options = generate_registration_options(
        rp_id=WEBAUTHN_RP_ID,
        rp_name="DeckDen",
        user_id=str(current_user.id).encode("utf-8"),
        user_name=current_user.email,
        # Must match require_user_verification=True in register/verify, or the
        # authenticator may legitimately skip verification and we'd reject it.
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
    )

    challenge_row = models.WebAuthnChallenge(
    user_id=current_user.id,
    challenge=bytes_to_base64url(options.challenge),
    purpose="registration",
    expires_at=datetime.now(timezone.utc) + timedelta(seconds=60),
)
    db.add(challenge_row)
    db.commit()

    json_string = options_to_json(options)
    return json.loads(json_string)

@app.post("/webauthn/register/verify")
async def verify_registration(
    payload: dict,  # Captures the raw JSON directly from the browser's startRegistration()
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    WEBAUTHN_RP_ID = os.getenv("WEBAUTHN_RP_ID", "localhost")
    # Origin is the *frontend's* origin (where the browser page making the
    # WebAuthn call is loaded from) - not this API's own origin. Same default
    # as CORS_ORIGINS below, for the same reason: local Next.js dev runs on
    # :3000, this API runs on :8000.
    WEBAUTHN_EXPECTED_ORIGIN = os.getenv("WEBAUTHN_EXPECTED_ORIGIN", "http://localhost:3000")

    # 1. Fetch the active, unused registration challenge
    challenge_row = db.query(models.WebAuthnChallenge).filter(
        models.WebAuthnChallenge.user_id == current_user.id,
        models.WebAuthnChallenge.purpose == "registration",
        models.WebAuthnChallenge.used_at.is_(None),
    ).order_by(models.WebAuthnChallenge.expires_at.desc()).first()

    if not challenge_row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration challenge not found.",
        )

    # 2. Check expiration
    if datetime.now(timezone.utc) > challenge_row.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge has expired.",
        )

    # Invalidate the challenge now, before attempting verification, so it's
    # single-use regardless of whether verification below succeeds or fails.
    challenge_row.used_at = datetime.now(timezone.utc)
    db.commit()

    try:
        # 3. Parse raw dict into the WebAuthn typed object
        credential = parse_registration_credential_json(payload)

        # 4. Cryptographically verify the client's payload
        verified = verify_registration_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge_row.challenge),
            expected_origin=WEBAUTHN_EXPECTED_ORIGIN,
            expected_rp_id=WEBAUTHN_RP_ID,
            require_user_verification=True,
        )
    except Exception:
        # Client gets a generic message; the real reason goes to the server log.
        logger.exception("WebAuthn registration verification failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passkey registration failed.",
        )

    # 5. Create the persistent WebAuthn credential record
    new_credential = models.WebAuthnCredential(
        user_id=current_user.id,
        credential_id=bytes_to_base64url(verified.credential_id),
        public_key=bytes_to_base64url(verified.credential_public_key),
        sign_count=verified.sign_count,
    )
    db.add(new_credential)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This passkey is already registered.",
        )

    return {"status": "success", "message": "Passkey registered successfully"}
#webauthn Login begin
@app.post("/webauthn/login/options")
async def get_login_options(
    payload: schemas.PasskeyLoginOptionsRequest, db: Session = Depends(get_db)
):
    #edge case of null input
    if not payload.email:
        raise HTTPException(status_code=400, detail="Email field cannot be empty")

    WEBAUTHN_RP_ID = os.getenv("WEBAUTHN_RP_ID", "localhost")
    # 1. Fetch user from database using payload (e.g., email or username)
    user = (
        db.query(models.User)
        .filter(models.User.email == payload.email)
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # 2. Query all registered WebAuthn credentials for this specific user
    user_credentials = (
        db.query(models.WebAuthnCredential)
        .filter(models.WebAuthnCredential.user_id == user.id)
        .all()
    )

    # A user with no registered passkeys fails the same generic way as an
    # unknown user - same status, same message. Also avoids passing an empty
    # allow_credentials list into generate_authentication_options, which
    # options_to_json can't serialize (AttributeError: 'str' object has no
    # attribute 'value').
    if not user_credentials:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 3. Format the credentials array for the options payload
    allowed_credentials = [
        PublicKeyCredentialDescriptor(id=base64url_to_bytes(cred.credential_id))
        for cred in user_credentials
    ]

    # 4. Generate the cryptographic challenge options
    options = generate_authentication_options(
        rp_id=WEBAUTHN_RP_ID,
        allow_credentials=allowed_credentials,
        user_verification=UserVerificationRequirement.REQUIRED,
    )

    # 5. Correctly store the login challenge using the fetched user's ID
    challenge_row = models.WebAuthnChallenge(
        user_id=user.id,
        challenge=bytes_to_base64url(options.challenge),
        purpose="login",
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=60),
    )
    
    db.add(challenge_row)
    db.commit()

    # 6. Safely parse the generated option string to JSON dict format
    json_string = options_to_json(options)  # the library supplies a built-in JSON conversion tool
    return json.loads(json_string)

@app.post("/webauthn/login/verify")
async def verify_login(
    payload: dict,
    db: Session = Depends(get_db),
):
    WEBAUTHN_RP_ID = os.getenv("WEBAUTHN_RP_ID", "localhost")
    WEBAUTHN_EXPECTED_ORIGIN = os.getenv("WEBAUTHN_EXPECTED_ORIGIN", "http://localhost:3000")

    # 1. Parse first - we don't know who's logging in until we read the
    # credential's own id. That's why this endpoint isn't auth-gated: there's
    # no session yet to gate on, same as password /login.
    try:
        credential = parse_authentication_credential_json(payload)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 2. The credential's id tells us which stored credential - and
    # therefore which user - this is. We don't know the user until this
    # lookup succeeds.
    cred_row = db.query(models.WebAuthnCredential).filter(
        models.WebAuthnCredential.credential_id == credential.id
    ).first()

    if not cred_row:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 3. Find the matching, unused, unexpired login challenge for that user.
    challenge_row = db.query(models.WebAuthnChallenge).filter(
        models.WebAuthnChallenge.user_id == cred_row.user_id,
        models.WebAuthnChallenge.purpose == "login",
        models.WebAuthnChallenge.used_at.is_(None),
    ).order_by(models.WebAuthnChallenge.expires_at.desc()).first()

    if not challenge_row or datetime.now(timezone.utc) > challenge_row.expires_at:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Invalidate now, before verification - single-use regardless of
    # outcome, same reasoning as register/verify in WA-2.
    challenge_row.used_at = datetime.now(timezone.utc)
    db.commit()

    try:
        verified = verify_authentication_response(
            credential=credential,
            expected_challenge=base64url_to_bytes(challenge_row.challenge),
            expected_rp_id=WEBAUTHN_RP_ID,
            expected_origin=WEBAUTHN_EXPECTED_ORIGIN,
            credential_public_key=base64url_to_bytes(cred_row.public_key),
            credential_current_sign_count=cred_row.sign_count,
            require_user_verification=True,
        )
    except Exception:
        logger.exception("WebAuthn login verification failed")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 4. Update the stored sign_count so a future login can detect a cloned
    # authenticator, and record when this passkey was last actually used.
    cred_row.sign_count = verified.new_sign_count
    cred_row.last_used_at = datetime.now(timezone.utc)
    db.commit()

    # 5. Same session issuance as password login - the frontend doesn't need
    # to know or care which path got the user here.
    access_token = create_access_token(data={"sub": str(cred_row.user_id)})

    return {"access_token": access_token, "token_type": "bearer"}
#webauthn Login end

#webauthn Manage begin
@app.get("/webauthn/credentials", response_model=list[schemas.WebAuthnCredentialResponse])
def list_my_passkeys(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Scoped to the logged-in user: you can only ever see your own passkeys.
    return (
        db.query(models.WebAuthnCredential)
        .filter(models.WebAuthnCredential.user_id == current_user.id)
        .order_by(
            models.WebAuthnCredential.created_at.desc(),
            models.WebAuthnCredential.id.desc(),
        )
        .all()
    )

@app.delete("/webauthn/credentials/{passkey_id}")
def delete_my_passkey(
    passkey_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Filter by id AND owner. Without the user_id condition, any logged-in
    # user could delete anyone's passkey just by guessing row numbers.
    # Someone else's passkey gets the same 404 as one that doesn't exist, so
    # the response never confirms which ids are real.
    passkey = db.query(models.WebAuthnCredential).filter(
        models.WebAuthnCredential.id == passkey_id,
        models.WebAuthnCredential.user_id == current_user.id,
    ).first()

    if passkey is None:
        raise HTTPException(status_code=404, detail="Passkey not found")

    db.delete(passkey)
    db.commit()
    return {"message": "Passkey removed"}
#webauthn Manage end
#end of webauthn