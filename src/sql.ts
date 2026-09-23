import Database from "better-sqlite3"
import fs from "fs"

export interface GalleryPostData {
    id: number;
    post_date_iso: string;
    post_name: string;
    post_description: string;
}

export const database = new Database('server.db', {});
export function CreateGalleryPost(PostName:string, PostDescription:string){
    let isoString = new Date(Date.now()).toISOString();
    let query =
        database.prepare("INSERT INTO gallery_posts(post_date_iso, post_name, post_description) VALUES ('" + isoString + "', '" + PostName + "', '" + PostDescription + "') " +
            "RETURNING *;");
    return query.get() as GalleryPostData;
}

export function AppendImageToGalleryPostData(Post: GalleryPostData, ImagePath: string){
    return AppendImageToGalleryPost(Post.id, ImagePath);
}

export function AppendImageToGalleryPost(PostID: number, ImagePath:string){
    let query =
        database.prepare("INSERT INTO gallery_image(post_id, image_path) VALUES (" + PostID.toString() + ", '" + ImagePath + "');");
    query.run();
}