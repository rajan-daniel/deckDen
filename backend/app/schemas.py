from pydantic import BaseModel, EmailStr, Field
from typing import Literal

class UserCreate(BaseModel):
    """Shape of data we REQUIRE when someone signs up."""
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Shape of data we SEND BACK after creating a user — notice no password field."""
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True  # lets Pydantic read data straight off a SQLAlchemy model

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class DeckCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    game: Literal["Union Arena", "Yu-Gi-Oh!", "Pokemon"]
    format: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    is_public: bool = True

class DeckResponse(BaseModel):
    id: int
    name: str
    game: str
    format: str | None
    description: str | None
    is_public: bool
    owner_id: int

    class Config:
        from_attributes = True

class DeckSummaryResponse(DeckResponse):
    owner_username: str
    preview_image_url: str | None = None
    card_count: int = 0

class DeckUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    game: Literal["Union Arena", "Yu-Gi-Oh!", "Pokemon"] | None = None
    format: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    is_public: bool | None = None

class DeckCardCreate(BaseModel):
    card_name: str = Field(min_length=1, max_length=150)
    external_card_id: str | None = Field(default=None, max_length=150)
    image_url: str | None = Field(default=None, max_length=1000)
    quantity: int = Field(gt=0, le=99)
    category: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=500)

class DeckCardUpdate(BaseModel):
    card_name: str | None = Field(default=None, min_length=1, max_length=150)
    external_card_id: str | None = Field(default=None, max_length=150)
    image_url: str | None = Field(default=None, max_length=1000)
    quantity: int | None = Field(default=None, gt=0, le=99)
    category: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=500)

class DeckCardResponse(BaseModel):
    id: int
    deck_id: int
    card_name: str
    external_card_id: str | None
    image_url: str | None
    quantity: int
    category: str | None
    notes: str | None

    class Config:
        from_attributes = True

class DeckWithCardsResponse(DeckResponse):
    cards: list[DeckCardResponse] = Field(default_factory=list)

class UserSearchResult(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True