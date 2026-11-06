import { projectRoles, days, utilization, validateSquad } from "./engine.js";
export function shiftDate(value, offset) {
  const d = new Date(value + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function validateWindow(start, end) {
  const valid = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
  if (!valid(start) || !valid(end)) return 'Choose valid start and end dates.';
  if (end < start) return 'End date must be on or after start date.';
  if ((Date.parse(end)-Date.parse(start))/86400000 > 365) return 'Choose a planning window of up to one year.';
  return '';
}
export function weekRanges(start, end) {
  if (validateWindow(start,end)) return [];
  const result=[];
  for(let from=start;from<=end;) {
    const weekday=new Date(from+'T12:00:00Z').getUTCDay();
    const through=[shiftDate(from,(7-weekday)%7),end].sort()[0];
    result.push([from,through]);
    from=shiftDate(through,1);
  }
  return result;
}
export function removeMember(state, id) {
  const affected=[];
  for(const p of state.projects) {
    if(p.assignments.some(a=>a.personId===id)) {
      p.assignments=p.assignments.filter(a=>a.personId!==id);
      delete p.matching;
      affected.push(p.name);
    }
  }
  state.people=state.people.filter(p=>p.id!==id);
  return affected;
}

export function dashboardStats(state,start,end) {
  const usage=state.people.map(p=>utilization(state,p,start,end));
  const used=usage.reduce((n,u)=>n+u.used,0),cap=usage.reduce((n,u)=>n+u.cap,0);
  const counts={"Needs review":0,"Needs squad":0,"At risk":0,"On track":0};
  let demand=0, unknown=0, outside=0;
  for(const p of state.projects){
    const roleList=projectRoles(p);
    const status=p.staffing?.status==='draft'?'Needs review':p.assignments.length<roleList.length?'Needs squad':validateSquad(state,p,p.assignments)?'At risk':'On track';
    counts[status]++;
    const dates=days(p.start,p.end);
    if(!dates.length || roleList.some(r=>!Number.isFinite(p.effort[r]) || p.effort[r]<=0)){unknown++;continue;}
    const overlap=dates.filter(d=>d>=start&&d<=end).length;
    if(!overlap)outside++;
    demand+=roleList.reduce((n,r)=>n+p.effort[r],0)*overlap/dates.length;
  }
  return {total:state.projects.length,counts,used,cap,pct:cap?Math.round(100*used/cap):0,free:Math.round(cap-used),demand:Math.round(demand),unknown,outside,risk:counts['At risk'],pending:counts['Needs review']+counts['Needs squad']};
}
export function recentProjects(projects) {
  return projects.map((p,i)=>({p,i})).sort((a,b)=>(b.p.updatedAt||'').localeCompare(a.p.updatedAt||'') || b.i-a.i).map(x=>x.p);
}
