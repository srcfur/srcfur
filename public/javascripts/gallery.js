import templates from './templates.js';
function appendPage(page){
    let gallery = document.querySelector("#galleryBlock");
    fetch("/api/gallery/page/" + page).then(async (response)=>{
        if(!response.ok) {
            account_cache = response.status;
            return;
        }
        let posts = await response.json();
        for(let i = 0; i < posts.posts.length; i++){
            let template = document.createElement("template");
            template.innerHTML = templates.gallerypost(posts.posts[i]);
            setup_post_interaction(template.content.firstElementChild, posts.posts[i]);
            gallery.appendChild(template.content.firstElementChild);
        }
        if(posts.hasNextPage == true){
            appendPage(page + 1);
        }
    })
}
function buildGallery(){
    appendPage(0);
}
function buildPostPreview(context){
    //Our expanded context gets the images and comments and stats and what not :P
    //Basically expands the original context with the full post information!
    let expandedContext = context;
    document.querySelector("#galleryBlock").inert = true;

    fetch("/api/gallery/post/" + context.id).then(async (response)=>{
        if(!response.ok) {
            document.querySelector("#galleryBlock").inert = false;
            return;
        }
        let specialContext = await response.json();
        expandedContext = Object.assign({}, context, specialContext);
        console.log(specialContext);
        console.log(expandedContext);
        let template = document.createElement("template");
        template.innerHTML = templates.postpopup(expandedContext);
        const post_preview_window = template.content.firstElementChild;


        function clickOff(event){
            if (!post_preview_window.contains(event.target)) {
                post_preview_window.remove();
                document.querySelector("#galleryBlock").inert = false;
                document.removeEventListener('click', clickOff);
            }
        }
        document.addEventListener('click', clickOff);
        document.body.appendChild(template.content.firstElementChild);
    })
}
function setup_post_interaction(post, context){
    post.addEventListener("click", () => buildPostPreview(context));
}

if(document.readyState == "loading"){
    document.addEventListener("DOMContentLoaded", buildGallery)
}else{
    buildGallery();
}