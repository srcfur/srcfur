import * as pug from "pug";
import * as express from "express";
import {Router} from "express";
import {Request} from "express";
import * as sql from "./sql";

export const router: Router = express.Router();

interface GalleryQuery {
    page?: number;
}

//https://web.canary.fluxer.app/oauth2/authorize?client_id=1552111823480696833&scope=identify+email&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauthorize&response_type=code
const loginLink = () => {
    let link = new URL("https://web.canary.fluxer.app/oauth2/authorize");
    link.searchParams.append("client_id", process.env.client_id);
    link.searchParams.append("scope", "identify+email");
    link.searchParams.append("redirect_uri", process.env.auth_url);
    link.searchParams.append("response_type", "code");
    return link;
}

router.get("/", (req, res) => {
    res.send(pug.renderFile("views/index.pug", { title: "Homepage", loginlink: loginLink() }));
})

router.get("/upload", (req, res) => {
    res.send(pug.renderFile("views/upload_portal.pug", { title: "Upload Portal", loginlink: loginLink() }));
})

router.get("/gallery", (req: Request<{}, {}, {}, GalleryQuery>, res) => {
    let page:number = req.query.page || 0;
    res.send(pug.renderFile("views/gallery.pug", { title: "Gallery", loginlink: loginLink() }));
})