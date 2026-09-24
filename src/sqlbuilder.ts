//This is not a module, and is instead basically a helper :3
import Database from "better-sqlite3"
import fs from "fs"

const db = new Database("server.db");
fs.readdir("sqlsetup/", (err, files) => {
    if (err) throw err;
    files.forEach((file) => {
        db.prepare(fs.readFileSync("sqlsetup/" + file).toString()).run();
    })
    console.log("Database initialized");
})