import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Read DATABASE_URL from environment (supports Render, Railway Postgres or SQLite)
raw_database_url = os.getenv("DATABASE_URL", "sqlite:///./potion_pulse.db")

# 2. Fix Render / Railway Postgres URL scheme compatibility (postgres:// -> postgresql://)
if raw_database_url.startswith("postgres://"):
    database_url = raw_database_url.replace("postgres://", "postgresql://", 1)
else:
    database_url = raw_database_url

# 3. Configure engine based on database dialect
if database_url.startswith("sqlite"):
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False}
    )
else:
    # Postgres configuration with connection pooling for production
    engine = create_engine(
        database_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
