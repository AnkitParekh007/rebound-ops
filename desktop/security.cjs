const {URL}=require('node:url');
const LOOPBACK='http://127.0.0.1:4317';
function isLocalAppUrl(value) {
  try {
    const url=new URL(value);
    return url.origin===LOOPBACK && (url.pathname==='/' || url.pathname.startsWith('/'));
  } catch { return false; }
}
function isExternalWebUrl(value) {
  try {const url=new URL(value);return ['https:','http:'].includes(url.protocol) && !['localhost','127.0.0.1','[::1]'].includes(url.hostname);}catch{return false;}
}
module.exports={LOOPBACK,isLocalAppUrl,isExternalWebUrl};
