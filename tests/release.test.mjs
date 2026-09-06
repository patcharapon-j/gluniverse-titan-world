import test from 'node:test';
import assert from 'node:assert/strict';
import {nextVersion} from '../scripts/release.mjs';
test('release increments and resets semantic version components',()=>{
 assert.equal(nextVersion('1.2.3','patch'),'1.2.4');
 assert.equal(nextVersion('1.2.3','minor'),'1.3.0');
 assert.equal(nextVersion('1.2.3','major'),'2.0.0');
 assert.throws(()=>nextVersion('1.2.3','invalid'));
 assert.throws(()=>nextVersion('v1.2.3','patch'));
});
