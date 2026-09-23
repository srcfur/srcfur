import * as pug from "pug";
import * as express from "express";
import {Router} from "express";

export const router: Router = express.Router();

router.get("/", (req, res) => {
    res.send(pug.renderFile("views/index.pug", { title: "Diapers :3" }));
})

router.get("/upload", (req, res) => {
    res.send(pug.renderFile("views/upload_portal.pug", { title: "Diapers :3" }));
})