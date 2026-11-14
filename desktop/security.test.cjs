const test=require('node:test');const assert=require('node:assert/strict');
const {isLocalAppUrl,isExternalWebUrl}=require('./security.cjs');
test('only intended loopback origin can navigate inside desktop',()=>{
  assert.equal(isLocalAppUrl('http://127.0.0.1:4317/#/guide'),true);
  for(const x of ['https://evil.test/','http://127.0.0.1:4318/','file:///etc/passwd','http://localhost:4317/'])assert.equal(isLocalAppUrl(x),false);
});
test('external protocol allowlist blocks javascript and localhost',()=>{
  assert.equal(isExternalWebUrl('https://github.com/AnkitParekh007'),true);
  for(const x of ['javascript:alert(1)','file:///x','http://127.0.0.1:4317/','https://localhost/'])assert.equal(isExternalWebUrl(x),false);
});
