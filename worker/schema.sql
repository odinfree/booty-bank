CREATE TABLE IF NOT EXISTS waitlist_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at
  ON waitlist_signups(created_at);
