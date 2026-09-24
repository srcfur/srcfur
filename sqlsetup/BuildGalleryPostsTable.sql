CREATE TABLE IF NOT EXISTS gallery_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_date_iso TEXT NOT NULL,
    post_name TEXT DEFAULT "",
    post_description TEXT DEFAULT ""
);