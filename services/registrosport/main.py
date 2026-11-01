import os, json, secrets
import pymysql
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel

app = FastAPI(docs_url=None, redoc_url=None)
security = HTTPBasic()
def auth(c: HTTPBasicCredentials = Depends(security)):
    if not (secrets.compare_digest(c.username.encode(), os.environ['ACCESS_USER'].encode()) and secrets.compare_digest(c.password.encode(), os.environ['ACCESS_PASSWORD'].encode())):
        raise HTTPException(401, headers={'WWW-Authenticate': 'Basic realm="Registro"'})
def connect():
    return pymysql.connect(host=os.environ['DB_HOST'], user=os.environ['DB_USER'], password=os.environ['DB_PASSWORD'], database=os.environ['DB_NAME'], charset='utf8mb4', autocommit=False)
class State(BaseModel):
    revision: int
    data: dict
@app.get('/auth', dependencies=[Depends(auth)])
def authenticated():
    return {'ok': True}
@app.get('/state', dependencies=[Depends(auth)])
def read():
    with connect() as db:
        with db.cursor() as c:
            c.execute('SELECT revision, data FROM register_state WHERE id=1')
            revision, data = c.fetchone()
    return {'revision': revision, 'data': json.loads(data)}
@app.put('/state', dependencies=[Depends(auth)])
def write(state: State):
    d = state.data
    if not isinstance(d.get('classes'), list) or not isinstance(d.get('records'), dict) or not isinstance(d.get('activities'), dict):
        raise HTTPException(422, 'Archivio non valido')
    with connect() as db:
        with db.cursor() as c:
            c.execute('UPDATE register_state SET data=%s, revision=revision+1 WHERE id=1 AND revision=%s', (json.dumps(d), state.revision))
            if c.rowcount != 1:
                raise HTTPException(409, 'Archivio modificato')
        db.commit()
    return {'revision': state.revision + 1}
