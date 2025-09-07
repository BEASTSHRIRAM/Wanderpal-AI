
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import motor.motor_asyncio
import os
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

app = FastAPI()

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

class SignInRequest(BaseModel):
	email: str
	password: str

class SignUpRequest(BaseModel):
	email: str
	password: str

#sign in page hemya
@app.post("/signin")
async def signin(data: SignInRequest):
	if data.email and data.password:
		return {"message": "Sign in successful", "email": data.email}
	raise HTTPException(status_code=400, detail="Invalid credentials")


#signup page hemya
@app.post("/signup")
async def signup(data: SignUpRequest):
	if not (data.email and data.password):
		raise HTTPException(status_code=400, detail="Invalid data")
	user = {"email": data.email, "password": data.password}
	existing = await db["users"].find_one({"email": data.email})
	if existing:
		raise HTTPException(status_code=400, detail="User already exists")
	await db["users"].insert_one(user)
	return {"message": "Sign up successful", "email": data.email}
