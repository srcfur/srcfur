import express from "express";
import * as frontend from "./frontend.js"
import * as api from "./api.js";
import cookieparser from "cookie-parser";
import * as fs from "fs";
import {loadPosters} from "./posthandler.js";

const app = express();

app.use(cookieparser());
app.use(express.static("public"));
app.use(frontend.router);
app.use("/api", api.router);

app.listen(process.env.PORT ?? 3000, ()=>{
    console.log("Server started on port: " + (process.env.PORT ?? 3000));
});

fs.readdir("views/templates", (err, files) => {
    if(err) throw err;
    import("pug").then((pug) => {
        let output = "const templates = {};\n";
        for (const file of files) {
            let itemname = file.split('.')[0];
            output += `templates.${itemname} = (function(){ ${pug.compileFileClient("views/templates/" + file, { name: itemname })} return ${itemname}; })()\n`;
        }
        output += "export default templates;\n";
        fs.writeFileSync("public/javascripts/templates.js", output);
    })
})

fs.mkdir("public/images/gallery", (err) => {});
fs.mkdir("public/images/thumbnails", (err) => {});

loadPosters();