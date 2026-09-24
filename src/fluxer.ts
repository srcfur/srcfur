import axios, {AxiosInstance} from "axios";

const apiClient:AxiosInstance = axios.create({
    baseURL: "https://api.fluxer.app/v1",
    headers: {
        "Content-Type": "multipart/form-data",
    }
});

export type FluxerUserInfo = {
    id: string,
    username: string,
    discriminator: string,
    global_name: string,
    avatar_url: string,
    verified: boolean,
}

export const GetAuth = async (authkey: string)=>{
    try{
        if(process.env.client_id === undefined || process.env.client_secret === undefined){
            throw new Error("No client secret provided");
        }
        const formdata = new FormData();
        formdata.append("client_id", process.env.client_id);
        formdata.append("client_secret", process.env.client_secret);
        formdata.append("code", authkey);
        formdata.append("grant_type", "authorization_code");
        formdata.append("redirect_uri", "http://localhost:3000/api/authorize");
        var response = await apiClient.post("oauth2/token", formdata);
        console.log(response);
        response.data.loggedin = true;
        return response.data;
    }catch(e){
        console.warn(e);
        return { loggedin: false };
    }
}

export const GetUser = async (bearer: string): Promise<FluxerUserInfo | undefined> =>{
    try{
        var response = await apiClient.get("oauth2/userinfo", { headers: {"Authorization": `Bearer ${bearer}` } });
        return response.data as FluxerUserInfo;
    }catch(e){
        console.warn(e);
        return undefined;
    }
}

export const IsUserAllowedToPost = function (user: FluxerUserInfo){
    return user.id == "1538680127993413632";
}