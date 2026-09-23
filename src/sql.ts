import Database from "better-sqlite3"
import fs from "fs"

export const database = new Database('server.db', {});
database.prepare(fs.readFileSync("sqlstatic/SetupTables.sql").toString()).run();