import templates from './templates.js';
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
        data.append("tags[]", "srcfur");
        (form.querySelector("textarea[name='tags']").value).split(' ').forEach((tag) => {
            data.append("tags[]", tag)
        })
        form.querySelectorAll(".fileFrame").forEach(fileFrame => {
            let extra = {};
            extra.tags = fileFrame.querySelector("textarea[name='additional-tags']").value.split(' ');
            data.append("image", fileFrame.querySelector("input[name='image']").files[0]);
            data.append("versions[]", JSON.stringify(extra));
        })
        form.querySelectorAll("input[type=checkbox][name='destination']").forEach(destinationNode => {
            if(destinationNode.checked){
                data.append("destinations[]", destinationNode.target)
            }
        })
        data.set("rating", form.querySelector("select[name='rating']").value)
        data.set("fa_category", form.querySelector("select[name='fa_cat']").value)
        data.set("fa_theme", form.querySelector("select[name='fa_theme']").value)
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

function setFileCount(count){
    let fileNumberInput = document.querySelector("input[name='imagecount']");
    let fileSection = document.querySelector('#fileArea')
    while(fileSection.children.length > count){
        fileSection.children[fileSection.children.length - 1].remove()
    }
    while(fileSection.children.length < count){
        let template = document.createElement("template");
        template.innerHTML = templates.uploadportalfilefield({})
        const fileFrame = template.content.firstElementChild;
        const filePreview = fileFrame.querySelector("img[id='filePreview']");
        fileFrame.querySelector("input[name='image']").addEventListener("change", (ev)=>{
            filePreview.src = URL.createObjectURL(ev.target.files[0]);
            filePreview.onload = ()=>URL.revokeObjectURL(filePreview.src);
        })
        fileSection.appendChild(fileFrame);
    }
}

function bindNumberAlloc(){
    let fileNumberInput = document.querySelector("input[name='imagecount']");
    document.querySelector("input[name='imagecount']").addEventListener("change", (ev)=>setFileCount(ev.target.value));
    setFileCount(fileNumberInput.value);
}

if(document.readyState == "loading"){
    document.addEventListener("DOMContentLoaded", upload_handler)
    document.addEventListener("DOMContentLoaded", bindNumberAlloc)
}else{
    upload_handler();
    bindNumberAlloc();
}