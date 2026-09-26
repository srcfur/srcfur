CREATE TABLE IF NOT EXISTS gallery_comment (
    comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    comment_content TEXT DEFAULT "",
    author_avatar TEXT DEFAULT "",
    author_name TEXT DEFAULT "",
    author_identifier TEXT DEFAULT ""
);
CREATE TABLE IF NOT EXISTS gallery_image (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    image_path TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gallery_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_date_iso TEXT NOT NULL,
    post_name TEXT DEFAULT "",
    post_description TEXT DEFAULT ""
);