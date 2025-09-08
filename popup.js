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

    function buildContextSequential(sections, maxChars = 12000) {
        const picked = [];
        let used = 0;
        for (const s of sections) {
            const block = `### ${s.heading || 'Section'}\n\n${s.text}\n\n`;
            if (used + block.length > maxChars && picked.length) break;
            picked.push(block);
            used += block.length;
        }
        return picked.join('\n---\n');
    }

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
            const sections = await window.Page.getSectionsFromActiveTab();
            if (!sections.length) { answerBox.textContent = 'No readable content found on page.'; return; }

            const context = buildContextSequential(sections);
            const system = 'You are a helpful assistant. Use only the provided context to answer. If insufficient information exists, say so.';
            const user = `Context:\n\n${context}\n\n**User question**: ${question}`;

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


