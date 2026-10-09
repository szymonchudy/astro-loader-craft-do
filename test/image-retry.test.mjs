import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {localizeImages} from '../dist/images.js';

const bytes = await sharp({create:{width:16,height:16,channels:3,background:'#aabbcc'}}).png().toBuffer();
const source='https://r.craft.do/synthetic?signature=private';
const root={id:'root',type:'collectionItem',content:[{id:'image',type:'image',url:source,markdown:`![Photo](${source})`}]};
const cache=async()=>pathToFileURL(await mkdtemp(tmpdir()+'/craft-retry-')+'/');

test('a transient Craft media HTTP 500 retries the fresh URL and stores only the successful bytes',async()=>{
 let attempts=0;
 const destination=await cache();
 const images=await localizeImages(root,destination,async(input,init)=>{
  assert.equal(String(input),source);assert.equal(init.headers,undefined);assert.equal(init.redirect,'error');
  return ++attempts===1?new Response('',{status:500}):new Response(bytes);
 });
 assert.equal(attempts,2);assert.equal(images.length,1);assert.equal((await readdir(destination)).length,1);
});

test('temporary gateway/server failures are limited to three attempts and leave no partial asset',async()=>{
 for(const status of [408,429,500,502,503,504]){
  let attempts=0;const signals=[];const destination=await cache();
  await assert.rejects(localizeImages(root,destination,async(input,init)=>{attempts++;signals.push(init.signal);return new Response('',{status})}),new RegExp(`HTTP ${status}`));
  assert.equal(attempts,3);assert(signals.every(signal=>signal===signals[0]));assert.deepEqual(await readdir(destination),[]);
 }
});

test('permanent HTTP errors and corrupt successful responses fail without retries',async()=>{
 for(const status of [400,401,403,404,501]){
  let attempts=0;await assert.rejects(localizeImages(root,await cache(),async()=>{attempts++;return new Response('',{status})}),new RegExp(`HTTP ${status}`));assert.equal(attempts,1);
 }
 let attempts=0;await assert.rejects(localizeImages(root,await cache(),async()=>{attempts++;return new Response('broken image')}),/complete supported raster/);assert.equal(attempts,1);
});

test('network failure and interrupted response body retry without leaking a signed URL',async()=>{
 for(const failure of ['request','body']){
  let attempts=0;const images=await localizeImages(root,await cache(),async()=>{
   if(++attempts===1){if(failure==='request')throw new Error(source);return new Response(new ReadableStream({start(controller){controller.error(new Error(source))}}))}
   return new Response(bytes);
  });assert.equal(attempts,2);assert.equal(images.length,1);
 }
 let attempts=0;await assert.rejects(localizeImages(root,await cache(),async()=>{attempts++;throw new Error(source)}),error=>!error.message.includes('signature')&&/download failed/.test(error.message));assert.equal(attempts,3);
});
