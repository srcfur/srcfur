CREATE TABLE IF NOT EXISTS gallery_tags(
    postid INTEGER,
    tag TEXT,
    FOREIGN KEY (postid) REFERENCES gallery_posts(id)
);