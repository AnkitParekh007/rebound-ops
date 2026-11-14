import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNumber, markerFor, buildIssue, withoutMentions} from './promote-discussion.mjs';

test('accepts a positive numeric discussion ID',()=>{
  assert.equal(validateNumber('42'),42);
  for(const value of ['0','-1','1.5','abc',' 10','']) assert.throws(()=>validateNumber(value));
});
test('creates stable dedupe marker and maintainer checklist',()=>{
  const result=buildIssue({number:42,title:'Better onboarding',url:'https://github.com/AnkitParekh007/rebound-ops/discussions/42',bodyText:'Need a simpler onboarding',category:{name:'Ideas'}});
  assert.equal(markerFor(42),'<!-- reboundops-discussion:42 -->');
  assert.match(result.body,/reboundops-discussion:42/);
  assert.match(result.body,/Maintainer triage/);
  assert.match(result.title,/\[triage\]/);
});
test('a title naming someone does not mention them, and brackets do not break the link',()=>{
  const result=buildIssue({number:7,title:'Ask @fixture-user about [beta] access',url:'https://github.com/AnkitParekh007/rebound-ops/discussions/7',bodyText:'',category:{name:'Ideas'}});
  assert.equal(withoutMentions('@a and @b'),'@\u200ba and @\u200bb');
  assert.ok(!/@fixture-user/.test(result.title));
  assert.ok(!/@fixture-user/.test(result.body));
  assert.match(result.body,/\[Ask @\u200bfixture-user about \\\[beta\\\] access\]\(https:\/\/github\.com\/AnkitParekh007\/rebound-ops\/discussions\/7\)/);
});
