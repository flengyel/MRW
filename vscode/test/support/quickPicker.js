'use strict';
class CancellationTokenSource {
 constructor(){this.listeners=new Set();this.token={isCancellationRequested:false,onCancellationRequested:fn=>{this.listeners.add(fn);return {dispose:()=>this.listeners.delete(fn)};}};}
 cancel(){if(this.token.isCancellationRequested)return;this.token.isCancellationRequested=true;for(const f of this.listeners)f();}
 dispose(){this.listeners.clear();}
}
const WAIT=Symbol('wait for picker contents');
function quickPicker(choose){
 const events={accept:new Set(),hide:new Set()};let items=[],busy=false,pending=false,done=false;
 const p={value:'',activeItems:[],selectedItems:[],onDidAccept(fn){events.accept.add(fn);return {dispose:()=>events.accept.delete(fn)};},onDidHide(fn){events.hide.add(fn);return {dispose:()=>events.hide.delete(fn)};},show(){schedule();},hide(){if(done)return;done=true;for(const fn of events.hide)fn();},dispose(){done=true;},accept(item){p.selectedItems=[item];for(const fn of events.accept)fn();}};
 function schedule(){if(!choose||pending||done)return;pending=true;setImmediate(async()=>{pending=false;if(busy||done)return;try{const item=await choose(items.filter(i=>i.kind===undefined),{title:p.title,matchOnDescription:p.matchOnDescription,matchOnDetail:p.matchOnDetail});if(!done&&item!==WAIT){if(item)p.accept(item);else p.hide();}}catch(error){p.error=error;p.hide();}});}
 Object.defineProperties(p,{items:{get:()=>items,set:value=>{items=value;schedule();}},busy:{get:()=>busy,set:value=>{busy=value;if(!busy)schedule();}}});return p;
}
module.exports={CancellationTokenSource,quickPicker,WAIT};
