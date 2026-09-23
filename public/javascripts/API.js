let account_cache = undefined;
fetch("/api/account").then((response) => {
    if(!response.ok) {
        account_cache = response.status;
        console.log(account_cache);
        return;
    }
    account_cache = response.json();
})

window.GetAccount = async function(){
    while(account_cache === undefined){
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return account_cache;
}