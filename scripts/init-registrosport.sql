CREATE DATABASE IF NOT EXISTS registrosport CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Sostituire questa password prima di eseguire, senza salvare il file modificato in Git.
CREATE USER IF NOT EXISTS 'registrosport'@'%' IDENTIFIED BY 'SOSTITUIRE_PASSWORD';
GRANT SELECT, UPDATE ON registrosport.* TO 'registrosport'@'%';
CREATE TABLE IF NOT EXISTS registrosport.register_state (
 id TINYINT PRIMARY KEY, revision BIGINT NOT NULL DEFAULT 0, data JSON NOT NULL
);
INSERT IGNORE INTO registrosport.register_state VALUES (1,0,'{"classes":[],"records":{},"activities":{}}');
