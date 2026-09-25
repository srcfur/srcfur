import {Post, PostStatus} from "../posthandler";
import {GalleryPostData} from "../sql";
import * as sql from "../sql";
import sharp from "sharp";

export const GetDestinationName = () => "Gallery";
export const HandlePost= async (post: Post): Promise<PostStatus> => {
    let gallerypost: GalleryPostData = sql.CreateGalleryPost(post.PostName, post.PostDescription);
    for(let i:number = 0; i < post.Files.length; i++){
        sql.AppendImageToGalleryPostData(gallerypost, post.Files[i].substring("public".length));
    }
    await sharp(post.Files[0])
        .resize(256, 256)
        .toFile('public/images/thumbnails/' + gallerypost.id.toString() + ".jpg");
    return new PostStatus("Posted to gallery! I mean no one *should* see this anyways... This more stands as an error message in these!", true);
}