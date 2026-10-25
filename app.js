'use strict';
const KEY='license-study-v7';const OLD='exam-linked-v2';const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const all=EXAM_QUESTIONS;const byId=new Map(all.map(q=>[String(q.id),q]));
const defaults={ratings:{},attempts:{},seen:{},category:'all',difficulty:'all',includeVisual:false,session:[],cursor:0,round:0};
let state={...defaults};try{state={...state,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{}
for(const key of ['ratings','attempts','seen'])if(!state[key]||typeof state[key]!=='object')state[key]={};
// Convert v6 per-note progress to unique question IDs, preserving the most difficult rating.
if(!localStorage.getItem(KEY))try{
 const old=JSON.parse(localStorage.getItem(OLD)||'{}');const oldRatings=old.ratings||{},oldAttempts=old.attempts||{};
 const rank={high:3,mid:2,low:1};
 for(const [k,r] of Object.entries(oldRatings)){const id=k.match(/-(\d+)$/)?.[1];if(id&&byId.has(id)&&rank[r]>(rank[state.ratings[id]]||0))state.ratings[id]=r;}
 for(const [k,v] of Object.entries(oldAttempts)){const id=k.match(/-(\d+)$/)?.[1];if(id&&byId.has(id)){const prev=state.attempts[id]||{count:0,wrong:0};state.attempts[id]={count:Math.max(prev.count,v.count||0),wrong:Math.max(prev.wrong,v.wrong||0)};if(v.count)state.seen[id]=true;}}
}catch{}
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a};
const eligible=()=>all.filter(q=>(state.category==='all'||q.category===state.category)&&(state.includeVisual||!q.audit.needsVisual)&&(state.difficulty==='all'||(state.difficulty==='unrated'?!state.ratings[q.id]:state.difficulty==='wrong'?((state.attempts[q.id]?.wrong||0)>0):state.ratings[q.id]===state.difficulty)));
// One ID per round; new/unrated first, then mid/high, low last. Shuffle inside each bucket.
function newRound(){const qs=eligible(),groups=[[],[],[],[]];for(const q of qs){const r=state.ratings[q.id];const g=!r?0:r==='high'?1:r==='mid'?2:3;groups[g].push(String(q.id));}state.session=groups.flatMap(g=>shuffle(g));state.cursor=0;state.round++;save();}
function ensureSession(){const allowed=new Set(eligible().map(q=>String(q.id)));if(!Array.isArray(state.session)||!state.session.length||state.session.some(id=>!allowed.has(String(id)))||new Set(state.session.map(String)).size!==allowed.size)newRound();if(state.cursor<0||state.cursor>=state.session.length)state.cursor=0;}
let picked=[],revealed=false;
function current(){return byId.get(String(state.session[state.cursor]));}
function stats(){const qs=eligible();const remaining=state.session.slice(state.cursor).length;const seen=qs.filter(q=>state.seen[q.id]).length;const hard=qs.filter(q=>state.ratings[q.id]==='high').length;$('stats').textContent=`학습 가능 ${qs.length}문항 · 이번 회차 남음 ${remaining} · 풀이 기록 ${seen} · 어려움 ${hard}`;}
function render(){ensureSession();const q=current();$('study').hidden=!q;$('empty').hidden=!!q;stats();if(!q){$('empty').textContent='해당 조건의 문항이 없습니다. 필터를 변경하거나 시각자료 검토 문항을 포함해 주세요.';return;}
 $('position').textContent=`${state.cursor+1} / ${state.session.length} · 문제은행 ${q.id}번 · ${state.round}회차`;
 $('topic').textContent=q.category+' · '+(q.audit.needsVisual?'시각자료 확인 필요':'원문 선택지·정답 대조');
 $('question').textContent=q.question;
 $('visualNotice').hidden=true;const visual=$('questionImage');if(q.image){visual.hidden=false;visual.src='./'+q.image;visual.alt='문제은행 '+q.id+'번 원본 그림';}else{visual.hidden=true;visual.removeAttribute('src');}
 $('options').innerHTML=q.options.map((o,i)=>`<button class="option ${picked.includes(i+1)?'selected':''} ${revealed&&q.correct.includes(i+1)?'correct':''} ${revealed&&picked.includes(i+1)&&!q.correct.includes(i+1)?'wrong':''}" data-opt="${i+1}" ${revealed?'disabled':''}><b>${'①②③④⑤'[i]}</b><span>${esc(o)}</span></button>`).join('');
 document.querySelectorAll('[data-opt]').forEach(el=>el.onclick=()=>{const n=Number(el.dataset.opt);if(q.correct.length===1)picked=[n];else picked=picked.includes(n)?picked.filter(v=>v!==n):[...picked,n];render();});
 $('check').hidden=revealed;$('check').disabled=picked.length!==q.correct.length;$('result').hidden=!revealed;
 if(revealed){const ok=picked.length===q.correct.length&&picked.every(n=>q.correct.includes(n));$('verdict').textContent=(ok?'정답입니다. ':'오답입니다. ')+'정답 '+q.correct.map(i=>'①②③④⑤'[i-1]).join(', ');
 const s=q.solutionV9;const block=(heading,t)=>`<div class="solution-row"><b>${heading}</b><p>${esc(t)}</p></div>`;
 $('memo').innerHTML=block('정답 핵심 · 왜 그런가?',s.why)+block('착각하기 쉬운 조건 · 바른 이해',s.contrast)+block('한 줄 암기',s.memory)+(s.options.length?`<details class="option-review"><summary>확인된 선택지별 보충 설명</summary>${s.options.map(o=>`<div class="option-analysis"><b>${'①②③④⑤'[o.n-1]}</b><p>${esc(o.detail)}</p></div>`).join('')}</details>`:'');
 $('memoSource').textContent=`문제은행 ${q.id}번 · ${s.grade}`;
 $('explanation').textContent='법령 나열형 원문 해설은 학습 화면에서 생략했습니다. 핵심 풀이만 확인하세요.';}
 $('ratingStatus').textContent='현재 난이도: '+({high:'상',mid:'중',low:'하'}[state.ratings[q.id]]||'미분류');
}
function move(delta){if(!state.session.length)return;const next=state.cursor+delta;if(next>=state.session.length){newRound();$('roundToast').textContent='이번 회차를 완료했습니다. 다음 회차에서는 어려운 문항이 앞쪽에 배치됩니다.';}else if(next<0){return;}else state.cursor=next;picked=[];revealed=false;save();render();}
$('check').onclick=()=>{const q=current();if(!q||revealed)return;const ok=picked.length===q.correct.length&&picked.every(n=>q.correct.includes(n));const id=String(q.id),prev=state.attempts[id]||{count:0,wrong:0};state.attempts[id]={count:prev.count+1,wrong:prev.wrong+(ok?0:1),last:Date.now()};state.seen[id]=true;revealed=true;save();render();};
$('next').onclick=()=>move(1);$('prev').onclick=()=>move(-1);
document.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{const q=current();if(!q)return;state.ratings[q.id]=b.dataset.rate;save();move(1);});
$('category').innerHTML='<option value="all">전체 주제</option>'+[...new Set(all.map(q=>q.category))].sort().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
for(const id of ['category','difficulty']){const el=$(id);el.value=state[id];if(el.selectedIndex<0){state[id]='all';el.value='all';}el.onchange=()=>{state[id]=el.value;newRound();picked=[];revealed=false;render();};}
$('includeVisual').checked=!!state.includeVisual;$('includeVisual').onchange=()=>{state.includeVisual=$('includeVisual').checked;newRound();picked=[];revealed=false;render();};
$('restart').onclick=()=>{if(confirm('새 무작위 회차를 시작할까요? 학습기록은 유지됩니다.')){newRound();picked=[];revealed=false;render();}};
$('backup').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({version:7,state,exported:new Date().toISOString()},null,2)],{type:'application/json'}));a.download='운전면허_학습기록_v7.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);};
$('restore').onclick=()=>$('restoreFile').click();$('restoreFile').onchange=async e=>{try{const obj=JSON.parse(await e.target.files[0].text());if(obj.version!==7||!obj.state||typeof obj.state.ratings!=='object')throw Error('v7 백업 파일이 아닙니다');if(confirm('기존 학습기록을 덮어쓸까요?')){state={...defaults,...obj.state};save();location.reload();}}catch(err){alert('복원 실패: '+err.message)}};
$('reset').onclick=()=>{if(confirm('학습기록을 모두 삭제할까요?')){localStorage.removeItem(KEY);location.reload();}};
$('auditSummary').textContent=`고유 문항 ${all.length}개 · 그림 ${all.filter(q=>q.image).length}개 · 핵심 풀이 간결화 · 법령 조항 나열 제거 · 선택지별 미검증 설명 숨김.`;
ensureSession();save();render();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
