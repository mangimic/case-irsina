-- Vermerk, ob die Absenderin eine Kopie ihrer Anfrage angefordert hat.
--
--   npx wrangler d1 execute irsina --remote --file migrations/0002_kopie.sql
--
-- Nicht zwingend: fehlt die Spalte, speichert der Worker die Anfrage ohne den
-- Vermerk, statt sie zu verlieren.
ALTER TABLE nachrichten ADD COLUMN kopie INTEGER NOT NULL DEFAULT 0;
