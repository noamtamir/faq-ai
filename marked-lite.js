(function(){
  // Minimal wrapper that exposes a global `marked.parse` using a very small subset
  // Fallback: if more features are needed, replace this file with the full marked build.
  function escapeHtml(str){
    return str
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function parse(md){
    // Extremely small markdown subset: headings, code blocks, lists, paragraphs, inline code, bold/italic, links
    const lines = md.split('\n');
    let html = '';
    let inCode = false;
    let codeBuf = [];
    let ulOpen = false;

    function closeUl(){ if (ulOpen){ html += '</ul>'; ulOpen = false; } }
    function flushCode(){
      if(inCode){
        html += '<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>';
        codeBuf = [];
        inCode = false;
      }
    }

    function formatInline(s){
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      s = s.replace(/`([^`]+)`/g,'<code>$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
      s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g,'<em>$1</em>');
      return s;
    }

    for(const raw of lines){
      const line = raw;
      if(line.startsWith('```')){ if(!inCode){ flushCode(); inCode = true; codeBuf=[]; } else { flushCode(); } continue; }
      if(inCode){ codeBuf.push(line); continue; }
      if(line.trim()===''){ closeUl(); html += '<br />'; continue; }
      if(/^[-*]\s+/.test(line)){ if(!ulOpen){ html += '<ul>'; ulOpen = true; } const c = line.replace(/^[-*]\s+/, ''); html += '<li>' + formatInline(escapeHtml(c)) + '</li>'; continue; } else { closeUl(); }
      const h = line.match(/^(#{1,6})\s+(.*)$/); if(h){ const lvl=h[1].length; html += `<h${lvl}>`+formatInline(escapeHtml(h[2]))+`</h${lvl}>`; continue; }
      html += '<p>' + formatInline(escapeHtml(line)) + '</p>';
    }

    closeUl();
    flushCode();
    return html;
  }

  window.marked = { parse };
})();


