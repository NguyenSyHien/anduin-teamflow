import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWindow,weekRanges,removeMember} from '../dist/workspace.js';
import {utilization} from '../dist/engine.js';
test('calendar covers partial weeks and crosses year boundaries without gaps',()=>{
 assert.deepEqual(weekRanges('2026-12-31','2027-01-05'),[['2026-12-31','2027-01-03'],['2027-01-04','2027-01-05']]);
 assert.ok(validateWindow('2026-02-30','2026-03-02'));
 assert.ok(validateWindow('2026-12-31','2026-01-01'));
 assert.ok(validateWindow('2026-01-01','2028-01-01'));
 assert.equal(validateWindow('2028-02-29','2028-02-29'),'');
});
test('selected dates change capacity and booked totals',()=>{
 const person={id:'a',capacity:8,leave:[{start:'2026-11-03',end:'2026-11-03'}]};
 const state={projects:[{id:'p',start:'2026-11-02',end:'2026-11-06',assignments:[{personId:'a',hours:4}]}]};
 assert.deepEqual(utilization(state,person,'2026-11-02','2026-11-06'),{cap:32,used:20,percent:63,conflicts:1});
 assert.equal(utilization(state,person,'2026-12-01','2026-12-04').used,0);
});
test('removing member preserves other people and assignments and invalidates matching',()=>{
 const state={people:[{id:'a'},{id:'b'}],projects:[{name:'Migration',matching:{},assignments:[{personId:'a'},{personId:'b'}]},{name:'Other',assignments:[{personId:'b'}]}]};
 assert.deepEqual(removeMember(state,'a'),['Migration']);
 assert.deepEqual(state.people,[{id:'b'}]);
 assert.deepEqual(state.projects[0].assignments,[{personId:'b'}]);
 assert.equal(state.projects[0].matching,undefined);
 assert.equal(state.projects[1].assignments.length,1);
});
