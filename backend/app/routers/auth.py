from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.household import Household
from ..models.meter import SmartMeter
from ..schemas.auth import UserCreate, UserLogin, UserOut, Token
from ..auth.security import hash_password, verify_password, create_access_token
from ..auth.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Create associated Household
    household = Household(
        name=f"{payload.full_name}'s Residence",
        address=payload.address or "124 Pine Crest Way",
        district=payload.district or "Green Valley District",
        occupants=payload.occupants or 3,
        property_type="Single-Family Home",
        has_garden=payload.has_garden if payload.has_garden is not None else True,
        daily_budget_liters=payload.daily_budget_liters or 450.0
    )
    db.add(household)
    db.flush()

    # Create Smart Meter for this household
    meter = SmartMeter(
        serial_number=f"MTR-{household.id:04d}-{payload.full_name[:3].upper()}",
        household_id=household.id,
        meter_model="AquaSense Ultrasonic-500",
        status="online",
        battery_level_pct=98.0
    )
    db.add(meter)
    db.flush()

    # Create User
    new_user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role or "resident",
        household_id=household.id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "role": new_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive."
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/demo-login", response_model=Token)
def demo_login(role: str = "resident", db: Session = Depends(get_db)):
    """Instant login endpoint for evaluation with pre-seeded demo accounts."""
    target_email = "resident@aquapulse.io" if role == "resident" else "admin@aquapulse.io"
    user = db.query(User).filter(User.email == target_email).first()
    
    if not user:
        # Fallback to any user with corresponding role
        user = db.query(User).filter(User.role == ("utility_admin" if role != "resident" else "resident")).first()
        if not user:
            # Fallback to first user in database
            user = db.query(User).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo database not yet initialized. Please seed the database."
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

