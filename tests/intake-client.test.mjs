import test from 'node:test';
import assert from 'node:assert/strict';
import {draftStaffing,cancelIntake} from '../dist/intake-client.js';
test('cancelled API results cannot replace current staffing draft',async()=>{
 const original=globalThis.fetch;const calls=[];globalThis.fetch=(url,options)=>new Promise(resolve=>calls.push({options,resolve}));
 try{const first=draftStaffing('first',()=>{});const rejected=assert.rejects(first,/Cancelled/);const second=draftStaffing('second',()=>{});assert.ok(calls[0].options.signal.aborted);calls[0].resolve(Response.json({proposal:{old:true}}));await rejected;calls[1].resolve(Response.json({proposal:{good:true}}));assert.deepEqual((await second).proposal,{good:true});
 const third=draftStaffing('third',()=>{});const failure=assert.rejects(third,/unavailable/);calls[2].resolve(Response.json({message:'unavailable'},{status:503}));await failure;
 }finally{cancelIntake();globalThis.fetch=original;}
});
