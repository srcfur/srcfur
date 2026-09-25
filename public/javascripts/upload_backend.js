function upload_handler(){
    const form = document.querySelector("#UploadForm")
    const submitbutton = form.querySelector("#SubmitForm");

    submitbutton.addEventListener("click", function(e) {
        e.preventDefault();
        let data = new FormData(form);
        fetch("/api/gallery/upload", { method: "POST", body: data }).then(async response => {
            if(!response.ok){
                window.alert(response.status + ": " + await response.text());
                e.target.inert = false;
                return;
            }
            window.location.assign("/gallery");
        })
        e.target.inert = true;
    })
}

if(document.readyState == "loading"){
    document.addEventListener("DOMContentLoaded", upload_handler)
}else{
    upload_handler();
}