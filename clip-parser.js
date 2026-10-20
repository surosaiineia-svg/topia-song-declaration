'use strict';
// Parse pasted text only. Never insert pasted HTML into the DOM or fetch its URLs.
function parseSongClip(raw) {
  if (raw.length > 2000000) throw new Error('貼り付けは200万文字以内にしてください。');
  const clean = s => s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):''}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[n])).replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\*\*|__|`/g,'').replace(/^\s*#{1,6}\s*/,'').replace(/\s+/g,' ').trim();
  const data={}, authors={lyricist:[],composer:[]};
  const add=(role,name)=>{name=clean(name);if(!name||['著作者/出版者','著作者','出版者'].includes(name))return;const key=name.normalize('NFKC').replace(/\s+/g,'').toLowerCase();if(!authors[role].some(n=>n.normalize('NFKC').replace(/\s+/g,'').toLowerCase()===key))authors[role].push(name)};
  const role=(r,n)=>{r=clean(r);if(/^(作詞|作詞者|作詞・作曲|作詞作曲)$/.test(r))add('lyricist',n);if(/^(作曲|作曲者|作詞・作曲|作詞作曲)$/.test(r))add('composer',n)};
  // Desktop author tables and mobile author cards can occur repeatedly per use type.
  for(const table of raw.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    const rows=[...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>clean(c[1])));
    for(const c of rows)if(/^\d+$/.test(c[0])&&c.length>=3)role(c[2],c[1]);
    const nameRow=rows.find(c=>c[0]==='著作者/出版者'&&c.length===2);
    const roleRow=rows.find(c=>c.includes('識別'));
    if(nameRow&&roleRow)role(roleRow[roleRow.indexOf('識別')+1],nameRow[1]);
  }
  const lines=raw.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi,'\n').split(/\r?\n/).map(clean).filter(Boolean);
  const aliases={title:['曲名','作品名'],artist:['アーティスト名','アーティスト'],lyricist:['作詞者','作詞'],composer:['作曲者','作曲'],code:['作品コード','JASRACコード','NexToneコード']};
  for(let i=0;i<lines.length;i++)for(const[k,labels]of Object.entries(aliases))for(const label of labels){const m=lines[i].match(new RegExp('^'+label+'\\s*[:：]\\s*(.+)$'));if(m){data[k]=m[1].trim();if(label==='NexToneコード')data.society='NexTone';if(label==='JASRACコード')data.society='JASRAC';}else if(lines[i]===label&&lines[i+1]&&!/^(検索結果|管理状況|作品コード|ISWC|著作者|アーティスト名一覧)/.test(lines[i+1]))data[k]=lines[i+1];}
  const codeMatch=lines.join('\n').match(/作品コード\s*[:：]?\s*\n?\s*([0-9A-Z]{3}-\d{4}-\d)(?!\d)/i);
  if(codeMatch){data.code=codeMatch[1];data.society='JASRAC'}
  if(!data.title&&codeMatch){const ci=lines.findIndex(l=>l.includes(codeMatch[1]));const end=lines.findIndex((l,i)=>i>ci&&/^この作品は/.test(l));if(end>ci){const candidates=lines.slice(ci+1,end).filter(l=>!/^ISWC\b|^T[-－]?\d|作品コード/.test(l));if(candidates.length===1)data.title=candidates[0];}}
  for(const line of lines){if(!line.startsWith('|'))continue;const cells=line.split('|').slice(1,-1).map(clean);if(/^\d+$/.test(cells[0])&&cells.length>=3)role(cells[2],cells[1]);}
  for(const k of ['lyricist','composer'])if(authors[k].length)data[k]=authors[k].join(' / ');
  // An empty artist-list heading is not evidence of an artist name.
  for(const k of Object.keys(data))if(!data[k]||data[k].length>500)delete data[k];
  return data;
}
if(typeof module!=='undefined')module.exports={parseSongClip};
