const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],KEY='say-prompter-stacked-v4';
const questionDefs=[
['goal','어떤 것을 만들고 싶은지','예: 네이버 블로그 자동화 웹페이지 / 가족사진 상품 상세페이지 제작기'],
['behavior','어떻게 동작했으면 좋겠는지','예: 관심분야를 입력하면 글감을 모으고, 입력 내용은 미리보기에 바로 반영'],
['input','어떤 자료를 넣을지','예: 사진, 상품명, 가격, 촬영 구성, 설명, 링크'],
['result','어떤 결과가 나오면 좋을지','예: 실제로 열리는 웹페이지 / 공유 가능한 링크 / 다운로드 파일'],
['user','누가 사용할지','예: 웹을 잘 모르는 사진관 사장님 / 50~70대 초보자'],
['must','꼭 필요한 기능','예: 사진 여러 장, 순서 변경, 실시간 미리보기, 자동저장'],
['feel','어떤 느낌이면 좋을지','예: 설명서 없이 쓸 만큼 단순하고 직관적으로'],
['mobile','PC와 모바일 둘 다 사용해야 하는지','화면 크기에 따라 자연스럽게 바뀌어야 하는지 확인',['예','아니요']],
['save','작업 내용을 저장해서 나중에 이어서 써야 하는지','자동저장 또는 이어하기 기능이 필요한지 확인',['예','아니요']],
['protect','꼭 유지하거나 바뀌면 안 되는 것이 있는지','예: 기존 사진 업로드 기능과 메뉴 순서는 그대로 유지',['예','아니요']],
['external','외부 서비스 연결이 꼭 필요한지','예: 네이버 예약, 구글 로그인, 외부 편집기 연결',['예','아니요']],
['done','어디까지 되면 완성인지','예: 실제 링크가 열리고 PC·모바일에서 핵심 기능까지 확인되면 완성']
];
const principles=[
['full','풀모드로 진행해줘','설명만 하지 말고 방향이 정리되면 실제 작업까지 이어서 진행'],
['understand','먼저 내 의도를 이해했는지 설명해줘','내가 원하는 방향을 짧게 다시 설명한 뒤 작업'],
['discuss','더 필요한 논의가 있다면 이야기해보자','정말 중요한 결정만 질문하고 사소한 부분은 안정적인 기본값 사용'],
['suggest','더 좋은 방법이 있으면 제안해줘','내 방식보다 더 안정적이고 쓰기 쉬운 방법이 있으면 함께 제안']
];
let state={raw:'',answers:{},principles:principles.map(x=>x[0]),result:'',level:'full'};
function save(){state.raw=$('#ideaInput').value;try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}$('#draftState').textContent='자동 저장됨'}
function load(){try{Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{}}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),1600)}
function reveal(id){const el=$(id);el.classList.remove('hidden');setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),70)}
function buildQuestions(){const box=$('#questionGrid');box.innerHTML='';questionDefs.forEach(([key,title,example,quick],i)=>{const card=document.createElement('div');card.className='qcard'+(key==='done'?' wide':'');card.innerHTML=`<div class="qnum">QUESTION ${String(i+1).padStart(2,'0')}</div><h3>${title}</h3><div class="qexample"><strong>예시</strong> · ${example}</div>${quick?`<div class="quick" data-key="${key}">${quick.map(v=>`<button type="button" data-value="${v}">${v}</button>`).join('')}</div>`:`<input type="text" data-answer="${key}" placeholder="편하게 적어주세요">`}${['protect','external'].includes(key)?`<input class="detail hidden" type="text" data-detail="${key}" placeholder="필요한 내용을 적어주세요">`:''}`;box.appendChild(card)});
$$('[data-answer]').forEach(inp=>{inp.value=state.answers[inp.dataset.answer]||'';inp.oninput=()=>{state.answers[inp.dataset.answer]=inp.value;save()}});
$$('.quick').forEach(q=>{const key=q.dataset.key;const val=state.answers[key]||'';q.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.value===val);b.onclick=()=>{q.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');state.answers[key]=b.dataset.value;const detail=document.querySelector(`[data-detail="${key}"]`);if(detail){detail.classList.toggle('hidden',b.dataset.value==='아니요');if(b.dataset.value==='예')detail.focus()}save()}});const detail=document.querySelector(`[data-detail="${key}"]`);if(detail){detail.value=state.answers[key+'Detail']||'';detail.classList.toggle('hidden',val!=='예');detail.oninput=()=>{state.answers[key+'Detail']=detail.value;save()}}});}
function buildPrinciples(){const box=$('#principleGrid');box.innerHTML='';principles.forEach(([id,title,desc])=>{const l=document.createElement('label');l.className='principle';l.innerHTML=`<input type="checkbox" value="${id}" ${state.principles.includes(id)?'checked':''}><span><strong>${title}</strong><p>${desc}</p></span>`;l.querySelector('input').onchange=e=>{state.principles=e.target.checked?[...new Set([...state.principles,id])]:state.principles.filter(x=>x!==id);save()};box.appendChild(l)})}
function collectSummary(){const rows=questionDefs.map(([k,t])=>{let v=state.answers[k];const d=state.answers[k+'Detail'];if(v==='예'&&d)v+=' — '+d;return v?`• ${t}: ${v}`:''}).filter(Boolean);return `처음 말한 핵심 요청\n${state.raw.trim()}\n\n추가로 정리한 내용\n${rows.length?rows.join('\n'):'• 추가 답변 없음'}`}
function buildPrompt(){const detail=questionDefs.map(([k,t])=>{let v=state.answers[k];const d=state.answers[k+'Detail'];if(v==='예'&&d)v+=' — '+d;return v?`- ${t}: ${v}`:''}).filter(Boolean).join('\n');const p=state.principles.map(id=>principles.find(x=>x[0]===id)?.[1]).filter(Boolean).map(x=>'- '+x).join('\n');return `아래 내용을 바탕으로 실제 작업에 사용할 수 있는 프롬프트로 정리해줘.\n\n[내가 처음 말한 내용]\n${state.raw.trim()}\n\n[프롬프트 구성 내용]\n${detail||'- 추가 답변 없음'}\n\n[프롬프트 원칙]\n${p||'- 별도 원칙 없음'}\n\n[작업 방식]\n- 내 핵심 의도는 바꾸지 마.\n- 부족하거나 애매한 부분은 실제 작업에 꼭 필요한 범위에서만 보완해줘.\n- 질문이 꼭 필요하다면 중요한 것만 물어보고, 사소한 부분은 가장 안정적이고 사용하기 좋은 방식으로 판단해줘.\n- 내가 생각한 방법보다 더 좋은 방법이 있다면 함께 제안해줘.\n- 방향에 큰 문제가 없다면 설명으로 끝내지 말고 실제 작업까지 진행해줘.\n\n[완료 전 확인]\n- 내가 요청한 핵심 내용이 빠짐없이 반영되었는지 확인해줘.\n- 입력한 내용이 결과에 제대로 반영되는지 확인해줘.\n- 화면이나 이미지가 있다면 의도한 크기와 배치로 보이는지 확인해줘.\n- PC와 모바일이 필요한 경우 둘 다 자연스럽게 보이는지 확인해줘.\n- 문제가 발견되면 수정한 뒤 다시 확인해줘.`}
function showResult(){state.result=buildPrompt();$('#resultOutput').value=state.result;$('#understandBox').textContent=collectSummary();reveal('#understandSection')}
function finalReveal(){reveal('#resultSection')}
function copyText(t){navigator.clipboard?.writeText(t).then(()=>toast('복사했어요.')).catch(()=>{const x=document.createElement('textarea');x.value=t;document.body.appendChild(x);x.select();document.execCommand('copy');x.remove();toast('복사했어요.')})}
load();$('#ideaInput').value=state.raw||'';buildQuestions();buildPrinciples();$('#ideaInput').oninput=save;
$$('.chip').forEach(b=>b.onclick=()=>{$('#ideaInput').value=b.dataset.example;save()});
$('#makeBtn').onclick=()=>{if(!$('#ideaInput').value.trim())return toast('먼저 하고 싶은 일을 적어주세요.');state.raw=$('#ideaInput').value.trim();buildQuestions();buildPrinciples();reveal('#questionSection');reveal('#principleSection')};
$('#summarizeBtn').onclick=()=>{save();showResult()};
$('#editQuestionsBtn').onclick=()=>$('#questionSection').scrollIntoView({behavior:'smooth'});
$('#confirmBtn').onclick=finalReveal;
$('#resultOutput').oninput=e=>{state.result=e.target.value;save()};
$('#applyRefineBtn').onclick=()=>{const v=$('#refineInput').value.trim();if(!v)return toast('수정할 내용을 적어주세요.');$('#resultOutput').value+=`\n\n[추가 수정 요청]\n- ${v}\n- 위 프롬프트의 나머지 핵심 의도는 유지해줘.`;state.result=$('#resultOutput').value;$('#refineInput').value='';save();toast('반영했어요.')};
$('#copyBtn').onclick=()=>copyText($('#resultOutput').value);
$('#gptBtn').onclick=()=>copyText($('#resultOutput').value+`\n\n위 내용을 바탕으로 실제 작업에 바로 사용할 수 있도록 프롬프트를 한 단계 더 구체적으로 다듬어줘. 내 핵심 의도는 바꾸지 말고, 빠진 조건이나 애매한 부분이 있다면 필요한 범위에서 보완해줘. 먼저 내가 원하는 방향을 어떻게 이해했는지 짧게 정리해줘. 꼭 필요한 질문이 있다면 최대 3개까지만 해주고, 사소한 부분은 가장 안정적이고 사용하기 좋은 방식으로 판단해줘. 내가 생각한 방법보다 더 좋은 방법이 있다면 함께 제안해줘. 방향에 큰 문제가 없다면 실제 작업에 사용할 수 있는 최종 프롬프트까지 완성해줘.`);
function reset(){if(!confirm('현재 내용을 비우고 새로 시작할까요?'))return;localStorage.removeItem(KEY);location.reload()}$('#newBtn').onclick=reset;$('#restartBtn').onclick=()=>$('#ideaInput').scrollIntoView({behavior:'smooth'});
if(state.result){$('#questionSection').classList.remove('hidden');$('#principleSection').classList.remove('hidden');$('#understandSection').classList.remove('hidden');$('#resultSection').classList.remove('hidden');$('#understandBox').textContent=collectSummary();$('#resultOutput').value=state.result}