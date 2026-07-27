from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
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