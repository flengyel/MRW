'use strict';
// Downloaded prose enters textContent only. Only local KaTeX generates MathML.
// Each expression receives fresh macro state, bounded expansion and no trust.
(() => {
  function node(tag, parent, text, className) {
    const value = document.createElement(tag);
    if (text !== undefined) value.textContent = text;
    if (className) value.className = className;
    parent.append(value); return value;
  }
  function tokens(parent, values, action) {
    for (const value of values) {
      if (value.kind === 'mathml' || value.kind === 'svg') {
        const target=node('span',parent,undefined,value.kind==='svg'?'published-diagram':'published-math');
        try{window.MRWSourceRendering.render(target,value.text,value.kind);}
        catch(error){node('pre',target,'[Display unavailable at this location: '+error.message+'. Read exact HTML or open the original page.]','warning');}
      } else if (value.kind === 'anchor') {node('span',parent).dataset.sourceAnchor=value.name;
      } else if (value.kind === 'link') {
        const link=node('button',parent,value.label,'source-reference');link.type='button';
        link.title=value.url.startsWith('#')?'Follow this anchor in the retained source':'Open this source link in your browser';
        link.addEventListener('click',()=>action('source_link',value.url));
      } else if (value.kind === 'math') {
        const target = node(value.display ? 'div' : 'span', parent, undefined, 'published-math');
        try {
          window.katex.render(value.text, target, { output: 'mathml', displayMode: value.display,
            trust: false, strict: 'error', throwOnError: true, maxExpand: 1000,
            maxSize: 20, macros: {}, globalGroup: false });
        } catch (error) {
          target.textContent = value.text;
          node('span', parent, ' [Math display unavailable; exact TeX shown: ' + error.message + ']', 'warning');
        }
      } else if (value.kind === 'text') node('span', parent, value.text);
      else if (value.kind === 'raw') node('pre', parent, value.text);
      else if (value.kind === 'paragraph') { node('br', parent); node('br', parent); }
      else if (value.kind === 'reference') {
        if (!value.tag) node('span', parent, value.label + ' [unresolved source reference]', 'warning');
        else {
          const button = node('button', parent, (value.qualified_tag || value.tag) + (value.retained ? '' : ' ↗'), 'source-reference');
          button.type = 'button'; button.dataset.action = 'stacks-reference'; button.dataset.tag = value.qualified_tag || value.tag;
          button.title = value.retained ? 'Follow this explicit citation to the exact retained statement; works offline.'
            : 'External prerequisite: open its canonical source citation in your browser.';
          button.addEventListener('click', () => action(value.retained ? 'stacks_reference' : 'stacks_citation', value.qualified_tag || value.tag));
        }
      } else if (value.kind === 'list') {
        const list = node(value.ordered ? 'ol' : 'ul', parent);
        for (const item of value.items) tokens(node('li', list), item, action);
      } else if (value.kind === 'slogan') {
        const box = node('aside', parent, undefined, 'source-slogan');
        node('span', box, 'Source slogan: '); tokens(box, value.children, action);
      } else if (['em', 'strong', 'code', 'group'].includes(value.kind)) {
        tokens(node(value.kind === 'group' ? 'span' : value.kind, parent), value.children, action);
      } else node('pre', parent, '[Unsupported display fragment; open exact retained source.]', 'warning');
    }
  }
  function part(parent, published, action) {
    const box = node('div', parent, undefined, 'published-content');
    box.dataset.publishedPart = published.region;
    if (published.warning) node('p', box, 'Display limitation: ' + published.warning + '. Exact retained source is available below.', 'warning');
    tokens(box, published.tokens, action);
    const exact = node('details', parent);
    node('summary', exact, published.format === 'html' ? 'Exact retained HTML for this passage' : 'Exact retained TeX for this passage');
    node('pre', exact, published.exact_text);
  }
  function header(parent, value, action) {
    node('p', parent, [value.authors,value.source_name||value.chapter,value.section_number!=null?'Section '+value.section_number:null,value.qualified_tag||value.tag].filter(Boolean).join(' · '));
    node('p', parent, 'Published source structure and explicit citations; no complete dependency graph or mathematical verification is asserted.', 'muted');
    if (value.limitation) node('p', parent, 'Source retained only: ' + value.limitation + '. No generated regions are presented.', 'warning');
    const citation = node('button', parent, 'Open canonical source citation ↗');
    citation.type = 'button'; citation.dataset.action = 'stacks-citation';
    citation.title = 'Open today’s canonical page in the browser; the reader keeps its retained revision.';
    citation.addEventListener('click', () => action('stacks_citation', value.qualified_tag || value.tag));
    const backlinks = node('button', parent, 'Show backlinks…');
    backlinks.title = 'Find explicit citations to this qualified source in the selected notes folder.';
    backlinks.type = 'button'; backlinks.addEventListener('click', () => action('published_backlinks', value.qualified_tag));
    const details = node('details', parent);
    node('summary', details, 'Source revision, chapter context and license');
    node('p', details, value.source_file + (value.commit ? ' · Git ' + value.commit : ' · Page SHA-256 ' + value.source_revision) + ' · retrieved ' + value.retrieved_at);
    node('p', details, 'Retained SHA-256 ' + value.source_revision);
    node('p', details, value.citation);
    if(value.producer)node('p',details,'Display from '+value.producer.pluginId+' '+value.producer.pluginVersion+' · API '+value.producer.apiVersion);
    if(value.derived_from)node('p',details,'Derived from saved source '+value.derived_from+'. Earlier citations and annotations remain with that source.');
    node('p', details, value.license + '. Rendering is a derived view; the exact retained source is available offline.');
    for (const [label, entry] of [['Chapter', { title: value.chapter, tag: value.chapter_tag }],
      ['Previous section', value.previous], ['Next section', value.next]]) {
      if (!entry) continue;
      node('span', details, label + ': ' + entry.title + ' ');
      if (entry.tag) {
        const link = node('button', details, (value.source_id ? value.source_id + ':' : '') + entry.tag + ' ↗'); link.type = 'button';
        link.title = `Open the current ${label.toLowerCase()} page in your browser.`;
        link.addEventListener('click', () => action('stacks_citation', (value.source_id ? value.source_id + ':' : '') + entry.tag));
      }
    }
    const navigation = node('nav', parent, undefined, 'published-toc');
    navigation.setAttribute('aria-label', 'Imported section statements and proofs');
    for (const item of Object.values(value.parts)) {
      const jump = node('button', navigation, item.role === 'context' ? 'Opening context' : (item.qualified_tag || item.tag) + ' · ' + item.role);
      jump.type = 'button'; jump.dataset.action = 'stacks-jump'; jump.dataset.region = item.region;
      jump.title = `Read this ${item.role} in the retained section; no network request.`;
      jump.addEventListener('click', () => action('stacks_jump', item.region));
    }
  }
  window.MRWStacks = { header, part };
})();
