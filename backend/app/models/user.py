import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="resident", nullable=False)  # resident, utility_admin
    is_active = Column(Boolean, default=True)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    household = relationship("Household", back_populates="residents")

