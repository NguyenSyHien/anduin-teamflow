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
