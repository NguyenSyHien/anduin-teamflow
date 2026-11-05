let current;
export function cancelIntake(){current?.abort();current=null;}
export async function draftStaffing(brief,onProgress){
 cancelIntake();const controller=new AbortController();current=controller;
 const timer=setTimeout(()=>controller.abort(),55000);onProgress('Drafting roles with OpenAI…');
 try{const response=await fetch('/api/intake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brief}),signal:controller.signal});const data=await response.json();if(controller.signal.aborted)throw Error('Cancelled');if(!response.ok)throw Error(data.message||'AI drafting unavailable.');return data;}
 catch(error){if(error.name==='AbortError')throw Error('Drafting was cancelled or timed out.');throw error;}
 finally{clearTimeout(timer);if(current===controller)current=null;}
}
