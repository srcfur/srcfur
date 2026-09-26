import * as express from "express";
import {Router} from "express";
import {Request} from "express";
import * as fluxer from "./fluxer.js";
import * as sql from "./sql.js";
import {FluxerRequest, FluxerUserCheck, FluxerUserInfo, GetUser} from "./fluxer.js";
import multer from "multer";
import {createRateLimiter} from "./ratelimiter.js";
import {GetAvailableDestinations, ImageVersion, Post, PostBuilder, PostStatus, UploadPost} from "./posthandler.js";

const PAGE_SIZE: number = 30;

export const router: Router = express.Router();

interface AuthorizationQuery {
    code?: string;
}

interface GalleryQuery {
    tags?: string;
}

const fluxer_ratelimit = createRateLimiter({api: "fluxer", max: 10})
const backend_ratelimiter = createRateLimiter({ api: "backend", max: 100 })

const galleryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/images/gallery/");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
})

router.get("/authorize", fluxer_ratelimit, (req: Request<{}, {}, {}, AuthorizationQuery>, res) => {
    if(req.query.code == undefined){
        res.status(401).end();
        return;
    }
    fluxer.GetAuth(req.query.code).then((result)=>{
        if(result.loggedin){
            res.cookie("fluxer_token", result.access_token);
            res.cookie("fluxer_refresh", result.refresh_token);
            res.redirect("/");
        }
    })
});

router.get("/account", fluxer_ratelimit, (req, res) => {
    if(req.cookies["fluxer_token"] == undefined){
        res.status(401).end();
        return;
    }
    fluxer.GetUser(req.cookies["fluxer_token"]).then((result)=>{
        res.send(result);
    })
})

//401 lacks fluxer token, or is not allowed to post!
router.post("/gallery/upload", backend_ratelimiter, multer({ storage: galleryStorage }).array("image", 9), (req, res) => {
    if(req.cookies["fluxer_token"] == undefined){
        res.status(401).end();
        return;
    }
    if(req.files == undefined || req.files.length == 0 || req.body.title == undefined || req.body.description == undefined ||
        req.body.destinations == undefined || req.body.versions == undefined || req.body.tags == undefined) {
        res.status(400).send("Missing arguments!").end();
        return;
    }
    if(!Array.isArray(req.body.versions)){ res.status(400).send("Versions is not an array!").end(); return; }
    if(req.files.length != req.body.versions.length) { res.status(400).send("File count not equal to version count?").end(); return;}
    GetUser(req.cookies["fluxer_token"]).then((profile)=>{
        if(profile == undefined){
            res.status(401).end();
            return;
        }
        if(!fluxer.IsUserAllowedToPost(profile as FluxerUserInfo)){
            res.status(401).end();
            return;
        }
        let dests: string[] = [];
        if(Array.isArray(req.body.destinations)){
            dests = req.body.destinations;
        }else{
            dests.push(req.body.destinations);
        }
        let builder: PostBuilder = new PostBuilder();
        builder.SetTitle(req.body.title);
        builder.SetDescription(req.body.description);
        (req.body.tags as string[]).forEach(tag=> builder.AddTag(tag));
        let fileArray: Express.Multer.File[] = req.files as any as Express.Multer.File[];
        for(let i:number = 0; i < fileArray.length; i++){
            let path: string = fileArray[i].path;
            let version: ImageVersion = new ImageVersion(path);
            let versionInfo = undefined;
            try {
                versionInfo = JSON.parse(req.body.versions[i] as string);
            }catch(err){
                res.status(400).send("Bad format json!").end();
                return;
            }
            (versionInfo.tags as string[]).forEach((tag:string) => version.Tags.add(tag));
            builder.AddVersion(version);
        }
        dests.forEach((dest) => {
            builder.AddDestination(dest);
        })
        UploadPost(builder.Pack()).then((result)=>{
            let didAllComplete:boolean = !result.values().some((value)=> !value.success);
            if(didAllComplete){
                res.status(200).end();
            }else{
                let toFix: { Destination: string, status: PostStatus }[] = [];
                result.forEach((status, key)=>{
                    toFix.push( { Destination: key, status: status } )
                })
                res.status(500).send(toFix).end(); //409 causes auto reupload, 500 but means 409
            }
        });
    })
})

router.get("/gallery/page/:id", createRateLimiter({max: 50}), (req: Request<{id:string}, {}, {}, {}>, res) => {
    if(Number.isNaN(req.params.id)){
        res.status(400).end();
        return;
    }
    let page:number = parseInt(<string>req.params.id);
    let postCount:number = sql.GetGalleryPostCount();
    let nextPagePresent: boolean = postCount - (page * PAGE_SIZE + PAGE_SIZE) > 0;
    let query:GalleryQuery = req.query as GalleryQuery;
    let tags: string[] = [];
    if(query.tags != undefined){
        query.tags.split(' ').forEach((tag:string) => tags.push(tag));
    }
    res.status(200).send({ posts: sql.GetGalleryPage(page, PAGE_SIZE, tags), hasNextPage: nextPagePresent }).end();
})

router.get("/gallery/post/:id", createRateLimiter({max: 50}), (req, res) => {
    if(Number.isNaN(req.params.id)){
        res.status(400).end();
        return;
    }
    let post:number = parseInt(<string>req.params.id);
    res.status(200).send({ images: sql.GetImagesFromGalleryPost(post), comments: sql.GetCommentsOnPost(post, true) })
})

router.post("/gallery/comment", multer({ storage: galleryStorage }).none(), createRateLimiter({ max: 10 }), async (req, res) => {
    let identifier: string = req.ip as string;
    let authorname: string = "Anonymous";
    let author_avatar: string = "/images/anonymous.webp";
    let scrub_ids: boolean = true;
    if(req.headers["CF-Connecting-IPv6"] != undefined) {
        identifier = req.headers["CF-Connecting-IPv6"].toString();
    }
    if(req.body.comment == undefined || req.body.post == undefined){
        res.status(400).end();
        return;
    }
    if(sql.IsIdentifierBanned(identifier)){
        res.status(401).end(); //Banned :3
        return;
    }
    //Finally wrap this try catch cause users will send FUCK SHIT somehow surely.
    try{
        const comment:string = req.body.comment;
        const targetpost:number = parseInt(<string>req.body.post)
        if(req.cookies["fluxer_token"] != undefined){
            let user:fluxer.FluxerUserInfo | undefined = await fluxer.GetUser(req.cookies["fluxer_token"]);
            if(user != undefined){
                identifier = user.id;
                authorname = user.global_name;
                author_avatar = "https://fluxerusercontent.com/avatars/" + user.id + "/" + user.avatar + ".webp?size=128"
                scrub_ids = !fluxer.IsUserAllowedToPost(user);
                //Check a second time, the first will always check ip. Second time will check if fluxer is banned!
                if(sql.IsIdentifierBanned(identifier)){
                    res.status(401).end(); //Banned :3
                    return;
                }
            }
        }
        sql.CreateCommentOnPost(targetpost, comment, authorname, author_avatar, identifier);
        res.status(201).send({comments: sql.GetCommentsOnPost(targetpost, scrub_ids) }).end();
    }catch(e){
        res.status(500);
        if(process.env.NODE_ENV !== 'production'){
            res.write(e);
        }
        res.end();
    }

})

router.get("/gallery/portalinfo", FluxerUserCheck, createRateLimiter({max: 50}), (req, res) => {
    if((req as FluxerRequest).fluxer_user == undefined){
        res.status(401).end();
    }
    res.status(200).send({ destinations: GetAvailableDestinations() }).end();
})