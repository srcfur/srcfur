import * as sql from './sql.js'

export interface WebConfig {
    Revision: number;
    FA_TOKEN_A: string;
    FA_TOKEN_B: string;
    BLUESKY_HANDLE: string;
    BLUESKY_PASSWORD: string;
}

export function GetWebConfig(): WebConfig {
    let config: WebConfig =  sql.database.prepare("SELECT * FROM website_config ORDER BY Revision DESC LIMIT 1").get() as WebConfig;
    if(!config){
        sql.database.prepare("INSERT INTO website_config DEFAULT VALUES").run();
        config = GetWebConfig();
    }
    return config;
}

export function UpdateFuraffinityTokens(A: string, B: string){
    let config: WebConfig = GetWebConfig();
    sql.database.prepare("UPDATE website_config SET FA_TOKEN_A=?, FA_TOKEN_B=? WHERE Revision=?").run(A, B, config.Revision);
}

export function UpdateBlueskyInformation(Handle: string, Password: string){
    let config: WebConfig = GetWebConfig();
    sql.database.prepare("UPDATE website_config SET BLUESKY_HANDLE=?, BLUESKY_PASSWORD=? WHERE Revision=?").run(Handle, Password, config.Revision);
}