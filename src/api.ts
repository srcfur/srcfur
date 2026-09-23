import * as express from "express";
import {Router} from "express";
import {Request} from "express";
import * as fluxer from "./fluxer";
import * as sql from "./sql";
import {GetUser} from "./fluxer";
import multer = require("multer");
import {GalleryPostData} from "./sql";
import * as sharp from "sharp";



export const router: Router = express.Router();

interface AuthorizationQuery {
    code?: string;
}

const galleryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/images/gallery/");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
})

router.get("/authorize", (req: Request<{}, {}, {}, AuthorizationQuery>, res) => {
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

router.get("/account", (req, res) => {
    if(req.cookies["fluxer_token"] == undefined){
        res.status(401).end();
        return;
    }
    fluxer.GetUser(req.cookies["fluxer_token"]).then((result)=>{
        res.send(result);
    })
})

//401 lacks fluxer token, or is not allowed to post!
router.post("/gallery/upload", multer({ storage: galleryStorage }).array("image", 9), (req, res) => {
    if(req.cookies["fluxer_token"] == undefined){
        res.status(401).end();
        return;
    }
    if(req.files.length == 0 || req.body.title == undefined || req.body.description == undefined) {
        res.status(400).end();
        return;
    }
    GetUser(req.cookies["fluxer_token"]).then((profile)=>{
        if(!fluxer.IsUserAllowedToPost(profile)){
            res.status(401).end();
            return;
        }
        let post: GalleryPostData = sql.CreateGalleryPost(req.body.title, req.body.description);
        // @ts-ignore
        for(let i:number = 0; i < req.files.length; i++){
            console.log(req.files[i]);
            let path: string = req.files[i].path;
            sql.AppendImageToGalleryPostData(post, path.substring("public".length).replace('\\', '/'));
        }
        sharp.default(req.files[0].path)
            .resize(256, 256)
            .toFile('public/images/thumbnails/' + post.id.toString() + ".jpg");
        res.status(201).send(post).end();
    })
})