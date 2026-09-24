import * as pug from "pug";
import * as express from "express";
import {Router} from "express";
import {Request} from "express";
import * as sql from "./sql";

export const router: Router = express.Router();

interface GalleryQuery {
    page?: number;
}

router.get("/", (req, res) => {
    res.send(pug.renderFile("views/index.pug", { title: "Homepage" }));
})

router.get("/upload", (req, res) => {
    res.send(pug.renderFile("views/upload_portal.pug", { title: "Upload Portal" }));
})

router.get("/gallery", (req: Request<{}, {}, {}, GalleryQuery>, res) => {
    let page:number = req.query.page || 0;
    res.send(pug.renderFile("views/gallery.pug", { title: "Gallery" }));
})