from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from time import time
import motor.motor_asyncio
import os
from dotenv import load_dotenv
import random
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
    first_name: str
    last_name: str
    phone: str
    email: str
    password: str
    location: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    notifications: Optional[dict] = None


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


@app.post("/signup", response_model=Token)
async def signup(data: SignUpRequest):
    """
    Handles new user registration. Hashes the password before storing and returns JWT token.
    """
    if not (data.first_name and data.last_name and data.phone and data.email and data.password):
        raise HTTPException(status_code=400, detail="All fields are required")

    existing = await db["users"].find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Hash the password before creating the user object
    hashed_password = get_password_hash(data.password)
    user = {
        "first_name": data.first_name,
        "last_name": data.last_name,
        "phone": data.phone,
        "email": data.email,
        "password": hashed_password,
        "location": data.location,
        "notifications": {
            "deals": True,
            "recommendations" : True,
            "bookingUpdates": True,
            "marketing": False,
        },
        "created_at": int(time())
    }
    
    await db["users"].insert_one(user)
    
    # Create the JWT access token for the new user
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/profile/{email}")
async def get_user(email: str):
    """
    Fetches user data by email for profile display.
    """
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove password from response for security
    user.pop("password", None)
    user.pop("_id", None)  # Remove MongoDB ObjectId
    
    return user

@app.put("/profile/{email}")
async def update_user(email: str, data: UserUpdateRequest):
    """
    Updates user profile information.
    """
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build update data, only include fields that were provided
    update_data = {}
    if data.first_name is not None:
        update_data["first_name"] = data.first_name
    if data.last_name is not None:
        update_data["last_name"] = data.last_name
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.email is not None:
        update_data["email"] = data.email
    if data.location is not None:
        update_data["location"] = data.location
    if data.notifications is not None:
        update_data["notifications"] = data.notifications
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Update the user in the database
    await db["users"].update_one({"email": email}, {"$set": update_data})
    
    return {"message": "User updated successfully", "email": email}

@app.get("/users/{email}/trips")
async def get_user_trips(email: str):
    """
    Fetches all trips for a specific user.
    """
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Fetch trips associated with this user
    trips = await db["trips"].find({"user_email": email}).to_list(length=None)
    
    # Remove MongoDB ObjectIds for clean JSON response
    for trip in trips:
        trip.pop("_id", None)
    
    return {"trips": trips}
