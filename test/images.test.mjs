import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { craftCollection } from '../dist/index.js';
const bytes = await sharp({ create: { width: 320, height: 180, channels: 3, background: '#aabbcc' } }).png().toBuffer();
async function fixture(renderers = {}) {
 const root = pathToFileURL(await mkdtemp(tmpdir()+'/craft-native-')+'/');
 let source='https://r.craft.do/asset?signature=first';
 let fail;
 let raster=bytes;
 let alt='Native [alt] <text>';
 const image=()=>({id:'image',type:'image',url:source,altText:alt,markdown:`![remote](${source})`});
 const caption={id:'caption',type:'text',textStyle:'caption',markdown:'<caption>**Rich** [credit](https://example.com).</caption>'};
 const entries=new Map([['old',{id:'old'}]]);
 const request=async(input,init)=>{
  const url=new URL(String(input));
  if(url.hostname==='r.craft.do'){
   assert.equal(init?.headers,undefined);
   if(fail==='download')return new Response('',{status:503});
   return new Response(fail==='corrupt'?raster.subarray(0,60):raster);
  }
  if(url.pathname.endsWith('/items'))return Response.json({items:[{id:'post',title:'Title',properties:{}}]});
  if(init.headers.Accept==='application/json')return Response.json({id:'post',type:'collectionItem',content:[image(),caption]});
  return new Response(`<collectionItem>\n  <content>\n    ${image().markdown}\n    ${caption.markdown}\n\n    \`\`\`markdown\n    ${image().markdown}\n    <caption>Literal example</caption>\n    \`\`\`\n  </content>\n</collectionItem>`);
 };
 const original=globalThis.fetch;globalThis.fetch=request;
 const loader=craftCollection({apiUrl:'https://connect.craft.do/link/synthetic/api/v1',apiKey:'credential-not-for-assets',collectionId:'collection',renderers});globalThis.fetch=original;
 const state={config:{root,cacheDir:new URL('cache/',root)},store:{clear(){entries.clear()},set(e){entries.set(e.id,e)}},
  parseData:async({data,filePath})=>{assert.ok(filePath.startsWith(root.pathname));if(fail==='schema')throw Error('schema');return data},
  renderMarkdown:async body=>{if(fail==='render')throw Error('render');return {html:body,metadata:{imagePaths:[]}}},generateDigest:JSON.stringify,logger:{info(){}}};
 return {loader,state,entries,root,setFail(value){fail=value},replace(value){raster=value},refresh(){source='https://r.craft.do/asset?signature=second';alt='Updated alt'}};
}
test('native metadata, rich captions, bytes, signed URL refresh and code literals',async()=>{
 const f=await fixture();await f.loader.load(f.state);const first=f.entries.get('post');
 assert.equal(first.data.images.length,1);const image=first.data.images[0];
 assert.equal(image.isFirstBlock,true);assert.equal(image.captionMarkdown,'**Rich** [credit](https://example.com).');
 assert.match(first.body,/<figure data-craft-image="image">/);assert.match(first.body,/!\[Native \\\[alt\\\] &lt;text&gt;\]/);
 assert.match(first.body,/```markdown\n!\[remote\]\(https:\/\/r.craft.do\/asset\?signature=first\)\n<caption>Literal example<\/caption>\n```/);
 assert.deepEqual(await readFile(new URL(image.src,new URL('entry.md',new URL('craft-images/',f.state.config.cacheDir)))),bytes);
 f.refresh();await f.loader.load(f.state);const second=f.entries.get('post');assert.equal(second.data.images[0].src,image.src);assert.equal(second.data.images[0].altText,'Updated alt');
 assert.equal((await readdir(new URL('craft-images/',f.state.config.cacheDir))).length,1);
});
test('download, full decode, schema and rendering failures preserve COMPLETE previous snapshot and assets',async()=>{
 const f=await fixture();await f.loader.load(f.state);const prior=f.entries.get('post');
 for(const failure of ['download','corrupt','schema','render']){f.setFail(failure);await assert.rejects(f.loader.load(f.state));assert.equal(f.entries.get('post'),prior);assert.equal(f.entries.size,1)}
});
test('image renderer fallback, omission including caption, context and invalid result',async()=>{
 const renderers={image:()=>undefined};const f=await fixture(renderers);await f.loader.load(f.state);assert.match(f.entries.get('post').body,/<figure/);
 renderers.image=context=>{assert.equal(context.blockId,'image');assert.match(context.markdown,/<figcaption>/);return ''};await f.loader.load(f.state);const prior=f.entries.get('post');assert.doesNotMatch(prior.body,/<figure|Rich|credit/);
 renderers.image=()=>false;await assert.rejects(f.loader.load(f.state),/image renderer/);assert.equal(f.entries.get('post'),prior);
});

test('changed bytes replace the content address while old assets remain usable',async()=>{
 const f=await fixture();await f.loader.load(f.state);const old=f.entries.get('post').data.images[0].src;
 const next=await sharp({create:{width:640,height:360,channels:3,background:'#ff7700'}}).png().toBuffer();
 f.replace(next);await f.loader.load(f.state);const current=f.entries.get('post').data.images[0].src;assert.notEqual(current,old);
 const base=new URL('entry.md',new URL('craft-images/',f.state.config.cacheDir));assert.deepEqual(await readFile(new URL(old,base)),bytes);assert.deepEqual(await readFile(new URL(current,base)),next);
});

test('identical asset bytes keep distinct literal alt text for each figure',async()=>{
 const {registerImageRendering}=await import('../dist/asset-rendering.js');
 const src='./same.png';const first='First *literal* &amp; image';const second='Second `literal` &copy; image';
 const metadata=[{blockId:'first',src,altText:first,isFirstBlock:true},{blockId:'second',src,altText:second,isFirstBlock:false}];
 const html=metadata.map(image=>`<figure data-craft-image="${image.blockId}"><img src="${src}" alt="fallback"></figure>`).join('');
 const rendered=registerImageRendering({html,metadata:{imagePaths:[]}},metadata);
 const alts=[...rendered.html.matchAll(/__ASTRO_IMAGE_="([^"]+)"/g)].map(([,json])=>JSON.parse(json.replaceAll('&#x22;','"')).alt);
 assert.deepEqual(alts,[first,second]);assert.deepEqual(rendered.metadata.imagePaths,[src]);
 const marker=JSON.stringify({src,widths:['128','320']}).replaceAll('"','&#x22;');
 const converted=registerImageRendering({html:`<figure data-craft-image="first"><img __ASTRO_IMAGE_="${marker}"></figure>`,metadata:{}},metadata);
 const props=JSON.parse(converted.html.match(/__ASTRO_IMAGE_="([^"]+)"/)[1].replaceAll('&#x22;','"'));assert.deepEqual(props.widths,[128,320]);
});

test("AVIF is identified from Sharp's AV1-in-HEIF metadata",async()=>{
 const f=await fixture();const avif=await sharp(bytes).avif().toBuffer();f.replace(avif);await f.loader.load(f.state);
 assert.match(f.entries.get('post').data.images[0].src,/\.avif$/);
});
