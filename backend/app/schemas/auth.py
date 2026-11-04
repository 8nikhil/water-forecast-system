import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "resident" # resident or utility_admin
    occupants: Optional[int] = 3
    address: Optional[str] = "124 Pine Crest Way"
    district: Optional[str] = "Green Valley District"
    has_garden: Optional[bool] = True
    daily_budget_liters: Optional[float] = 450.0

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    household_id: Optional[int] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

Token.model_rebuild()
