const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const payload = {name:'=Nama',school:'Sekolah Test',email:'test@example.com',frame:'squad',requestId:'12345678-1234-1234-1234-123456789abc',channelClicked:true,consent:true};
test('Apps Script validation, idempotent retries, conflict and formula escaping',()=>{
 const rows=[], cache=new Map();
 const sheet={getLastRow:()=>rows.length,appendRow:r=>rows.push(r),setFrozenRows(){},getRange:(r,c,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+w)),createTextFinder:id=>({matchEntireCell:()=>({findNext:()=>{const i=rows.findIndex(x=>x[1]===id);return i<0?null:{getRow:()=>i+1};}})})})};
 const context={console,ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock(){}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},Utilities:{DigestAlgorithm:{SHA_256:1},computeDigest:(_,s)=>s,base64EncodeWebSafe:s=>s}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8'),context);
 const post=p=>context.doPost({postData:{contents:JSON.stringify(p)}});
 assert.equal(post({...payload,consent:false}).ok,false);assert.equal(rows.length,0);
 assert.equal(post(payload).ok,true);assert.equal(rows.length,2);assert.equal(rows[1][2],"'=Nama");
 assert.equal(post(payload).duplicate,true);assert.equal(rows.length,2);
 assert.equal(post({...payload,name:'Different'}).error,'request_conflict');assert.equal(rows.length,2);
});
test('Vercel proxy rejects invalid fields and unconfirmed upstream responses',async()=>{
 const handler=require('../api/twibbon.js');let code,result;
 const res={setHeader(){},status(n){code=n;return this},json(v){result=v;return this}};
 await handler({method:'POST',body:{...payload,email:'invalid'}},res);assert.equal(code,400);
 const previous=global.fetch;
 try {
  global.fetch=async()=>({ok:true,json:async()=>({ok:false,error:'save_failed'})});
  await handler({method:'POST',body:payload},res);assert.equal(code,502);assert.equal(result.ok,false);
  global.fetch=async()=>({ok:true,json:async()=>({ok:true,requestId:payload.requestId})});
  await handler({method:'POST',body:payload},res);assert.equal(code,200);assert.equal(result.ok,true);
 }finally{global.fetch=previous;}
});
