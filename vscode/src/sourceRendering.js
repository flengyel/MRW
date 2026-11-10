'use strict';
// This is a restricted display vocabulary, not downloaded HTML execution.
(() => {
 const math=new Set('math semantics annotation mrow mi mn mo mtext mspace ms mfrac msqrt mroot mstyle merror mpadded mphantom mfenced menclose msub msup msubsup munder mover munderover mmultiscripts mprescripts none mtable mlabeledtr mtr mtd maligngroup malignmark'.split(' '));
 const svg=new Set('svg g defs symbol path use line polyline polygon rect circle ellipse text tspan title desc clippath marker'.split(' '));
 const attrs=new Set('id width height viewbox display mathvariant mathsize mathcolor mathbackground stretchy fence separator accent accentunder lspace rspace minsize maxsize scriptlevel displaystyle rowspacing columnspacing rowalign columnalign columnlines rowlines frame framespacing side equalrows equalcolumns rowspan columnspan notation linethickness encoding d fill stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit fill-rule clip-rule stroke-dasharray opacity fill-opacity stroke-opacity transform x y x1 y1 x2 y2 cx cy r rx ry points dx dy font-size text-anchor preserveaspectratio overflow href refx refy markerwidth markerheight orient marker-start marker-mid marker-end clip-path'.split(' '));
 function render(parent,text,kind){
  if(typeof text!=='string'||text.length>512*1024||text.includes('<!'))throw Error('Invalid source display XML');
  const xml=new DOMParser().parseFromString(text,'application/xml'),root=xml.documentElement;
  if(xml.querySelector('parsererror')||root.localName!==(kind==='svg'?'svg':'math'))throw Error('Malformed source display XML');
  const names=kind==='svg'?svg:math,ns=kind==='svg'?'http://www.w3.org/2000/svg':'http://www.w3.org/1998/Math/MathML';
  let count=0;
  function check(n,depth){
   if(++count>20000||depth>100||n.namespaceURI!==ns||!names.has(n.localName.toLowerCase()))throw Error('Unsupported source display element');
   for(const a of n.attributes){
    if(a.name==='xmlns')continue;
    const key=a.localName.toLowerCase(),value=a.value;
    if(a.namespaceURI||!attrs.has(key)||/javascript:|data:|https?:|@import/i.test(value)||key.startsWith('on')||key==='style')throw Error('Unsafe source display attribute');
    if((key==='href'&&!/^#[\w.:-]+$/.test(value))||(value.includes('url(')&&!/^url\(#[\w.:-]+\)$/.test(value)))throw Error('External source display resource');
   }
   for(const c of n.children)check(c,depth+1);
  }
  check(root,0);const copy=document.importNode(root,true);copy.classList.add(kind==='svg'?'published-svg':'published-mathml');parent.append(copy);
 }
 window.MRWSourceRendering={render};
})();
