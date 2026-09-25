import * as express from "express";
import {Router} from "express";
import {Request} from "express";
import * as fluxer from "./fluxer";
import * as sql from "./sql";
import {FluxerUserInfo, GetUser} from "./fluxer";
import multer = require("multer");
import {GalleryPostData} from "./sql";
import * as sharp from "sharp";
import {createRateLimiter} from "./ratelimiter";
import {Post, PostBuilder, UploadPost} from "./posthandler";

const PAGE_SIZE: number = 30;

export const router: Router = express.Router();

interface AuthorizationQuery {
    code?: string;
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
    if(req.files == undefined || req.files.length == 0 || req.body.title == undefined || req.body.description == undefined) {
        res.status(400).end();
        return;
    }
    GetUser(req.cookies["fluxer_token"]).then((profile)=>{
        if(profile == undefined){
            res.status(401).end();
            return;
        }
        if(!fluxer.IsUserAllowedToPost(profile as FluxerUserInfo)){
            res.status(401).end();
            return;
        }
        /*
        let post: GalleryPostData = sql.CreateGalleryPost(req.body.title, req.body.description);
        let fileArray: Express.Multer.File[] = req.files as any as Express.Multer.File[];
        for(let i:number = 0; i < fileArray.length; i++){
            console.log(fileArray[i]);
            let path: string = fileArray[i].path;
            sql.AppendImageToGalleryPostData(post, path.substring("public".length).replace('\\', '/'));
        }
         */
        let builder: PostBuilder = new PostBuilder();
        builder.SetTitle(req.body.title);
        builder.SetDescription(req.body.description);
        let fileArray: Express.Multer.File[] = req.files as any as Express.Multer.File[];
        for(let i:number = 0; i < fileArray.length; i++){
            console.log(fileArray[i]);
            let path: string = fileArray[i].path;
            builder.AddFile(path);
        }
        builder.AddDestination("Gallery");
        UploadPost(builder.Pack()).then((result)=>{
            if(result.success){
                res.status(200).end();
            }else{
                res.status(500).send(result.status).end();
            }
        });
    })
})

router.get("/gallery/page/:id", createRateLimiter({max: 50}), (req, res) => {
    if(Number.isNaN(req.params.id)){
        res.status(400).end();
        return;
    }
    let page:number = parseInt(<string>req.params.id);
    let postCount:number = sql.GetGalleryPostCount();
    let nextPagePresent: boolean = postCount - (page * PAGE_SIZE + PAGE_SIZE) > 0;
    res.status(200).send({ posts: sql.GetGalleryPage(page, PAGE_SIZE), hasNextPage: nextPagePresent }).end();
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
    if(req.body == undefined){
        res.status(400).end();
        return;
    }
    if(req.body.comment == undefined || req.body.post == undefined){
        res.status(400).end();
        return;
    }
    if(sql.IsIdentifierBanned(identifier)){
        res.status(401).end(); //Banned :3
        return;
    }
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
})