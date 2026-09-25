function upload_handler(){
    const form = document.querySelector("#UploadForm")
    const submitbutton = form.querySelector("#SubmitForm");
    fetch("/api/gallery/portalinfo").then(async response => {
       if(!response.ok){
           window.alert(response.statusMessage);
           window.location.assign("/gallery");
           return;
       }
       let data = await response.json();
       let destArea = form.querySelector("#destinationArea");
       data.destinations.forEach(destination => {
            let container = document.createElement("div");
            let label = document.createElement("p");
            let checker = document.createElement("input");
            checker.type = "checkbox";
            checker.checked = (destination === "Gallery");
            checker.name = "destination";
            checker.target = destination;

            label.innerText = destination;
            container.appendChild(label)
            container.appendChild(checker);
            destArea.appendChild(container);
       })
    });
    submitbutton.addEventListener("click", function(e) {
        e.preventDefault();
        let data = new FormData();
        data.set("title", form.querySelector("input[name='title']").value);
        data.set("description", form.querySelector("textarea[name='description']").value);
        form.querySelectorAll("input[type=file][name='image']").forEach(file => {
            data.append("image", file.files[0]);
        })
        form.querySelectorAll("input[type=checkbox][name='destination']").forEach(destinationNode => {
            if(destinationNode.checked){
                data.append("destinations", destinationNode.target)
            }
        })
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