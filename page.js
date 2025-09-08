async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

function extractArticleTextsInPage() {
    const nodes = Array.from(document.querySelectorAll('article'));
    return nodes.map(n => (n.innerText || n.textContent || '').trim());
}

async function getArticleTextsFromActiveTab() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) throw new Error('No active tab');
    const [{ result = [] } = {}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractArticleTextsInPage
    });
    return result;
}

window.Page = { getArticleTextsFromActiveTab };


