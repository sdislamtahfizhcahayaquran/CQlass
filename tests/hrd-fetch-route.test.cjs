const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('background-api-fix.js','utf8');
function setup(respond){
 const calls=[];
 const context={Response,AbortController,console,JSON,Map,Set,Date,Promise,
  currentUser:{role:'hrd',username:'auditor'},
  localStorage:{getItem:()=>null},
  document:{createElement:()=>({}),head:{appendChild(){}},getElementById:()=>null},
  setTimeout:fn=>{queueMicrotask(fn);return 1},clearTimeout(){},
  fetch:async (url,init)=>{calls.push({url,init});return respond(calls.length,url,init)}
 };
 context.window=context;vm.createContext(context);vm.runInContext(source,context);
 return {context,calls};
}
const url='https://example.invalid/functions/v1/hrd-live-report';
const init=action=>({method:'POST',headers:{Authorization:'Bearer test-only'},body:JSON.stringify({action,submission_id:'test-id'})});
test('RPP file uses administration once and preserves request and cache',async()=>{
 const {context,calls}=setup(()=>new Response('{"success":true,"file":"test"}'));
 const request=init('rpp_file');
 assert.equal((await (await context.fetch(url,request)).json()).file,'test');
 await context.fetch(url,request);
 assert.equal(calls.length,1);assert.equal(calls[0].url,url.replace('hrd-live-report','hrd-administration'));assert.equal(JSON.stringify(calls[0].init),JSON.stringify(request));
});
test('other actions, malformed payload and other endpoints remain untouched',async()=>{
 const {context,calls}=setup(()=>new Response('{}'));
 for(const action of ['summary','detail','save','delete','']){const request=init(action);await context.fetch(url,request);assert.equal(calls.at(-1).url,url);assert.equal(calls.at(-1).init,request)}
 await context.fetch(url,{body:'not-json'});assert.equal(calls.at(-1).url,url);
 await context.fetch(url+'-other',init('rpp_file'));assert.equal(calls.at(-1).url,url+'-other');
});
test('non-success responses are not cached',async()=>{
 const {context,calls}=setup(()=>new Response('{"success":false}',{status:403}));
 assert.equal((await context.fetch(url,init('rpp_file'))).status,403);
 await context.fetch(url,init('rpp_file'));assert.equal(calls.length,2);
});
test('transport retry retains original fallback',async()=>{
 const {context,calls}=setup(n=>{if(n<3)throw Error('offline');return new Response('{}')});
 await context.fetch(url,init('rpp_file'));
 assert.deepEqual(calls.map(x=>x.url),[url.replace('hrd-live-report','hrd-administration'),url.replace('hrd-live-report','hrd-administration'),url]);
});
test('abort is propagated without retry',async()=>{
 const {context,calls}=setup(()=>{const e=Error('aborted');e.name='AbortError';throw e});
 await assert.rejects(context.fetch(url,init('rpp_file')),{name:'AbortError'});assert.equal(calls.length,1);
});
