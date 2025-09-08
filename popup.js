function renderMarkdown(md) {
    if (window.marked && typeof window.marked.parse === 'function') {
        return window.marked.parse(md);
    }
    return md;
}

function setupUI() {
    const questionInput = document.getElementById('question');
    const submitBtn = document.getElementById('submit');
    const answerBox = document.getElementById('answer');

    async function onSubmit() {
        const question = (questionInput?.value || '').trim();
        answerBox.innerHTML = '';
        if (!question) {
            answerBox.textContent = 'Please enter a question.';
            return;
        }

        let apiKey = await window.Store.getApiKey();
        if (!apiKey) {
            apiKey = window.prompt('Enter your Gemini API key');
            if (!apiKey) { answerBox.textContent = 'No API key provided.'; return; }
            await window.Store.setApiKey(apiKey);
        }

        try {
            const articles = await window.Page.getArticleTextsFromActiveTab();
            if (!articles.length) { answerBox.textContent = 'No <article> content found on page.'; return; }

            const context = articles.map((t, i) => `### Article ${i + 1}\n\n${t}`).join('\n\n---\n\n');
            const system = 'You are a helpful assistant. Use only the provided articles to answer. If insufficient information exists, say so.';
            const user = `Articles:\n\n${context}\n\n**User question**: ${question}`;

            let acc = '';
            for await (const token of window.LLM.streamGeminiCompletion({ apiKey, system, user })) {
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
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(); }
    });
}

document.addEventListener('DOMContentLoaded', setupUI);


