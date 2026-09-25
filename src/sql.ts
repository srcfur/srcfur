import Database from "better-sqlite3"
import fs from "fs"

export interface GalleryPostData {
    id: number;
    post_date_iso: string;
    post_name: string;
    post_description: string;
}

export interface Comment {
    comment_id: number;
    post_id: number;
    author_name: string;
    author_avatar: string;
    comment_content: string,
    author_identifier: string;
}
if(process.env.DB_PATH == undefined){
    throw new Error("NO DATABASE_PATH SPECIFIED!")
}
export const database = new Database(process.env.DB_PATH, {});

fs.readdir("sqlsetup/", (err, files) => {
    if (err) throw err;
    files.forEach((file) => {
        database.prepare(fs.readFileSync("sqlsetup/" + file).toString()).run();
    })
    console.log("Database initialized");
})

export function CreateGalleryPost(PostName:string, PostDescription:string){
    let isoString = new Date(Date.now()).toISOString();
    let query =
        database.prepare("INSERT INTO gallery_posts(post_date_iso, post_name, post_description) VALUES (?, ?, ?) RETURNING *;");
    return query.get(isoString, PostName, PostDescription) as GalleryPostData;
}

export function AppendImageToGalleryPostData(Post: GalleryPostData, ImagePath: string){
    return AppendImageToGalleryPost(Post.id, ImagePath);
}

export function AppendImageToGalleryPost(PostID: number, ImagePath:string){
    let query = database.prepare("INSERT INTO gallery_image(post_id, image_path) VALUES (?, ?)");
    query.run(PostID.toString(), ImagePath);
}

export function GetGalleryPage(page:number, pagesize:number): GalleryPostData[] {
    let query =
        database.prepare("SELECT * FROM gallery_posts ORDER BY id DESC LIMIT ? OFFSET ?;");
    return query.all(pagesize, (page * pagesize)) as GalleryPostData[];
}

export function GetGalleryPostCount(){
    return (database.prepare("SELECT COUNT(*) FROM gallery_posts").get() as any)["COUNT(*)"] as number;
}

export function GetImagesFromGalleryPost(postId:number){
    let query =
        database.prepare("SELECT `image_path` FROM gallery_image WHERE post_id = ?;");
    return query.all(postId) as string[];
}

export function CreateCommentOnPost(postId: number, comment: string, authorname: string, authoravatar: string, identifier: string) {
    let query =
        database.prepare("INSERT INTO gallery_comment(comment_content, author_avatar, author_name, author_identifier, post_id) " +
            " VALUES (?, ?, ?, ?, ?) ");
    query.run(comment, authoravatar, authorname, identifier, postId);
}

//Can be scrubbed of it's identifier to hide IP addresses!!!
export function GetCommentsOnPost(postId: number, scrub:boolean){
    let query =
        database.prepare("SELECT * FROM gallery_comment WHERE post_id = ? ORDER BY comment_id DESC");
    let raw = query.all(postId) as Comment[];
    if(scrub)
        raw.forEach(comment => { comment.author_identifier = ""; })
    return raw;
}

export function IsIdentifierBanned(id:string){
    return (database.prepare("SELECT COUNT(*) FROM banned_identifiers WHERE identifier = ?").get(id) as any)["COUNT(*)"] as number > 0;
}