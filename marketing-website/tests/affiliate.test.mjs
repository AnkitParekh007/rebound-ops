import test from 'node:test';
import assert from 'node:assert/strict';
import {validateOffers,renderSupport} from '../src/affiliate.mjs';
const good={id:'sample-approved',name:'Example product',description:'Optional career learning tool',category:'Learning',url:'https://example.com/course',active:true};
test('no sponsorship displayed without approved partners',()=>{
 const body=renderSupport(validateOffers([]));
 assert.match(body,/No affiliate recommendations/);
 assert.doesNotMatch(body,/target="_blank"/);
});
test('published links disclose sponsorship and avoid referrer forwarding',()=>{
 const body=renderSupport(validateOffers([good]));
 assert.match(body,/rel="nofollow sponsored noopener noreferrer"/);
 assert.match(body,/referrerpolicy="no-referrer"/);
});
test('rejects unsafe URLs, duplicate IDs and unpublished offers',()=>{
 for(const url of ['javascript:alert(1)','http://example.com','https://127.0.0.1/x'])assert.throws(()=>validateOffers([{...good,url}]));
 assert.throws(()=>validateOffers([good,good]));
 assert.throws(()=>validateOffers([{...good,active:false}]));
});
test('escapes untrusted partner titles and descriptions',()=>{
 const body=renderSupport(validateOffers([{...good,name:'<img src=x>',description:'" bad <script>'}]));
 assert.doesNotMatch(body,/<script>/);
 assert.match(body,/&lt;img/);
});
