import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardStats,recentProjects} from '../dist/workspace.js';
const project=()=>({id:'p',name:'New project',start:'2026-11-02',end:'2026-11-06',roles:['Analyst'],effort:{Analyst:20},assignments:[],staffing:{status:'draft'}});
test('new drafts immediately update project count, review queue and planned demand without booking people',()=>{
 const state={people:[{id:'a',capacity:8,leave:[]}],projects:[]};
 assert.equal(dashboardStats(state,'2026-11-02','2026-11-06').total,0);
 state.projects.push(project());const s=dashboardStats(state,'2026-11-02','2026-11-06');
 assert.equal(s.total,1);assert.equal(s.counts['Needs review'],1);assert.equal(s.demand,20);assert.equal(s.used,0);assert.equal(s.free,40);
 state.projects[0].assignments=[{personId:'a',role:'Analyst',hours:4}];
 assert.equal(dashboardStats(state,'2026-11-02','2026-11-06').used,20);
});
test('demand is proportional to selected weekdays and missing inputs stay visible',()=>{
 const state={people:[],projects:[project(),{...project(),start:'',end:''}]};
 const s=dashboardStats(state,'2026-11-02','2026-11-03');assert.equal(s.demand,8);assert.equal(s.unknown,1);
 assert.equal(dashboardStats(state,'2026-12-01','2026-12-04').outside,1);
});
test('new and edited projects appear before older demo records without mutating state',()=>{
 const projects=[{id:'old'},{id:'new'},{id:'edited',updatedAt:'2026-11-06T12:00:00Z'}];
 assert.deepEqual(recentProjects(projects).map(p=>p.id),['edited','new','old']);assert.equal(projects[0].id,'old');
});
