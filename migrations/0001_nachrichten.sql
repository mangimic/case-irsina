-- Eingegangene Anfragen aus dem Kontaktformular.
--
-- Anlegen:
--   npx wrangler d1 create irsina
--   npx wrangler d1 execute irsina --remote --file migrations/0001_nachrichten.sql
CREATE TABLE IF NOT EXISTS nachrichten (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT,
  email       TEXT NOT NULL,
  nachricht   TEXT NOT NULL,
  -- Kennung des Objekts, falls die Anfrage von einer Objektseite kam.
  objekt      TEXT,
  -- Sprache, in der gefragt wurde — die Antwort sollte dieselbe treffen.
  sprache     TEXT,
  eingegangen TEXT NOT NULL,
  gelesen     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS nachrichten_eingegangen ON nachrichten (eingegangen DESC);
