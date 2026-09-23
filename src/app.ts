import express = require('express');
import * as frontend from "./frontend"
import * as api from "./api";
import cookieparser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cookieparser());

app.use(frontend.router);
app.use("/api", api.router);

app.listen(process.env.PORT == undefined ? 3000 : process.env.PORT, ()=>{
    console.log("Server started on port: " + (process.env.PORT == undefined ? 3000 : process.env.PORT));
});