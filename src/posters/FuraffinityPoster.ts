import {ImageVersion, Post, PostStatus} from "../posthandler.js";
import fs from "fs";
import axios, {AxiosInstance} from "axios";
import * as cheerio from 'cheerio';
import {response} from "express";
import http2 from "http2";
import { setTimeout } from 'timers/promises';
/*
    For anyone else who may be looking for why their FA submission upload fails, FA is a stickler about having the www subdomain! If it's missing you'll get a 301, followed by 302 redirect!
*/

export const GetDestinationName = () => "FurAffinity";

async function UploadVersion(apiClient: AxiosInstance, post: Post, version: ImageVersion){
    //Get our submission key!
    const submission_page_response = await apiClient.get("submit/");
    const submission_cheerio = cheerio.load(submission_page_response.data);
    //Start our submission form
    let submissionUplod: FormData = new FormData();
    let key: string = submission_cheerio("form[id='myform']").find("input[name='key']").val() as string;
    submissionUplod.set('key', key);
    submissionUplod.set("submission_type", "submission"); //Not even sure if we need this, but I don't take chances!
    submissionUplod.append("submission", new Blob([fs.readFileSync(post.Versions[0].File)], { type: post.Versions[0].GetEncodingType() }), post.Versions[0].File.split('/')[post.Versions[0].File.split('/').length - 1])
    const upload_response = await apiClient.request({
        url: "/submit/upload",
        method: "POST",
        data: submissionUplod,
        headers: {
            Referer: 'https://www.furaffinity.net/submit/',
        },
        httpVersion: 2,
        withCredentials: true,
        validateStatus: (status) => status == 200 || status == 301 || status == 302
    });
    if(upload_response.status !== 302){
        console.log(upload_response);
        return new PostStatus(`Furaffinity returned code ${upload_response.status} in response to upload!`, false);
    }
    //Now we get our finalize form!
    const finalize_page = await apiClient.get("submit/finalize/");
    const finalize_cheerio = cheerio.load(finalize_page.data);
    key = finalize_cheerio("form[id='myform']").find("input[name='key']").val() as string;

    const ratingTranslate = [0,2,1]

    const finalizeForm: FormData = new FormData();
    finalizeForm.set('key', key);
    finalizeForm.set('cat', post.fa_category.toString()) //Set Category to Other during testing
    finalizeForm.set('atype', post.fa_theme.toString()) //Set Theme to ABDL
    finalizeForm.set('species', '1') //Set Species to Unspecified / Any
    finalizeForm.set("rating", ratingTranslate[post.Rating].toString()) //Set Rating to Adult (Mature = 2)

    finalizeForm.set('title', post.PostName)
    finalizeForm.set('message', post.PostDescription)

    let keywords: string = "";
    post.Tags.forEach(tag => { keywords += tag + " "})
    version.Tags.forEach(tag => { keywords += tag + " "})
    finalizeForm.set('keywords', keywords)

    const final_response = await apiClient.request({
        url: "/submit/finalize",
        method: "POST",
        data: finalizeForm,
        headers: {
            Referer: 'https://www.furaffinity.net/submit/',
        },
        httpVersion: 2,
        withCredentials: true,
        validateStatus: (status) => status == 200 || status == 301 || status == 302
    });
    if(final_response.status !== 302){
        console.log(upload_response);
        return new PostStatus(`Furaffinity returned code ${upload_response.status} in response to upload!`, false);
    }
    return new PostStatus("", true)
}

export const HandlePost= async (post: Post): Promise<PostStatus> => {
    try{
        const apiClient:AxiosInstance = axios.create({
            baseURL: "https://www.furaffinity.net",
            headers: {
                "Cookie": `b=${process.env.FA_COOKIE_B}; a=${process.env.FA_COOKIE_A};`,
                "Origin": "https://www.furaffinity.net",
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'
            }
        });
        for(let i = 0; i < post.Versions.length; i++){
            const status = await UploadVersion(apiClient, post, post.Versions[i]);
            if(!status.success){
                return status;
            }
            if(i != post.Versions.length - 1){
                //wait
                console.log("Waiting 20s, furaffinity rules :3");
                await setTimeout(20000);
            }
        }
        return new PostStatus("Success!", true);
    }catch(err){
        return new PostStatus(err as string, false);
    }
}