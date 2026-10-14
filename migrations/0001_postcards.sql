-- Visitor postcards. Only text and the id of the chosen picture are stored.
CREATE TABLE postcards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sender     TEXT    NOT NULL,
  note       TEXT    NOT NULL,
  image      TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  hidden     INTEGER NOT NULL DEFAULT 0,
  -- one-way hash of the sender's IP, used only to rate-limit; cleared after a day
  ip_hash    TEXT
);
CREATE INDEX postcards_visible ON postcards (hidden, created_at DESC);
CREATE INDEX postcards_ip ON postcards (ip_hash, created_at);
