import express = require('express');
import * as frontend from "./frontend"
import * as api from "./api";
import cookieparser from "cookie-parser";
import dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();
const app = express();

app.use(cookieparser());
app.use(express.static("public"));
app.use(frontend.router);
app.use("/api", api.router);

app.listen(process.env.PORT == undefined ? 3000 : process.env.PORT, ()=>{
    console.log("Server started on port: " + (process.env.PORT == undefined ? 3000 : process.env.PORT));
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
