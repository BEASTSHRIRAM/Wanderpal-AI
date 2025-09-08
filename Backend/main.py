from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

import motor.motor_asyncio
import os
from dotenv import load_dotenv

# Security and JWT imports
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt

# --- Environment Variable Loading ---
load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME")
# IMPORTANT: Generate a strong secret key for production!
# You can generate one using: openssl rand -hex 32
SECRET_KEY = os.getenv("SECRET_KEY", "a_default_secret_key_for_development")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


# --- Database Connection ---
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]


# --- Security Setup (Password Hashing) ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Verifies a plain password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Hashes a plain password."""
    return pwd_context.hash(password)


# --- JWT Helper Function ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- FastAPI App Initialization ---
app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# --- Pydantic Models ---
class SignInRequest(BaseModel):
    email: str
    password: str

class SignUpRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str


# --- API Endpoints ---
@app.post("/signin", response_model=Token)
async def signin(data: SignInRequest):
    """
    Handles user sign-in. Verifies credentials and returns a JWT.
    """
    if not (data.email and data.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    user = await db["users"].find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify the password against the hashed version in the DB
    if not verify_password(data.password, user.get("password")):
        raise HTTPException(status_code=400, detail="Wrong password")

    # Create the JWT access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/signup")
async def signup(data: SignUpRequest):
    """
    Handles new user registration. Hashes the password before storing.
    """
    if not (data.email and data.password):
        raise HTTPException(status_code=400, detail="Invalid data")

    existing = await db["users"].find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Hash the password before creating the user object
    hashed_password = get_password_hash(data.password)
    user = {"email": data.email, "password": hashed_password}

    await db["users"].insert_one(user)
    return {"message": "Sign up successful", "email": data.email}
