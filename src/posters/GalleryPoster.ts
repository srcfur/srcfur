import {Post, PostStatus} from "../posthandler.js";
import {GalleryPostData} from "../sql.js";
import * as sql from "../sql.js";
import sharp from "sharp";

export const GetDestinationName = () => "Gallery";
export const HandlePost= async (post: Post): Promise<PostStatus> => {
    let gallerypost: GalleryPostData = sql.CreateGalleryPost(post.PostName, post.PostDescription);
    for(let i:number = 0; i < post.Versions.length; i++){
        sql.AppendImageToGalleryPostData(gallerypost, post.Versions[i].File.substring("public".length));
    }
    await sharp(post.Versions[0].File)
        .resize(256, 256)
        .toFile('public/images/thumbnails/' + gallerypost.id.toString() + ".jpg");
    return new PostStatus("Posted to gallery! I mean no one *should* see this anyways... This more stands as an error message in these!", true);
}