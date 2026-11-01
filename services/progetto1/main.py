import logging
import os

import pymysql
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Progetto 1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.environ["CORS_ORIGINS"].split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-test")
def db_test():
    try:
        with pymysql.connect(
            host=os.environ["DB_HOST"],
            port=int(os.environ.get("DB_PORT", "3306")),
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
            database=os.environ["DB_NAME"],
            connect_timeout=5,
            read_timeout=5,
            write_timeout=5,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()[0]
        return {"database": "connected", "result": result}
    except pymysql.MySQLError:
        logging.exception("Database connection failed")
        raise HTTPException(status_code=503, detail="Database non disponibile") from None
