async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

function extractSectionsInPage() {
    const textOf = (el) => (el.innerText || el.textContent || '').trim();
    const visible = (el) => !!(el.offsetParent !== null);

    // Selectors for elements to exclude (boilerplate, navigation, ads, etc.)
    const excludeSelectors = [
        'script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer',
        '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
        '.nav', '.navbar', '.menu', '.sidebar', '.footer', '.header',
        '.ad', '.ads', '.advertisement', '.promo', '.social', '.share',
        '.comments', '.cookie', '.popup', '.modal'
    ];

    // Remove excluded elements from consideration
    const cleanElement = (el) => {
        const clone = el.cloneNode(true);
        excludeSelectors.forEach(selector => {
            clone.querySelectorAll(selector).forEach(node => node.remove());
        });
        return clone;
    };

    // Score an element based on content quality heuristics
    const scoreElement = (el) => {
        const text = textOf(el);
        const textLength = text.length;
        if (textLength < 100) return 0;

        const paragraphs = el.querySelectorAll('p').length;
        const links = el.querySelectorAll('a').length;
        const linkDensity = textLength > 0 ? (links / (textLength / 100)) : 1;
        const commas = (text.match(/,/g) || []).length;

        // Higher score = better content
        let score = paragraphs * 5 + textLength / 10 + commas;
        // Penalize high link density (likely navigation)
        score -= linkDensity * 20;

        return Math.max(0, score);
    };

    // Try semantic article selectors first
    const articleSelectors = [
        'article',
        '[role="article"]',
        '[role="main"]',
        'main',
        '.post', '.doc', '.content', '.prose', '.markdown-body',
        '.Article', '.blog', '.entry', '.post-content', '.article-content'
    ];

    const candidates = Array.from(document.querySelectorAll(articleSelectors.join(',')))
        .filter(visible)
        .map(el => ({ el, score: scoreElement(cleanElement(el)) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

    // If no good candidates, find the best content container in the page
    let containers = [];
    if (candidates.length > 0) {
        containers = [candidates[0].el];
    } else {
        // Find all divs and score them
        const allDivs = Array.from(document.body.querySelectorAll('div'))
            .filter(visible)
            .map(el => ({ el, score: scoreElement(cleanElement(el)) }))
            .filter(item => item.score > 50)
            .sort((a, b) => b.score - a.score);

        if (allDivs.length > 0) {
            // Take top-scoring container
            containers = [allDivs[0].el];
        } else {
            // Last resort: use body
            containers = [document.body];
        }
    }

    let sections = [];
    const pushSection = (heading, body) => {
        const h = heading ? textOf(heading) : '';
        const cleanBody = cleanElement(body);
        const b = textOf(cleanBody);
        if (b.trim()) sections.push({ heading: h, text: b });
    };

    containers.forEach((root) => {
        const cleanRoot = cleanElement(root);

        // Group by headings where available
        const headingNodes = Array.from(cleanRoot.querySelectorAll('h1,h2,h3,h4'));
        if (headingNodes.length) {
            for (let i = 0; i < headingNodes.length; i++) {
                const start = headingNodes[i];
                const end = headingNodes[i + 1];
                const range = document.createRange();
                range.setStartAfter(start);
                if (end) range.setEndBefore(end); else range.setEndAfter(cleanRoot);
                const div = document.createElement('div');
                div.appendChild(range.cloneContents());
                pushSection(start, div);
            }
        } else {
            // No headings - extract paragraphs directly
            const paragraphs = Array.from(cleanRoot.querySelectorAll('p'))
                .filter(visible)
                .map(p => textOf(p))
                .filter(text => text.length > 40);

            if (paragraphs.length > 0) {
                sections.push({ heading: '', text: paragraphs.join('\n\n') });
            } else {
                // Absolute fallback - just get the text
                pushSection(null, cleanRoot);
            }
        }
    });

    // Remove very short sections (likely boilerplate)
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


