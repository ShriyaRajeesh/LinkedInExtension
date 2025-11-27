// =========================
// CONFIG
// =========================
const WAIT_AFTER_OPEN = 5000;

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start-scrape") {

        (async () => {
            const links = message.links;

            for (let i = 0; i < links.length; i++) {
                const url = links[i];
                let tab = null;

                try {
                    console.log(`Opening ${url} (${i + 1}/${links.length})`);

                    // 1️⃣ Open LinkedIn profile in ACTIVE mode
                    tab = await chrome.tabs.create({ url, active: true });

                    // 2️⃣ Bring tab to front
                    await chrome.tabs.update(tab.id, { active: true });
                    await sleep(1500);

                    // 3️⃣ Reload the page (LinkedIn lazy-loads content)
                    await chrome.tabs.reload(tab.id);
                    await sleep(WAIT_AFTER_OPEN);

                    // 4️⃣ Execute scraper inside the tab
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

                    // 5️⃣ Post to backend API
                    const { linkedin_api_url } = await chrome.storage.local.get("linkedin_api_url");
                    const API_URL = linkedin_api_url || "http://localhost:3000/api/profiles";

                    try {
                        const resp = await fetch(API_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(scraped)
                        });

                        console.log("Posted:", url, await resp.json());
                    } catch (err) {
                        console.error("POST failed", err);
                    }

                } catch (err) {
                    console.error("Scraping error:", url, err);
                }

                // 6️⃣ Close the tab
                await closeTabsByUrl(url);

                // 7️⃣ Small delay before next iteration
                await sleep(800);
            }

            console.log("All links processed.");
        })();

        sendResponse({ ok: true });
        return true;
    }
});

// Helper: Sleep / Delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Close all tabs matching url
async function closeTabsByUrl(url) {
    const tabs = await chrome.tabs.query({ url: url + "*" });
    for (const t of tabs) {
        try {
            if (!t.discarded) await chrome.tabs.remove(t.id);
        } catch { }
    }
}

// ===========================
// SCRAPER FUNCTION (runs inside tab)
// ===========================
async function scrapeLinkedInProfile() {

    // 1️⃣ Force lazy content to load (LinkedIn requires scroll)
    for (let y of [0, 400, 800, 1200, 1600, 2000, 2400]) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 600));
    }

    // 2️⃣ Wait for important elements to appear
    await waitForSelector([
        "h1.text-heading-large",
        ".text-body-medium.break-words",
        "span.pvs-entity__caption-wrapper",
        "li.text-body-small span.t-black--light",
        "span.text-body-small.inline.t-black--light"
    ]);

    // Small helper: get text using multiple selectors
    const pick = selectors => {
        for (const s of selectors) {
            const el = document.querySelector(s);
            if (el?.innerText?.trim()) return el.innerText.trim();
        }
        return "";
    };

    // Extract fields
    const name = pick(["h1.text-heading-large", ".pv-text-details__left-panel h1", "h1"]);
    const bioLine = pick([".text-body-medium.break-words", ".pv-text-details__left-panel .text-body-medium"]);
    const location = pick([
        "span.text-body-small.inline.t-black--light.break-words",
        "span.text-body-small.inline.t-black--light"
    ]);

    // ABOUT section extraction
    const about = extractAboutText();
    const bio = about.split("\n")[0] || "";

    // Followers
    let followerCount = "";
    try {
        const el = document.querySelector("span.pvs-entity__caption-wrapper");
        const match = el?.innerText?.match(/([0-9.,Kk+]+)/);
        followerCount = match ? match[1] : "";
    } catch { }

    // Connections
    let connectionCount = "";
    try {
        const el = document.querySelector("li.text-body-small span.t-black--light");
        const bold = el?.querySelector("span.t-bold");
        if (el?.innerText?.toLowerCase().includes("connection")) {
            connectionCount = bold?.innerText?.trim() || "";
        }
    } catch { }

    // Final scraped result
    return { name, bioLine, location, about, bio, followerCount, connectionCount };
}

// Wait until one of the selectors appears
function waitForSelector(selectors, timeout = 10000) {
    return new Promise(resolve => {
        const start = Date.now();
        const check = () => {
            if (selectors.some(sel => document.querySelector(sel))) return resolve(true);
            if (Date.now() - start >= timeout) return resolve(false);
            requestAnimationFrame(check);
        };
        check();
    });
}

// Extract ABOUT section text
function extractAboutText() {
    const el = document.querySelector(
        "section[id='about'] span[aria-hidden='true'], div.inline-show-more-text--is-collapsed span[aria-hidden='true']"
    );
    return el ? el.innerText.trim() : "";
}

// https://www.linkedin.com/in/aditya-negi-981849231/
// https://www.linkedin.com/in/kubermehta/
// https://www.linkedin.com/in/vartika-t-rao/
// https://www.linkedin.com/in/mohammad-anas-0aaa2a23b/
// https://www.linkedin.com/in/ayush-malviya-b53a47343/
// https://www.linkedin.com/in/kubermehta/