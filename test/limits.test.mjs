import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncBudget, deadline, limits } from '../dist/budget.js';
import { requestBytes } from '../dist/transport.js';
import { createCraftClient } from '../dist/craft-client.js';
const connection={apiUrl:'https://connect.craft.do/link/synthetic/api/v1',apiKey:'secret'};
const url=new URL('https://r.craft.do/private?secret=value');
const options={maximum:8,milliseconds:2000,failure:'Safe transport failure.',httpError:s=>Error(`HTTP ${s}`)};

test('streaming and declared byte overflow cancel and fail immediately without retries',async()=>{
 for(const declared of [true,false]){
  let calls=0,canceled=false;
  await assert.rejects(requestBytes(url,async()=>{calls++;return new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(9))},cancel(){canceled=true}}),{headers:declared?{'content-length':'9'}:{}})},options),/response size/);
  assert.equal(calls,1);assert.equal(canceled,true);
 }
});
test('API retries temporary statuses and body interruptions, but never malformed success',async()=>{
 for(const mode of [408,429,500,502,503,504,'body','network']){
  let calls=0;const signals=[];
  const client=createCraftClient(connection,async(_,init)=>{signals.push(init.signal);if(++calls===1){if(mode==='network')throw Error('private');if(mode==='body')return new Response(new ReadableStream({start(c){c.error(Error('private'))}}));return new Response('',{status:mode,headers:{'retry-after':'0'}})}return Response.json({items:[]})});
  assert.deepEqual(await client.listCollectionItems('collection'),[]);assert.equal(calls,2);assert.equal(signals[0],signals[1]);
 }
 for(const value of ['private malformed JSON','{}']){
  let calls=0;const client=createCraftClient(connection,async()=>{calls++;return new Response(value)});
  await assert.rejects(client.listCollectionItems('collection'));assert.equal(calls,1);
 }
});
test('Retry-After cannot run beyond the remaining operation deadline',async()=>{
 for(const value of ['60',new Date(Date.now()+60000).toUTCString()]){
  let calls=0;const started=Date.now();
  await assert.rejects(requestBytes(url,async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':value}})},options),/HTTP 429/);
  assert.equal(calls,1);assert(Date.now()-started<1000);
 }
});
test('shared deadline aborts hung transports and bodies even if they ignore cancellation',async()=>{
 for(const mode of ['request','body']){
  const parent=deadline(30);let signal,canceled=false;
  try{
   const started=Date.now();await assert.rejects(requestBytes(url,async(_,init)=>{signal=init.signal;return mode==='request'?new Promise(()=>{}):new Response(new ReadableStream({pull(){return new Promise(()=>{})},cancel(){canceled=true}}))},{...options,parent}),/failure/);
   assert(Date.now()-started<1000);assert(signal.aborted);if(mode==='body')assert(canceled);
  }finally{parent.close()}
 }
});
test('API entry, block, response and endless unique cursor limits are finite',async()=>{
 const cases=[
  {value:{items:Array.from({length:501},(_,i)=>({id:String(i),title:'',properties:{}}))},method:'listCollectionItems',error:/entry count/},
  {value:{id:'item',type:'collectionItem',content:Array.from({length:25000},(_,i)=>({id:String(i),type:'text'}))},method:'getItemBlocks',error:/block count/},
 ];
 for(const {value,method,error} of cases){const client=createCraftClient(connection,async()=>Response.json(value));await assert.rejects(client[method]('item'),error)}
 let calls=0;const endless=createCraftClient(connection,async()=>Response.json({items:[],nextCursor:String(++calls)}));await assert.rejects(endless.listCollectionItems('collection'),/continuation page count/);assert.equal(calls,101);
 let oversizedCalls=0;const oversized=createCraftClient(connection,async()=>{oversizedCalls++;return new Response('',{headers:{'content-length':String(limits.apiBytes+1)}})});await assert.rejects(oversized.getItemMarkdown('item'),/response size/);assert.equal(oversizedCalls,1);
});
test('whole-sync budgets accumulate across operations and reject expired work',async()=>{
 const budget=createSyncBudget(20);
 try{budget.markdown(limits.markdownBytes);assert.throws(()=>budget.markdown(1),/normalized Markdown/);await assert.rejects(budget.time.wait(new Promise(()=>{})),/timed out/);assert.throws(()=>budget.block(),/timed out/)}finally{budget.time.close()}
 const counts=createSyncBudget();try{for(let i=0;i<limits.blocks;i++)counts.block();assert.throws(()=>counts.block(),/block count/);for(let i=0;i<limits.continuationPages;i++)counts.continuation();assert.throws(()=>counts.continuation(),/continuation page count/)}finally{counts.time.close()}
});
