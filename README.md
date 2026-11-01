# Server multisito

Un progetto nato per ospitare più siti web su un unico server Oracle Cloud, mantenendo una struttura ordinata e facile da ampliare.

Ogni sito ha il proprio frontend, realizzato con HTML, CSS e JavaScript, e può utilizzare un backend Python per gestire le operazioni e salvare i dati. Nginx riceve le richieste e le indirizza al sito e al servizio corretti in base al dominio.

I servizi vengono eseguiti in container Docker. Un unico servizio MySQL ospita database separati per le applicazioni, così ogni progetto conserva i propri dati anche quando i container vengono aggiornati o riavviati.

## Struttura

- `frontends/`: interfacce dei siti web.
- `services/`: backend e servizi delle applicazioni.
- `nginx/`: configurazioni per i domini e le connessioni HTTPS.
- `scripts/`: strumenti di supporto alla gestione del server.
- `docker-compose.yml`: definizione dei servizi condivisi e delle applicazioni.
- `docker-compose.production.yml`: configurazione aggiuntiva per la produzione.

La struttura permette di aggiungere nuovi siti affiancandoli a quelli esistenti, riutilizzando il server e i servizi comuni.

Le credenziali e le configurazioni private vengono gestite separatamente dal codice del progetto.
