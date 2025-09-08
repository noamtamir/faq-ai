const GEMINI_MODEL = 'gemini-2.0-flash';

async function* streamGeminiCompletion({ apiKey, system, user }) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(GEMINI_MODEL) + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(apiKey);
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                { role: 'user', parts: [ { text: system }, { text: user } ] }
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
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) yield text;
            } catch (_) {}
        }
    }
}

window.LLM = { streamGeminiCompletion };


