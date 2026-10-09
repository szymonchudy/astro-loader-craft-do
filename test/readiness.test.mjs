import test from 'node:test';
import assert from 'node:assert/strict';
import { craftCollection } from '../dist/index.js';
import { createCraftClient } from '../dist/craft-client.js';
import { normalizeItemMarkdown } from '../dist/normalize.js';
const connection={apiUrl:'https://connect.craft.do/link/synthetic/api/v1',apiKey:'synthetic',collectionId:'collection'};
const wrap=body=>`<collectionItem>\n  <content>\n${body.split('\n').map(s=>'    '+s).join('\n')}\n  </content>\n</collectionItem>`;
test('empty successful Markdown cannot erase structured prose; a truly empty item is accepted',async()=>{
 for(const body of ['', '<collectionItem>\n  <title>Title</title>\n</collectionItem>', wrap('')]){
  for(const hasContent of [true,false]){
   const original=globalThis.fetch;
   globalThis.fetch=async(url,init)=>url.pathname.endsWith('/items')?Response.json({items:[{id:'item',title:'Title',properties:{}}]}):init.headers.Accept==='application/json'?Response.json({id:'item',type:'collectionItem',content:hasContent?[{id:'text',type:'text',markdown:'Real prose'}]:[]}):new Response(body);
   const loader=craftCollection(connection);globalThis.fetch=original;
   const entries=new Map([['previous',{id:'previous'}]]);
   const context={store:{entries:()=>[...entries],clear:()=>entries.clear(),set:e=>entries.set(e.id,e)},parseData:async({data})=>data,renderMarkdown:async()=>({html:''}),generateDigest:JSON.stringify,logger:{info(){}}};
   if(hasContent){await assert.rejects(loader.load(context),/incomplete|empty/);assert.deepEqual([...entries.keys()],['previous'])}else{await loader.load(context);assert.equal(entries.get('item').body,'')}
  }
 }
});
test('structured item roots require Collection-item type and children',async()=>{
 for(const root of [{id:'item',type:''},{id:'item',type:'text',content:[]},{id:'item',type:'collectionItem'},{id:'item',type:'collectionItem',content:null}]){
  const client=createCraftClient(connection,async()=>Response.json(root));await assert.rejects(client.getItemBlocks('item'),/structured|root|children/);
 }
});
test('line renderer cannot let malformed reserved wrappers through generic HTML',()=>{
 for(const body of ['</callout>','<contentPreview>','<itemsPreview>',' <callout>broken','<caption class="x">bad</caption>','</page>','<highlight>','</highlight>']){
  assert.throws(()=>normalizeItemMarkdown(wrap(body),{line:()=>undefined}),/wrapper|structural|unsupported|malformed|unmatched/);
 }
});
