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

async function getStoredKey() {
    const { geminiApiKey } = await chrome.storage.sync.get('geminiApiKey');
    return geminiApiKey || '';
}

async function setStoredKey(key) {
    await chrome.storage.sync.set({ geminiApiKey: key });
}

// Using fixed model per requirements
const GEMINI_MODEL = 'gemini-2.0-flash';

async function* streamGeminiCompletion({ apiKey, system, user }) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(GEMINI_MODEL) + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(apiKey);
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: system },
                        { text: user }
                    ]
                }
            ],
            generationConfig: { temperature: 0.2 }
        })
    });
    if (!res.ok || !res.body) {
        let info = '';
        try { info = await res.text(); } catch (_) {}
        throw new Error('Gemini request failed: ' + (info || res.status + ' ' + res.statusText));
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = '';
    while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload) continue;
            try {
                const json = JSON.parse(payload);
                // Event schema: { candidates: [ { content: { parts: [ { text } ] } } ] }
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) yield text;
            } catch (_) {}
        }
    }
}

function wireUI() {
    const questionInput = document.getElementById('question');
    const submitBtn = document.getElementById('submit');
    const answerBox = document.getElementById('answer');

    // Use local marked-lite.js if loaded
    function renderMarkdown(md) {
        if (window.marked && typeof window.marked.parse === 'function') {
            return window.marked.parse(md);
        }
        return md;
    }

    async function onSubmit() {
        const question = (questionInput?.value || '').trim();
        answerBox.innerHTML = '';
        if (!question) {
            answerBox.textContent = 'Please enter a question.';
            return;
        }

        let apiKey = await getStoredKey();
        if (!apiKey) {
            apiKey = window.prompt('Enter your Gemini API key');
            if (!apiKey) {
                answerBox.textContent = 'No API key provided.';
                return;
            }
            await setStoredKey(apiKey);
        }


        try {
            const articles = await getArticleTextsFromActiveTab();
            if (!articles.length) {
                answerBox.textContent = 'No <article> content found on page.';
                return;
            }

            const context = articles.map((t, i) => `### Article ${i + 1}\n\n${t}`).join('\n\n---\n\n');
            const system = 'You are a helpful assistant. Use only the provided articles to answer. If insufficient information exists, say so.';
            const user = `Articles:\n\n${context}\n\n**User question**: ${question}\n\nAnswer with citations like [A1], [A2] referring to article indices when relevant.`;

            console.log('Sending to LLM:', { question, articlesCount: articles.length });

            let acc = '';
            for await (const token of streamGeminiCompletion({ apiKey, system, user })) {
                acc += token;
                answerBox.innerHTML = renderMarkdown(acc);
            }
        } catch (err) {
            console.error(err);
            answerBox.textContent = 'Error fetching answer. See console.';
        }
    }

    submitBtn?.addEventListener('click', onSubmit);
    questionInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
        }
    });
}

document.addEventListener('DOMContentLoaded', wireUI);