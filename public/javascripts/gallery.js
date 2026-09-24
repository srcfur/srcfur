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
function setup_carousel(carousel){
    console.log(carousel);
    let startX = 0, startScroll = 0, dragging = false, moved = false;

    carousel.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;              // left button only
        dragging = true; moved = false;
        startX = e.clientX;
        startScroll = carousel.scrollLeft;
        carousel.setPointerCapture(e.pointerId);
        carousel.classList.add('dragging');
    });

    carousel.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 5) moved = true;
        carousel.scrollLeft = startScroll - dx;
    });

    const stop = () => { dragging = false; carousel.classList.remove('dragging'); };
    carousel.addEventListener('pointerup', stop);
    carousel.addEventListener('pointercancel', stop);
    carousel.addEventListener('click', (e) => { if (moved) e.preventDefault(); }, true);
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
        setup_carousel(post_preview_window.querySelector(".track"));
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