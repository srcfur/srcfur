import * as express from "express";
import {Router} from "express";
import {Request} from "express";
import * as fluxer from "./fluxer";



export const router: Router = express.Router();

interface AuthorizationQuery {
    code?: string;
}

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