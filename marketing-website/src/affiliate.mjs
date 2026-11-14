// Curated support links. Nothing is shown until the maintainer approves a real partner.
import {readFileSync} from 'node:fs';
export function validateOffers(raw) {
  if(!Array.isArray(raw))throw new Error('Affiliate catalog must be an array');
  const seen=new Set();
  return raw.map((o,index)=>{
    if(!o || typeof o!=='object')throw new Error('Offer '+index+' is invalid');
    for(const name of ['id','name','description','url','category'])if(typeof o[name]!=='string'||!o[name].trim())throw new Error('Missing '+name+' at '+index);
    if(!/^[a-z0-9-]{2,60}$/.test(o.id) || seen.has(o.id))throw new Error('Invalid or duplicate offer ID');
    seen.add(o.id);
    const u=new URL(o.url);
    if(u.protocol!=='https:' || u.username || u.password || !u.hostname.includes('.') || /^(localhost|127\\.|10\\.|192\\.168\\.)/.test(u.hostname))throw new Error('Public HTTPS destination required');
    if(o.description.length>220 || o.name.length>80)throw new Error('Offer copy too long');
    if(o.active!==true)throw new Error('Only explicitly approved offers may be published');
    return {id:o.id,name:o.name,description:o.description,category:o.category,url:u.href};
  });
}
export function escapeHtml(value){
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
export function renderSupport(offers) {
  const rows=offers.map(o=>`<article class="support-offer"><p class="eyebrow">${escapeHtml(o.category)}</p><h2>${escapeHtml(o.name)}</h2><p>${escapeHtml(o.description)}</p><a class="button" href="${escapeHtml(o.url)}" target="_blank" rel="nofollow sponsored noopener noreferrer" referrerpolicy="no-referrer">Visit partner site <span aria-hidden="true">↗</span></a></article>`).join('');
  return `<main id="main" class="container docs-main"><h1>Support ReboundOps</h1><p>ReboundOps is MIT-licensed and free to use. Some optional recommendations may use affiliate links, meaning the project could earn a commission if you choose to buy from a partner, at no additional cost attributable to the link. We only list partners approved by the maintainers.</p><p><strong>Our promise:</strong> Sponsorship never changes job scores, CV recommendations, search results or application decisions. No affiliate tracking code runs in the private local workspace. Never buy a product to improve a hiring score or unlock a job application.</p>${rows||'<p>No affiliate recommendations are currently listed. You can still support the project by contributing to GitHub.</p>'}<p><a href="https://github.com/AnkitParekh007/rebound-ops">Contribute to ReboundOps on GitHub</a></p></main>`;
}
export function loadOffers(path){return validateOffers(JSON.parse(readFileSync(path,'utf8')));}
