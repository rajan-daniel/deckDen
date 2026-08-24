from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt
import hashlib
import os
import secrets

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is not set. Generate one with "
        "`openssl rand -hex 32` and set it in your .env (local) or your "
        "hosting platform's environment variables (production)."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# CryptContext manages which hashing algorithm(s) we use.
# "bcrypt" is a well-established, slow-by-design algorithm — the slowness is
# intentional, it makes brute-force password guessing much harder.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Turns a plain-text password into a one-way hashed string to store in the DB."""
    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks a login attempt's password against the stored hash. Used later for login."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def generate_reset_token() -> str:
    """A high-entropy, one-time token to email to a user resetting their password."""
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """Unlike passwords, reset tokens are already random and high-entropy, so
    there's nothing for a slow hash like bcrypt to defend against here — and
    bcrypt's random salt would make an exact-match DB lookup impossible. A
    plain SHA-256 hash is the right tool: fast, deterministic, and still
    means a leaked database doesn't hand out usable reset links."""
    return hashlib.sha256(token.encode()).hexdigest()