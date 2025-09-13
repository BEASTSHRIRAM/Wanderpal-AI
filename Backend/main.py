import os
import random, Request
from time import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import motor.motor_asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import requests
# Security and JWT imports
from passlib.context import CryptContext
from jose import JWTError, jwt

# --- Load environment variables ---
load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME")
SECRET_KEY = os.getenv("SECRET_KEY", "a_default_secret_key_for_development")  # Use a strong one in prod
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- Constants ---
OPENTRIPMAP_API_KEY = os.getenv("OPENTRIPMAP_API_KEY")
OPENTRIPMAP_BASE_URL = "https://api.opentripmap.com/0.1/en/"

# --- App setup ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database connection ---
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

# --- Security setup (Password hashing) ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)



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

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    notifications: Optional[dict] = None

class Token(BaseModel):
    access_token: str
    token_type: str
# --- API routes ---
@app.post("/signin", response_model=Token)
async def signin(data: SignInRequest):
    user = await db["users"].find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(data.password, user.get("password")):
        raise HTTPException(status_code=400, detail="Wrong password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- API routes ---
@app.post("/signup", response_model=Token)
async def signup(data: SignUpRequest):
    """Handles new user registration"""
    existing = await db["users"].find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = get_password_hash(data.password)
    user = data.dict()
    user["password"] = hashed_password
    user["notifications"] = {
        "deals": False,
        "recommendations": False,
        "bookingUpdates": False,
        "marketing": False,
    }
    user["created_at"] = int(time())

    await db["users"].insert_one(user)

    # Generate JWT token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user["email"]}, expires_delta=access_token_expires)

    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/profile/{email}")
async def get_user(email: str):
    """Fetch user profile by email"""
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.pop("password", None)
    user.pop("_id", None)
    return user


@app.put("/profile/{email}")
async def update_user(email: str, data: UserUpdateRequest):
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    await db["users"].update_one({"email": email}, {"$set": update_data})
    return {"message": "User updated successfully", "email": email}


@app.get("/users/{email}/trips")
async def get_user_trips(email: str):
    """Fetch trips for a user"""
    user = await db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    trips = await db["trips"].find({"user_email": email}).to_list(length=None)
    for trip in trips:
        trip.pop("_id", None)
    return {"trips": trips}

LANGFLOW_API_URL = f"https://api.langflow.astra.datastax.com/lf/d0c29d20-be53-4ac7-ac33-5f58ffdb76cf/api/v1/run/1a4bd38d-81ed-4dfe-8d19-ba12ee7f324a"
LANGFLOW_TOKEN = os.getenv("LANGFLOW_TOKEN").strip('"')  # Set this in your .env

@app.post("/api/langflow-chat")
async def langflow_chat(request: Request):
    """
    Proxy plain chat messages to Langflow API and return the response.
    Expects JSON: {"input_value": "user message"}
    """
    body = await request.json()
    payload = {
        "input_value": body.get("input_value", ""),  # The input value to be processed by the flow
        "output_type": "chat",  # Specifies the expected output format
        "input_type": "chat"  # Specifies the input format
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer "+os.getenv("LANGFLOW_TOKEN").strip('"')
    }
    try:
        response = requests.request("POST", LANGFLOW_API_URL, json=payload, headers=headers, timeout=1200)
        response.raise_for_status()  # Raise exception for bad status codes
        #response = requests.post(LANGFLOW_API_URL, json=payload, headers=headers)
        #response.raise_for_status()
        print(response)
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e), "detail": getattr(e, 'response', None) and e.response.text}




@app.get("/trending")
async def trending(lat: float, lon: float, radius: int = 30000):
    print(f"[DEBUG] Using OPENTRIPMAP_API_KEY: {OPENTRIPMAP_API_KEY}")
    url = f"{OPENTRIPMAP_BASE_URL}places/radius"
    params = {
        "apikey": OPENTRIPMAP_API_KEY,
        "radius": radius,
        "lon": lon,
        "lat": lat,
        "rate": 3,
        "format": "geojson",
        "limit": 10,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        print(f"[DEBUG] OpenTripMap /places/radius status: {resp.status_code}")
        print(f"[DEBUG] Response: {resp.text[:300]}")
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"OpenTripMap error: {resp.status_code} {resp.text[:200]}")
        data = resp.json()
    features = data.get("features")
    if not features:
        return {"trending": [], "message": "No trending places found for this location."}
    trending = []
    async with httpx.AsyncClient() as client:
        for feat in features:
            prop = feat.get("properties", {})
            xid = prop.get("xid")
            if not xid:
                continue
            detail_url = f"{OPENTRIPMAP_BASE_URL}places/xid/{xid}"
            detail_resp = await client.get(detail_url, params={"apikey": OPENTRIPMAP_API_KEY})
            print(f"[DEBUG] Detail {xid} status: {detail_resp.status_code}")
            if detail_resp.status_code != 200:
                continue
            detail = detail_resp.json()
            trending.append({
                "name": detail.get("name"),
                "kinds": detail.get("kinds"),
                "address": detail.get("address", {}),
                "preview": detail.get("preview", {}).get("source"),
                "wikipedia_extracts": detail.get("wikipedia_extracts", {}).get("text"),
                "otm": detail.get("otm"),
                "xid": xid
            })
    return {"trending": trending}
