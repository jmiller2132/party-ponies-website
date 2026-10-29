import fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i), l.slice(i+1).replace(/^["']|["']$/g,'')]}));
const url=env.NEXT_PUBLIC_SUPABASE_URL, key=env.SUPABASE_SERVICE_ROLE_KEY;
const tables=['sds_plus_cache','manager_stats_cache','league_standings','matchups','league_settings_cache','head_to_head_cache','managers','records','yahoo_tokens'];
const dir='backups/'+new Date().toISOString().replace(/[:.]/g,'-');
fs.mkdirSync(dir,{recursive:true});
for (const t of tables){
  let rows=[],from=0;
  while(true){
    const r=await fetch(`${url}/rest/v1/${t}?select=*`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Range:`${from}-${from+999}`}});
    if(!r.ok){console.log(t,'ERROR',r.status,(await r.text()).slice(0,120));rows=null;break}
    const j=await r.json(); rows.push(...j); if(j.length<1000)break; from+=1000;
  }
  if(rows){fs.writeFileSync(`${dir}/${t}.json`,JSON.stringify(rows,null,1));console.log(t,rows.length,'rows')}
}
console.log('saved to',dir);
