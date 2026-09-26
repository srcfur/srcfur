import fs from "fs";
import Dict = NodeJS.Dict;

export class ImageVersion {
    File: string;
    Tags: Set<string>;
    constructor(file: string) {
        this.File = file;
        this.Tags = new Set();
    }
    GetEncodingType(): `${string}/${string}` {
        let encoding: `${string}/${string}` = "image/png";
        if(this.File.endsWith("jpg") || this.File.endsWith("jpeg"))
            encoding = "image/jpeg";
        return encoding;
    }
}

export class Post {
    PostName: string;
    PostDescription: string;
    Versions: ImageVersion[];
    Destinations: string[];
    Tags: Set<string>;
    constructor() {
        this.PostName = "Unnamed Post";
        this.PostDescription = "No description...";
        this.Versions = [];
        this.Destinations = [];
        this.Tags = new Set<string>();
    }
}
export class PostBuilder extends Post{
    SetTitle(name: string): PostBuilder {
        this.PostName = name;
        return this;
    }
    SetDescription(desc:string): PostBuilder {
        this.PostDescription = desc;
        return this;
    }
    AddVersion(version:ImageVersion): PostBuilder {
        this.Versions.push(version);
        return this;
    }
    AddDestination(dest: string): PostBuilder {
        this.Destinations.push(dest);
        return this;
    }
    AddTag(tag: string): PostBuilder {
        this.Tags.add(tag);
        return this;
    }
    Pack(): Post {
        return this as Post;
    }
}

export interface PostHandler {
    GetDestinationName(): string;
    HandlePost(post: Post): Promise<PostStatus>;
}

export class PostStatus {
    status: string;
    success: boolean;
    constructor(status: string, success: boolean) {
        this.status = status;
        this.success = success;
    }
}

class QueuedPost {
    Post: Post;
    NextDestination: number;
    UploadStatus: Map<string, PostStatus>;
    // Iterates to the next destination to post to
    async Next(): Promise<PostStatus> {
        //If this is really less, we're FUCKED
        if(this.Post.Destinations.length <= this.NextDestination){
            return new PostStatus("Finished upload destinations!", true);
        }
        const destination: string = this.Post.Destinations[this.NextDestination];
        const poster: PostHandler | undefined = getPosterByName(destination);
        if(poster === undefined){
            return new PostStatus(`Couldn't find destination ${destination}!`, false);
        }
        let status: PostStatus = await poster.HandlePost(this.Post);
        if(!status.success){
            return status;
        }
        this.NextDestination++;
        return new PostStatus("Success", true);
    }
    constructor(post: Post) {
        this.Post = post;
        this.NextDestination = 0;
        this.UploadStatus = new Map<string, PostStatus>();
        post.Destinations.forEach(dest => {
            this.UploadStatus.set(dest, new PostStatus("Not started!", false));
        })
    }
}

const allPosters: PostHandler[] = [];
function getPosterByName(posterName: string): PostHandler | undefined {
    for(let i = 0; i < allPosters.length; i++) {
        if(allPosters[i].GetDestinationName() == posterName){
            return allPosters[i];
        }
    }
    return undefined;
}

export const loadPosters = () => {
    fs.readdir("lib/posters", (err, files) => {
        if(err) throw err;
        files.forEach(async file => {
            if(file.endsWith(".map")){
                return;
            }
            file = file.split('.')[0];
            let poster: PostHandler = await import(`./posters/${file}`);
            console.log(`Loaded Poster: ${poster.GetDestinationName()}`);
            allPosters.push(poster);
        })
    })
}

export const GetAvailableDestinations = (): string[] => {
    let array: string[] = [];
    for(let i = 0; i < allPosters.length; i++) {
        array.push(allPosters[i].GetDestinationName());
    }
    return array;
}

export const UploadPost = async (post: Post): Promise<Map<string, PostStatus>> => {
    const queue: QueuedPost = new QueuedPost(post);
    while(queue.NextDestination < post.Destinations.length){
        queue.UploadStatus.set(post.Destinations[queue.NextDestination], await queue.Next());
    }
    return queue.UploadStatus;
}
