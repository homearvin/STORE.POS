export const online=window.STOREPOS_ONLINE===true;
export let cloudUser=null;
export function setCloudUser(user){cloudUser=user;}
export function cloudToken(){return sessionStorage.getItem('storepos-session')||'';}
export function cloudAccept(result){sessionStorage.setItem('storepos-session',result.token);cloudUser=result.user;}
export function cloudForget(){sessionStorage.removeItem('storepos-session');cloudUser=null;}
export function pendingCommand(){try{return JSON.parse(sessionStorage.getItem('storepos-pending')||'null');}catch{return null;}}
export function clearPending(){sessionStorage.removeItem('storepos-pending');}
export function cloudCall(method,...args){return new Promise((resolve,reject)=>{if(!navigator.onLine)return reject(Error('You’re offline. Connect to the internet before saving.'));const runner=window.google?.script?.run;if(!runner)return reject(Error('Open the deployed Apps Script web link to connect to your store.'));runner.withSuccessHandler(resolve).withFailureHandler(error=>reject(Error(error.message||'The server could not confirm this action.')))[method](...args);});}
export async function cloudCommand(type,data,id,revision){const existing=pendingCommand();const same=existing&&existing.type===type&&JSON.stringify(existing.data)===JSON.stringify(data);if(existing&&!same)throw Error('A previous transaction needs confirmation. Use Check pending save before starting another action.');const command=existing||{id:id||crypto.randomUUID(),type,data,expectedRevision:revision};sessionStorage.setItem('storepos-pending',JSON.stringify(command));let result;try{result=await cloudCall('apiCommand',cloudToken(),command);}catch(err){throw Error(err.message+' Use Check pending save to confirm before trying a different action.');}clearPending();if(result.rejected)throw Error(result.message);return result;}
