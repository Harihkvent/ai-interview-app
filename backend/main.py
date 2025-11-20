from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router
from database import create_db_and_tables

app = FastAPI(title="AI Interviewer")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "AI Interviewer API is running"}
