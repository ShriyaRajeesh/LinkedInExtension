document.getElementById('startBtn').addEventListener('click' , async()=>{
    const text = document.getElementById('links').value.trim();
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const status = document.getElementById('status');

    const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
    if(lines.length<3){
        status.innerText = 'Please Provide at least 3 LinkedIn Profile urls';
        return ; 

    }

    if(!apiUrl){
        status.innerText = 'Please set API URL'; 
        return 
    }
    chrome.storage.local.set({linkedin_api_url: apiUrl});
    status.innerText = `starting ${lines.length} links ...`;
    chrome.runtime.sendMessage({
        action :'start-scrape' , 
        links :lines }, (resp)=>{
            if(chrome.runtime.lastError){
                console.error(chrome.runtime.lastError)
                status.innerText='Failed to send message to background : '+ chrome.runtime.lastError.message;
                return ; 
            }

            status.innerText = 'Background started. Check extension console for progress.';

        })
})