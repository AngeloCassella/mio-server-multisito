# Server multisito

## Mac: sviluppo locale

Copia `.env.example` in `.env` soltanto se `.env` non esiste.
Mantieni HTTP_BIND_IP=127.0.0.1 e HTTP_PORT=8080.

```sh
docker compose up -d --build
```

Apri http://localhost:8080. Le password locali sono indipendenti da quelle del server.

## Oracle: produzione

Il server deve avere un certificato valido già emesso in `/etc/letsencrypt`.
In `.env` configura HTTP_BIND_IP=0.0.0.0, HTTP_PORT=80 e
PROJECT1_DOMAIN=ancservice.duckdns.org. Imposta password uniche al primo avvio.
Non cambiare le password di un database esistente modificando solo `.env`.

```sh
sudo docker compose -f docker-compose.yml -f docker-compose.production.yml config --quiet
sudo docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

Le porte pubbliche sono 80 e 443; MySQL e backend non pubblicano porte.
Nella console Oracle consenti TCP 80/443, mantenendo SSH.
Non installare Nginx sull'host: viene eseguito in Docker.

## Certificati

Certbot è installato sull'host. La webroot usata per emissione e rinnovi è
`/home/ubuntu/mio-server-multisito/frontends/progetto1`.
Mantieni questa cartella e la route HTTP `/.well-known/acme-challenge/` anche
quando sostituisci il frontend. Non cancellarle durante i deploy.

```sh
sudo install -m 750 scripts/reload-multisito /etc/letsencrypt/renewal-hooks/deploy/reload-multisito
sudo /etc/letsencrypt/renewal-hooks/deploy/reload-multisito
sudo certbot renew --dry-run
```

Il timer Certbot rinnova il certificato; l'hook ricarica Nginx dopo il rinnovo.
Certificati, chiavi private e `.env` restano sul server e non vanno in Git.

## Aggiornamenti

Sul server usa sempre entrambi i file Compose (anche per down o exec).
Non usare `down -v`: eliminerebbe i dati MySQL.
Prima di aggiornamenti al database esegui un backup; il volume non è un backup.
