from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

# Carga variables de entorno desde .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Conexión a MongoDB usando motor (asíncrono)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Inicializa la aplicación FastAPI
app = FastAPI(title="Personal & Shared Finance Tracker")

# Crea un router para agrupar rutas bajo /api
api_router = APIRouter(prefix="/api")

# Configuración de seguridad y JWT
security = HTTPBearer()  # Autenticación tipo Bearer (JWT)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")  # Hash de contraseñas
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ------------------- MODELOS DE DATOS -------------------

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    language: Optional[str] = "en"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    language: str = "en"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class ExpenseCreate(BaseModel):
    amount: float
    date: datetime
    category: str
    type: str  # "personal" o "shared"
    description: Optional[str] = None
    shared_with: Optional[List[str]] = []  # IDs de usuarios para gastos compartidos

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
    members: List[str] = []  # IDs de usuarios
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DashboardStats(BaseModel):
    personal_total: float
    shared_total: float
    total_expenses: float
    monthly_breakdown: Dict[str, Dict[str, float]]
    category_breakdown: Dict[str, float]

# ------------------- FUNCIONES AUXILIARES -------------------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def mongo_to_user(user_doc: dict) -> User:
    """Convierte un documento de Mongo a un objeto User eliminando _id y password."""
    user_doc = dict(user_doc)  # copia
    user_doc.pop("_id", None)
    user_doc.pop("password", None)
    return User(**user_doc)

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
    if not user_doc:
        raise credentials_exception
    
    return mongo_to_user(user_doc)

# ------------------- RUTAS DE AUTENTICACIÓN -------------------

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user_data.password)
    user = User(email=user_data.email, name=user_data.name, language=user_data.language)
    user_dict = user.dict()
    user_dict["password"] = hashed_password

    await db.users.insert_one(user_dict)
    access_token = create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc or not verify_password(login_data.password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    
    user = mongo_to_user(user_doc)
    access_token = create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return Token(access_token=access_token, token_type="bearer", user=user)

# ------------------- RUTAS DE USUARIO -------------------

@api_router.get("/users/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/users/me", response_model=User)
async def update_current_user(user_update: UserUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.users.update_one({"id": current_user.id}, {"$set": update_data})
        updated_user_doc = await db.users.find_one({"id": current_user.id})
        return mongo_to_user(updated_user_doc)
    return current_user

@api_router.get("/users/search")
async def search_users(email: str, current_user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        return {"found": False}
    return {"found": True, "user": {"id": user_doc["id"], "email": user_doc["email"], "name": user_doc["name"]}}

# ------------------- RUTAS DE GASTOS -------------------

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
    expense = Expense(user_id=current_user.id, **expense_data.dict())
    await db.expenses.insert_one(expense.dict())
    return expense

@api_router.get("/expenses", response_model=List[Expense])
async def get_user_expenses(current_user: User = Depends(get_current_user)):
    cursor = db.expenses.find({"$or": [{"user_id": current_user.id}, {"shared_with": current_user.id}]}).sort("date", -1)
    expenses = await cursor.to_list(1000)
    return [Expense(**e) for e in expenses]

@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str, current_user: User = Depends(get_current_user)):
    expense_doc = await db.expenses.find_one({"id": expense_id, "$or": [{"user_id": current_user.id}, {"shared_with": current_user.id}]})
    if not expense_doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    return Expense(**expense_doc)

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, expense_data: ExpenseCreate, current_user: User = Depends(get_current_user)):
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
    result = await db.expenses.delete_one({"id": expense_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found or not authorized")
    return {"message": "Expense deleted successfully"}

# ------------------- DASHBOARD -------------------

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    cursor = db.expenses.find({"$or": [{"user_id": current_user.id}, {"shared_with": current_user.id}]})
    expenses = await cursor.to_list(1000)
    personal_total = 0.0
    shared_total = 0.0
    monthly_breakdown = {}
    category_breakdown = {}
    for doc in expenses:
        exp = Expense(**doc)
        amt = exp.amount
        # Totales
        if exp.type == "personal":
            personal_total += amt
        else:
            if exp.user_id == current_user.id:
                shared_total += amt
            else:
                shared_total += amt / (len(exp.shared_with)+1)
        # Mes
        month = exp.date.strftime("%Y-%m")
        monthly_breakdown.setdefault(month, {"personal":0.0,"shared":0.0})
        if exp.type == "personal":
            monthly_breakdown[month]["personal"] += amt
        else:
            if exp.user_id == current_user.id:
                monthly_breakdown[month]["shared"] += amt
            else:
                monthly_breakdown[month]["shared"] += amt / (len(exp.shared_with)+1)
        # Categoría
        category_breakdown.setdefault(exp.category, 0.0)
        if exp.type=="personal" or exp.user_id==current_user.id:
            category_breakdown[exp.category] += amt
        else:
            category_breakdown[exp.category] += amt / (len(exp.shared_with)+1)
    return DashboardStats(personal_total=personal_total, shared_total=shared_total,
                          total_expenses=personal_total+shared_total,
                          monthly_breakdown=monthly_breakdown, category_breakdown=category_breakdown)

# ------------------- GRUPOS COMPARTIDOS -------------------

@api_router.post("/shared-groups", response_model=SharedGroup)
async def create_shared_group(group_data: SharedGroupCreate, current_user: User = Depends(get_current_user)):
    member_ids = [current_user.id]
    for email in group_data.member_emails:
        user_doc = await db.users.find_one({"email": email})
        if user_doc and user_doc["id"] != current_user.id:
            member_ids.append(user_doc["id"])
    group = SharedGroup(name=group_data.name, creator_id=current_user.id, members=member_ids)
    await db.shared_groups.insert_one(group.dict())
    return group

@api_router.get("/shared-groups", response_model=List[SharedGroup])
async def get_user_shared_groups(current_user: User = Depends(get_current_user)):
    cursor = db.shared_groups.find({"members": current_user.id})
    groups = await cursor.to_list(1000)
    return [SharedGroup(**g) for g in groups]

# ------------------- CONFIGURACIÓN FINAL -------------------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
