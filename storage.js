async function getApiKey() {
    const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
    return geminiApiKey || '';
}

async function setApiKey(key) {
    await chrome.storage.sync.set({ geminiApiKey: key });
}

window.Store = { getApiKey, setApiKey };


