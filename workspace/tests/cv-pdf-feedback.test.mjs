import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../public/js/views/cv.js', import.meta.url), 'utf8');

async function harness() {
  const nodes=[],toasts=[],downloads=[];let route,callback,files=[],listFails=false;
  const el=(tag,attrs={},children=[])=>{
    const n={tag,children:[],style:{},disabled:false,value:'',textContent:'',innerHTML:'',listeners:{},classList:{add(){},remove(){},toggle(){}},
      appendChild(x){this.children.push(x);return x;},replaceChildren(...xs){this.children=xs;},addEventListener(k,v){this.listeners[k]=v;},removeEventListener(){},setAttribute(){},removeAttribute(){},querySelector(){return null;},remove(){},click(){if(this.download)downloads.push(this.download);}};
    Object.assign(n,attrs||{});n.children=[].concat(children||[]);if(tag==='textarea')n.value=String(children||'');nodes.push(n);return n;
  };
  const document={createElement:el,body:el('body'),getElementById(){return null;},addEventListener(){},removeEventListener(){}};
  const window={location:{hash:'#/cv'},addEventListener(){},removeEventListener(){},confirm:()=>true};
  const UI={el,md:s=>s,escapeHtml:s=>s,toast:(message,type)=>toasts.push({message,type}),modal(){},withSpinner:(_b,fn)=>fn()};
  const API={get:async path=>{if(path==='/api/cv')return {markdown:'# Fictional person'};if(listFails)throw Error('offline');return {files};},stream:(_path,fn)=>{callback=fn;return {close(){}};}};
  new Function('window','document','Router','API','UI','I18n','HelpHint','location',source)(window,document,{register:(_n,fn)=>{route=fn;}},API,UI,{t:(_k,f)=>f||_k},{title:s=>el('h1',{},s)},window.location);
  await route([]);const button=nodes.find(n=>n.tag==='button'&&n.children.includes('Generate PDF'));
  await button.onClick({currentTarget:button});
  return {button,toasts,downloads,emit:(event,data)=>callback(event,data),setFiles:v=>{files=v;},failList:()=>{listFails=true;}};
}
test('CV export reports process failures/signals once, re-enables retry and never downloads stale files',async()=>{
  for(const code of [1,null,undefined]){
    const h=await harness();assert(h.button.disabled);
    await h.emit('done',{code});await h.emit('error',{message:'second terminal event'});
    assert.equal(h.toasts.filter(t=>t.type==='error').length,1);
    assert.equal(h.toasts.filter(t=>t.type==='success').length,0);
    assert.equal(h.button.disabled,false);assert.deepEqual(h.downloads,[]);
  }
});
test('CV export requires a new nonempty output, including when the process exits zero',async()=>{
  const h=await harness();await h.emit('done',{code:0});
  assert(h.toasts.some(t=>t.type==='error'&&t.message.includes('No new PDF')));assert.deepEqual(h.downloads,[]);assert.equal(h.button.disabled,false);
});
test('CV export confirms output before announcing success and triggering one download',async()=>{
  const h=await harness();h.setFiles([{name:'fictional-cv.pdf',size:100,mtime:'2026-11-09T00:00:00Z'}]);
  await h.emit('done',{code:0});await h.emit('done',{code:0});
  assert.deepEqual(h.downloads,['fictional-cv.pdf']);assert.equal(h.toasts.filter(t=>t.type==='success').length,1);assert.equal(h.button.disabled,false);
});
test('CV output verification failure produces an error and releases the button',async()=>{
  const h=await harness();h.failList();await h.emit('done',{code:0});
  assert(h.toasts.some(t=>t.type==='error'));assert(!h.toasts.some(t=>t.type==='success'));assert.equal(h.button.disabled,false);
});
