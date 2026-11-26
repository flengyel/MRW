'use strict';
// The remote frame is a separate browsing context with no MRW command channel.
(() => {
  function validated(value) {
    if (!value || typeof value.name !== 'string' || !value.name || value.name.length > 200 ||
        !Array.isArray(value.origins) || typeof value.supported !== 'boolean') return undefined;
    try {
      const url = new URL(value.url);
      if (url.protocol !== 'https:' || url.username || url.password || !value.origins.includes(url.origin) ||
          value.origins.some(o => new URL(o).origin !== o || !/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/.test(o))) return undefined;
      return {...value, url:url.href};
    } catch { return undefined; }
  }
  function create({root, host, onBrowser, onReturn, onMode, initialMode='saved', originalLabel='Original page'}) {
    const shell = host || document.createElement('section');
    if (!host) root.before(shell);
    shell.className = 'source-reader'; shell.hidden = true;
    let config, frame, mode=initialMode;
    const title=document.createElement('p'),tabs=document.createElement('nav'),status=document.createElement('p'),area=document.createElement('div');
    title.className='source-location'; status.className='muted';tabs.setAttribute('aria-label','Original page or saved revision');
    for (const node of [title,tabs,status,area]) shell.append(node);
    function control(text,action,run) {
      const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.local='true';b.dataset.action=action;
      b.addEventListener('click',run);tabs.append(b);return b;
    }
    const original=control(originalLabel,'source-live',()=>show('live'));
    const saved=control('Saved text','source-saved',()=>show('saved'));
    const retry=control('Retry','source-retry',()=>{if(frame)frame.src=config.url;});
    control('Open in browser ↗','source-browser',()=>onBrowser?.(config.url));
    if(onReturn)control('Return to document','source-return',onReturn);
    function show(next,notify=true) {
      mode=next; root.hidden=mode==='live' && config?.supported;
      area.hidden=mode!=='live';retry.hidden=mode!=='live'||!config?.supported;
      original.setAttribute('aria-pressed',String(mode==='live'));saved.setAttribute('aria-pressed',String(mode==='saved'));
      if(mode==='live' && config?.supported) {
        if(!frame) {
          frame=document.createElement('iframe'); frame.className='source-original-page';
          frame.style.width='100%';frame.style.height='65vh';frame.style.border='1px solid var(--vscode-panel-border)';
          frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');
          frame.setAttribute('referrerpolicy','no-referrer');frame.title=config.name+' · current original page';
          frame.src=config.url;area.append(frame);
          frame.addEventListener('error',()=>{status.textContent='The page is unavailable or embedding is blocked. Retry, read Saved text, or Open in browser.';});
        }
        status.textContent='Current online page. Saved text and annotations remain bound to their retained revision. If this page cannot display, use Saved text or Open in browser.';
      } else if(mode==='live') status.textContent=config?.reason || 'This source does not support embedding. Use Saved text or Open in browser.';
      else status.textContent='Saved revision · '+(config?.revision || '')+' · offline reading and annotations';
      if(notify)onMode?.(mode);
    }
    return {
      update(value) {
        const next=validated(value);
        if(!next){shell.hidden=true;root.hidden=false;return;}
        if(!config || config.url!==next.url || config.sourceId!==next.sourceId) {
          frame?.remove();frame=undefined;
        }
        config=next;shell.hidden=false;title.textContent=config.name;show(mode,false);
      },
      show,
      fromFrame:event=>!!frame && event.source===frame.contentWindow,
      frame:()=>frame
    };
  }
  window.MRWSourceReader={create,validated};
})();
