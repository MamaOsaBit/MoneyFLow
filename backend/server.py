from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Personal & Shared Finance Tracker")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security setup
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Models
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ExpenseCreate(BaseModel):
    amount: float
    date: datetime
    category: str
    type: str  # "personal" or "shared"
    description: Optional[str] = None
    shared_with: Optional[List[str]] = []  # List of user IDs for shared expenses

class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    date: datetime
    category: str
    type: str
    description: Optional[str] = None
    shared_with: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SharedGroupCreate(BaseModel):
    name: str
    member_emails: List[str]

class SharedGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    creator_id: str
    members: List[str] = []  # List of user IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DashboardStats(BaseModel):
    personal_total: float
    shared_total: float
    total_expenses: float
    monthly_breakdown: Dict[str, Dict[str, float]]
    category_breakdown: Dict[str, float]

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user_doc = await db.users.find_one({"id": user_id})
    if user_doc is None:
        raise credentials_exception
    
    return User(**user_doc)

# Authentication routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(email=user_data.email, name=user_data.name)
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc or not verify_password(login_data.password, user_doc["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = User(**user_doc)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user)

# User routes
@api_router.get("/users/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/users/search")
async def search_users(email: str, current_user: User = Depends(get_current_user)):
    """Search users by email for invitations"""
    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        return {"found": False}
    
    user = User(**user_doc)
    return {"found": True, "user": {"id": user.id, "email": user.email, "name": user.name}}

# Expense routes
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    expense = Expense(user_id=current_user.id, **expense_data.dict())
    await db.expenses.insert_one(expense.dict())
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def get_user_expenses(current_user: User = Depends(get_current_user)):
    expenses_cursor = db.expenses.find({
        "$or": [
            {"user_id": current_user.id},
            {"shared_with": current_user.id}
        ]
    }).sort("date", -1)
    expenses = await expenses_cursor.to_list(1000)
    return [Expense(**expense) for expense in expenses]

@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str, current_user: User = Depends(get_current_user)):
    expense_doc = await db.expenses.find_one({
        "id": expense_id,
        "$or": [
            {"user_id": current_user.id},
            {"shared_with": current_user.id}
        ]
    })
    if not expense_doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    return Expense(**expense_doc)

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    # Only allow owner to update
    expense_doc = await db.expenses.find_one({"id": expense_id, "user_id": current_user.id})
    if not expense_doc:
        raise HTTPException(status_code=404, detail="Expense not found or not authorized")
    
    update_data = expense_data.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.expenses.update_one({"id": expense_id}, {"$set": update_data})
    
    updated_expense_doc = await db.expenses.find_one({"id": expense_id})
    return Expense(**updated_expense_doc)

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: User = Depends(get_current_user)):
    # Only allow owner to delete
    result = await db.expenses.delete_one({"id": expense_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found or not authorized")
    return {"message": "Expense deleted successfully"}

# Dashboard routes
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get all expenses for the user (owned or shared)
    expenses_cursor = db.expenses.find({
        "$or": [
            {"user_id": current_user.id},
            {"shared_with": current_user.id}
        ]
    })
    expenses = await expenses_cursor.to_list(1000)
    
    personal_total = 0.0
    shared_total = 0.0
    monthly_breakdown = {}
    category_breakdown = {}
    
    for expense_doc in expenses:
        expense = Expense(**expense_doc)
        amount = expense.amount
        
        # Calculate totals
        if expense.type == "personal":
            personal_total += amount
        else:  # shared
            if expense.user_id == current_user.id:
                # User created this shared expense
                shared_total += amount
            else:
                # User is part of this shared expense
                # For simplicity, we'll divide by number of people sharing
                share_count = len(expense.shared_with) + 1  # +1 for the creator
                shared_total += amount / share_count
        
        # Monthly breakdown
        month_key = expense.date.strftime("%Y-%m")
        if month_key not in monthly_breakdown:
            monthly_breakdown[month_key] = {"personal": 0.0, "shared": 0.0}
        
        if expense.type == "personal":
            monthly_breakdown[month_key]["personal"] += amount
        else:
            if expense.user_id == current_user.id:
                monthly_breakdown[month_key]["shared"] += amount
            else:
                share_count = len(expense.shared_with) + 1
                monthly_breakdown[month_key]["shared"] += amount / share_count
        
        # Category breakdown
        if expense.category not in category_breakdown:
            category_breakdown[expense.category] = 0.0
        
        if expense.type == "personal" or expense.user_id == current_user.id:
            category_breakdown[expense.category] += amount
        else:
            share_count = len(expense.shared_with) + 1
            category_breakdown[expense.category] += amount / share_count
    
    return DashboardStats(
        personal_total=personal_total,
        shared_total=shared_total,
        total_expenses=personal_total + shared_total,
        monthly_breakdown=monthly_breakdown,
        category_breakdown=category_breakdown
    )

# Shared groups routes
@api_router.post("/shared-groups", response_model=SharedGroup)
async def create_shared_group(group_data: SharedGroupCreate, current_user: User = Depends(get_current_user)):
    # Find users by email
    member_ids = [current_user.id]  # Creator is always a member
    
    for email in group_data.member_emails:
        user_doc = await db.users.find_one({"email": email})
        if user_doc and user_doc["id"] != current_user.id:
            member_ids.append(user_doc["id"])
    
    group = SharedGroup(
        name=group_data.name,
        creator_id=current_user.id,
        members=member_ids
    )
    
    await db.shared_groups.insert_one(group.dict())
    return group

@api_router.get("/shared-groups", response_model=List[SharedGroup])
async def get_user_shared_groups(current_user: User = Depends(get_current_user)):
    groups_cursor = db.shared_groups.find({"members": current_user.id})
    groups = await groups_cursor.to_list(1000)
    return [SharedGroup(**group) for group in groups]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()