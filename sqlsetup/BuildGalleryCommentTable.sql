CREATE TABLE IF NOT EXISTS gallery_comment (
    comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    comment_content TEXT DEFAULT "",
    author_avatar TEXT DEFAULT "",
    author_name TEXT DEFAULT "",
    author_identifier TEXT DEFAULT ""
);