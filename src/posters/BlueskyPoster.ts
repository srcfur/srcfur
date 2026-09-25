import {Post, PostStatus} from "../posthandler.js";
import sharp from "sharp";
import {Client} from '@atproto/lex'
import fs from "fs";
import {PasswordSession} from "@atproto/lex-password-session";
import * as com from "../lexicons/com.js";
import * as app from "../lexicons/app.js";

async function Authenticate(): Promise<Client> {
    const account: PasswordSession = await PasswordSession.login({
        service: "https://bsky.social",
        identifier: "dreadroblox.bsky.social",
        password: process.env.BSKY_PASSWORD as string,
    });
    return new Client(account);
}

class BlueskyPost {
    text: string;
    createdAt: string;
    embed: { $type: string; images: { image:any; alt: string; }[] }
    constructor(post:Post){
        this.text = post.PostName;
        this.createdAt = new Date(Date.now()).toISOString().replace("+00:00", "Z");
        this.embed = {
            $type: "app.bsky.embed.images",
            images: []
        }
    }
}

export const GetDestinationName = () => "Bluesky";
export const HandlePost= async (post: Post): Promise<PostStatus> => {
    try{
        const client: Client = await Authenticate();
        let bskypost: BlueskyPost = new BlueskyPost(post);
        for(let i = 0; i < post.Files.length; i++) {
            const file = post.Files[i];
            let enctype: `${string}/${string}` = "image/none";
            if(file.endsWith(".jpg") || file.endsWith(".jpeg")){
                enctype = "image/jpeg"
            }
            if(file.endsWith(".png")){
                enctype = "image/png"
            }
            if(enctype == "image/none"){
                console.warn(`Couldn't find type of ${file}`);
                continue;
            }
            const bytes = fs.readFileSync(file);
            const uploadRes = await client.call(com.atproto.repo.uploadBlob, bytes, {encoding: enctype})
            bskypost.embed.images.push({ image: uploadRes.blob, alt: "" })
        }
        // @ts-ignore
        const postResult = await client.create(app.bsky.feed.post, bskypost as any);
        console.log(`Posted: ${postResult.uri}`)
        return new PostStatus("Success", true);
    }catch(err){
        return new PostStatus(err as string, false);
    }
}