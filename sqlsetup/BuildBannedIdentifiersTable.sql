CREATE TABLE IF NOT EXISTS banned_identifiers (
    identifier TEXT NOT NULL PRIMARY KEY,
    reason TEXT DEFAULT ""
);

