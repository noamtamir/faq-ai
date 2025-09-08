async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

function extractSectionsInPage() {
    const textOf = (el) => (el.innerText || el.textContent || '').trim();
    const visible = (el) => !!(el.offsetParent !== null);

    const articleSelectors = [
        'article',
        '[role="article"]',
        '.post', '.doc', '.content', '.prose', '.markdown-body', '.Article', '.blog', '.entry'
    ];

    const candidates = Array.from(document.querySelectorAll(articleSelectors.join(',')))
        .filter(visible);

    let sections = [];
    const pushSection = (heading, body) => {
        const h = heading ? textOf(heading) : '';
        const b = textOf(body);
        const t = (h ? h + '\n\n' : '') + b;
        if (t.trim()) sections.push({ heading: h, text: b });
    };

    const containers = candidates.length ? candidates : [document.body];
    containers.forEach((root) => {
        // Group by headings where available
        const headingNodes = Array.from(root.querySelectorAll('h1,h2,h3'));
        if (headingNodes.length) {
            for (let i = 0; i < headingNodes.length; i++) {
                const start = headingNodes[i];
                const end = headingNodes[i + 1];
                const range = document.createRange();
                range.setStartAfter(start);
                if (end) range.setEndBefore(end); else range.setEndAfter(root);
                const div = document.createElement('div');
                div.appendChild(range.cloneContents());
                pushSection(start, div);
            }
        } else {
            pushSection(null, root);
        }
    });

    // Remove boilerplate areas
    sections = sections.filter(s => s.text && s.text.length > 60);
    return sections;
}

async function getSectionsFromActiveTab() {
    const tab = await getActiveTab();
    if (!tab || !tab.id) throw new Error('No active tab');
    const [{ result = [] } = {}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractSectionsInPage
    });
    return result;
}

window.Page = { getSectionsFromActiveTab };


