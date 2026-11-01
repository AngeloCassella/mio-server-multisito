# Registro Sport

Frontend in `frontends/registrosport`, API Python in `services/registrosport`.
MySQL conserva l'archivio JSON con revisione: scritture concorrenti vengono rifiutate,
non sovrascritte. Il browser controlla aggiornamenti ogni 10 secondi. Dopo un conflitto
esportare il backup delle modifiche locali e ricaricare. Non chiudere la pagina durante
un salvataggio. L'accesso usa le credenziali condivise REGISTRO_USER/REGISTRO_PASSWORD:
chi le possiede può leggere e modificare tutto il registro.

## Git dal Mac

```sh
git status
git add .gitignore docker-compose.yml nginx/nginx.conf nginx/nginx.production.conf .env.example frontends/registrosport services/registrosport scripts/init-registrosport.sql REGISTROSPORT.md
git commit -m "Aggiunge Registro Sport con API Python e archivio MySQL"
git push
```

## Server

1. Configurare DuckDNS `registrosport.duckdns.org` verso `80.225.83.123`.
   Consentire TCP 80 e 443 nel firewall Oracle e sul server.
2. Nella cartella del repository eseguire `git pull`. Integrare `.env` esistente con
   le quattro variabili REGISTRO di `.env.example`, usando password nuove e lunghe.
   Mantenere le credenziali MySQL e progetto1 già esistenti.
3. Fare un backup prima di modificare MySQL:

```sh
sudo docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -u root --all-databases --single-transaction' > backup-prima-registro.sql
chmod 600 backup-prima-registro.sql
```

Spostare il backup fuori dal repository e conservarlo in luogo protetto.

4. Copiare `scripts/init-registrosport.sql` in `/tmp/init-registrosport.sql`,
   proteggerlo con `chmod 600` e sostituire SOSTITUIRE_PASSWORD con esattamente
   REGISTRO_DB_PASSWORD (usare una password casuale alfanumerica per evitare escape SQL).
   Eseguirlo sul MySQL esistente; non serve ricreare il volume:

```sh
sudo docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root' < /tmp/init-registrosport.sql
```

Eliminare la copia temporanea contenente la password dopo l'importazione.
Lo script crea soltanto il nuovo database; non modifica quello del primo sito.
Se l'utente registrosport esiste già, CREATE USER non ne cambia la password.

5. Emettere il certificato prima di caricare la nuova configurazione HTTPS.
   Il comando seguente usa la porta 80 temporaneamente; causa una breve interruzione
   anche al primo sito. Il backend resta attivo.

```sh
sudo docker compose -f docker-compose.yml -f docker-compose.production.yml stop nginx
sudo certbot certonly --standalone -d registrosport.duckdns.org
sudo docker compose -f docker-compose.yml -f docker-compose.production.yml config --quiet
sudo docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
sudo docker compose -f docker-compose.yml -f docker-compose.production.yml exec nginx nginx -t
```

Se Certbot fallisce, riavviare la precedente configurazione Nginx prima di continuare.
Per i rinnovi configurare Certbot con webroot assoluta
`/home/ubuntu/mio-server-multisito/frontends/registrosport` (adattare al percorso reale):

```sh
sudo certbot reconfigure --cert-name registrosport.duckdns.org --webroot -w /home/ubuntu/mio-server-multisito/frontends/registrosport
sudo certbot renew --dry-run
```

Usare il deploy hook Nginx già descritto nel README. Verificare che ricarichi anche
il nuovo certificato. Visitare https://registrosport.duckdns.org e inserire le credenziali.
Creare una classe e verificarne la comparsa su un secondo dispositivo.

## Dati precedenti e backup

Prima di abbandonare il vecchio HTML esportare il suo backup JSON dal browser
che contiene i dati. Nel nuovo sito importare quel file con la funzione esistente.
Il nuovo sito non legge e non scrive localStorage. L'importazione sostituisce
l'archivio condiviso: farla una sola volta, senza altri dispositivi in modifica.
Per backup periodici usare mysqldump e conservarli fuori dal server.
Non eseguire `docker compose down -v`.

Il frontend mantiene le dipendenze CDN del file originale (Tailwind, icone e font).
I dati sono condivisi tra tutti gli accessi; non sono presenti account personali
né separazione per docente. La sincronizzazione automatica riguarda il registro;
riaprire le altre schede per aggiornare le rispettive viste.
