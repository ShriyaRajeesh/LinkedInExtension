
const WAIT_AFTER_OPEN = 5000;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start-scrape") {
        (async () => {
            const links = message.links;

            for (let i = 0; i < links.length; i++) {
                const url = links[i];
                let tab = null;

                try {
                    console.log(`Opening ${url} (${i + 1}/${links.length})`);

                    // Open tab as ACTIVE so LinkedIn loads everything
                    tab = await chrome.tabs.create({ url, active: true });

                    await chrome.tabs.update(tab.id, { active: true });
                    await new Promise(r => setTimeout(r, 1500));

                    // Force reload to trigger LinkedIn dynamic rendering
                    await chrome.tabs.reload(tab.id);
                    await new Promise(r => setTimeout(r, WAIT_AFTER_OPEN));

                    // EXECUTE SCRAPER
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: scrapeLinkedInProfile
                    });

                    const scraped = results?.[0]?.result;

                    if (!scraped) {
                        console.warn("No data scraped for", url);
                    } else {
                        scraped.url = url;
                    }

                    const { linkedin_api_url } = await chrome.storage.local.get("linkedin_api_url");
                    const API_URL = linkedin_api_url || "http://localhost:3000/api/profiles";

                    try {
                        const resp = await fetch(API_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(scraped)
                        });

                        const body = await resp.json();
                        console.log("Posted result for", url, body);
                    } catch (err) {
                        console.error("Failed to POST to API", err);
                    }

                } catch (err) {
                    console.error("Scraping error for", url, err);
                } finally {
                    try {
                        const tabs = await chrome.tabs.query({ url: url + "*" });
                        for (const t of tabs) {
                            if (t && !t.discarded) {
                                await chrome.tabs.remove(t.id).catch(() => { });
                            }
                        }
                    } catch (e) {
                        try {
                            if (tab && tab.id) {
                                await chrome.tabs.remove(tab.id).catch(() => { });
                            }
                        } catch (e2) { }
                    }

                    await new Promise(r => setTimeout(r, 800));
                }
            }

            console.log("All links processed.");
        })();

        sendResponse({ ok: true });
        return true;
    }
});



async function scrapeLinkedInProfile() {

    for (let y of [0, 400, 800, 1200, 1600, 2000, 2400]) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 600));
}

    function waitForElement(selectors, timeout = 10000) {
        return new Promise(resolve => {
            const start = Date.now();
            const check = () => {
                for (const sel of selectors) {
                    if (document.querySelector(sel)) {
                        return resolve(true);
                    }
                }
                if (Date.now() - start >= timeout) return resolve(false);
                requestAnimationFrame(check);
            };
            check();
        });
    }

    await waitForElement([
        "h1.text-heading-large",
        ".text-body-medium.break-words",
        "span.pvs-entity__caption-wrapper",
        "li.text-body-small span.t-black--light",
        "span.text-body-small.inline.t-black--light"
    ]);

    function getTextBySelectors(selectors) {
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.innerText && el.innerText.trim().length > 0) {
                return el.innerText.trim();
            }
        }
        return "";
    }

    const name = getTextBySelectors([
        "h1.text-heading-large",
        ".pv-text-details__left-panel h1",
        "h1"
    ]);

    const bioLine = getTextBySelectors([
        ".text-body-medium.break-words",
        ".pv-text-details__left-panel .text-body-medium"
    ]);

    const location = getTextBySelectors([
        "span.text-body-small.inline.t-black--light.break-words",
        "span.text-body-small.inline.t-black--light"
    ]);

    
    function extractAbout() {
        const aboutSpan = document.querySelector(
            "section[id='about'] span[aria-hidden='true'], div.inline-show-more-text--is-collapsed span[aria-hidden='true']"
        );
        
        return aboutSpan ? aboutSpan.innerText.trim() : "";
    }

    const about = extractAbout();
    const bio = about.split("\n")[0] || "";



    let followerCount = "";
    try {
        const followersEl = document.querySelector("span.pvs-entity__caption-wrapper");
        if (followersEl && followersEl.innerText.toLowerCase().includes("followers")) {
            const match = followersEl.innerText.match(/([0-9.,Kk+]+)/);
            if (match) followerCount = match[1];
        }
    } catch { }

    let connectionCount = "";
    try {
        const connEl = document.querySelector("li.text-body-small span.t-black--light");
        if (connEl && connEl.innerText.toLowerCase().includes("connection")) {
            const bold = connEl.querySelector("span.t-bold");
            if (bold) connectionCount = bold.innerText.trim();
        }
    } catch { }

    return {
        name,
        bioLine,
        location,
        about,
        bio,
        followerCount,
        connectionCount
    };
}

