const {app,BrowserWindow,dialog,shell,session,Menu}=require('electron');
const {spawn}=require('node:child_process');
const {existsSync}=require('node:fs');
const path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');
const {LOOPBACK,isLocalAppUrl,isExternalWebUrl}=require('./security.cjs');
let mainWindow,launcher,closing=false;
const root=path.resolve(process.env.REBOUNDOPS_SOURCE_ROOT || path.join(__dirname,'..'));
const health=LOOPBACK+'/api/rebound/health';
async function ready(){
  for(let i=0;i<180;i++){
    if(closing)throw new Error('Stopping');
    if(launcher?.exitCode!==null && launcher?.exitCode!==undefined)throw new Error('Local workspace exited');
    try {const res=await fetch(health,{signal:AbortSignal.timeout(600)});await res.body?.cancel();if(res.ok)return;}catch{}
    await delay(400);
  }
  throw new Error('The local workspace did not start. Run npm start in the checkout to diagnose.');
}
function startServices(){
  if(!existsSync(path.join(root,'scripts','start.mjs')))throw new Error('REBOUNDOPS_SOURCE_ROOT must reference a ReboundOps source checkout.');
  launcher=spawn('node',['scripts/start.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:'4317',REBOUNDOPS_API_PORT:'4174'},stdio:'ignore',windowsHide:true});
  launcher.once('error',err=>{if(!closing)dialog.showErrorBox('ReboundOps startup failed',String(err.message));});
}
function shutdown(){
  closing=true;
  if(launcher?.pid && launcher.exitCode===null){
    if(process.platform==='win32')spawn('taskkill',['/PID',String(launcher.pid),'/T','/F'],{windowsHide:true});
    else launcher.kill('SIGTERM');
  }
}
function installSecurity(window){
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  window.webContents.setWindowOpenHandler(({url})=>{
    if(isExternalWebUrl(url))void shell.openExternal(url);
    return {action:'deny'};
  });
  window.webContents.on('will-navigate',(event,url)=>{
    if(isLocalAppUrl(url))return;
    event.preventDefault();
    if(isExternalWebUrl(url))void shell.openExternal(url);
  });
}
async function create(){
  Menu.setApplicationMenu(null);
  mainWindow=new BrowserWindow({width:1250,height:850,minWidth:850,minHeight:600,
    title:'ReboundOps',backgroundColor:'#101722',
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  installSecurity(mainWindow);
  try {
    startServices();
    await ready();
    await mainWindow.loadURL(LOOPBACK+'/#/guide');
  }catch(error){
    await dialog.showMessageBox(mainWindow,{type:'error',title:'ReboundOps could not start',
      message:String(error.message),detail:'This developer-preview shell needs Node.js, npm, installed dependencies and a local ReboundOps checkout.'});
    app.quit();
  }
}
app.whenReady().then(create);
app.on('before-quit',shutdown);
app.on('window-all-closed',()=>{app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)void create();});
