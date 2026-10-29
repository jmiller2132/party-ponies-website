import { readFileSync } from 'fs';
const lines = readFileSync('output/ppsi-comparison.csv','utf8').split('\n').filter(l=>l.trim());
const rows = lines.slice(1).map(l=>{
  const v = l.split(',');
  return {
    season: v[0].replace(/"/g,''),
    owner: v[1].replace(/"/g,''),
    v1: parseFloat(v[4]),
    v2: parseFloat(v[3]),
  };
}).filter(r=>!isNaN(r.v1));

const sorted1 = [...rows].sort((a,b)=>b.v1-a.v1);
const sorted2 = [...rows].sort((a,b)=>b.v2-a.v2);
rows.forEach(r=>{
  r.grank1 = sorted1.findIndex(x=>x.owner===r.owner&&x.season===r.season)+1;
  r.grank2 = sorted2.findIndex(x=>x.owner===r.owner&&x.season===r.season)+1;
  r.grankDelta = r.grank1 - r.grank2; // positive = moved up (rank number got smaller)
});

const byDelta = [...rows].sort((a,b)=>b.grankDelta-a.grankDelta);
console.log('Top 10 GLOBAL rank RISERS (v1->v2, lower rank number = better):');
console.log('Owner                  | Ssn  | v1 Score | v2 Score | v1 #/130 | v2 #/130 | Delta');
byDelta.slice(0,10).forEach(r=>{
  const d = r.grankDelta>=0 ? '+'+r.grankDelta : String(r.grankDelta);
  console.log(r.owner.padEnd(23)+'| '+r.season+' | '+r.v1.toFixed(1).padStart(8)+' | '+r.v2.toFixed(1).padStart(8)+' | '+String(r.grank1).padStart(8)+' | '+String(r.grank2).padStart(8)+' | '+d);
});
console.log('');
console.log('Top 10 GLOBAL rank FALLERS (v1->v2):');
console.log('Owner                  | Ssn  | v1 Score | v2 Score | v1 #/130 | v2 #/130 | Delta');
byDelta.slice(-10).reverse().forEach(r=>{
  const d = r.grankDelta>=0 ? '+'+r.grankDelta : String(r.grankDelta);
  console.log(r.owner.padEnd(23)+'| '+r.season+' | '+r.v1.toFixed(1).padStart(8)+' | '+r.v2.toFixed(1).padStart(8)+' | '+String(r.grank1).padStart(8)+' | '+String(r.grank2).padStart(8)+' | '+d);
});

const THRESH = { allTime:120, elite:105, veryGood:85, aboveAverage:70, average:55 };
const label = s => s>=THRESH.allTime?'All-Time':s>=THRESH.elite?'Elite':s>=THRESH.veryGood?'Very Good':s>=THRESH.aboveAverage?'Above Avg':s>=THRESH.average?'Average':'Below Avg';
const changed = rows.filter(r=>label(r.v1)!==label(r.v2));
const order = ['All-Time','Elite','Very Good','Above Avg','Average','Below Avg'];
console.log(`\nLabel changes (${changed.length} of 130):`);
changed.sort((a,b)=>order.indexOf(label(a.v2))-order.indexOf(label(b.v2))).forEach(r=>{
  console.log(r.owner.padEnd(23)+'| '+r.season+' | '+label(r.v1).padEnd(13)+' -> '+label(r.v2));
});
