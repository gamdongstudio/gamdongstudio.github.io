const KEY='say-prompter-restore-v1';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const screens={home:$('#screenHome'),method:$('#screenMethod'),input:$('#screenInput'),understand:$('#screenUnderstand'),suggest:$('#screenSuggest'),final:$('#screenFinal')};
let state={mode:'',method:'free',raw:'',understanding:'',selected:[],level:'basic',fileName:'',extra:'',final:''};
const GPT_SUFFIX=`위 내용을 바탕으로 실제 작업에 바로 사용할 수 있도록
프롬프트를 한 단계 더 구체적으로 다듬어줘.

내 핵심 의도는 바꾸지 말고,
빠진 조건이나 애매한 부분이 있다면 필요한 범위에서 보완해줘.

먼저 내가 원하는 방향을 어떻게 이해했는지 짧게 정리해줘.

꼭 필요한 질문이 있다면 최대 3개까지만 해주고,
사소한 부분은 가장 안정적이고 사용하기 좋은 방식으로 판단해줘.

내가 생각한 방법보다 더 좋은 방법이 있다면 함께 제안해줘.

방향에 큰 문제가 없다면 실제 작업에 사용할 수 있는
최종 프롬프트까지 완성해줘.`;
function save(){localStorage.setItem(KEY,JSON.stringify(state));$('#savedAt').textContent='최근 작업 저장됨 · '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s)state={...state,...s};}catch(e){}}
function show(name){Object.entries(screens).forEach(([k,v])=>v.classList.toggle('hidden',k!==name));$('#hero').classList.toggle('hidden',name!=='home');window.scrollTo({top:0,behavior:'smooth'});}
function start(mode){state.mode=mode;state.method='free';state.raw='';state.understanding='';state.selected=[];state.extra='';state.final='';state.fileName='';save();if(mode==='edit'){state.method='image';renderInput();show('input')}else show('method');}
function currentRaw(){if(state.method==='guided'){const parts=[['만들고 싶은 것',$('#gGoal').value],['사용자',$('#gUser').value],['원하는 결과',$('#gResult').value],['꼭 필요한 기능/내용',$('#gMust').value],['중요한 조건',$('#gExtra').value]].filter(x=>x[1].trim());return parts.map(x=>x[0]+': '+x[1].trim()).join('\n');}if(state.method==='image')return $('#imageText').value.trim();return $('#freeText').value.trim();}
function renderInput(){const edit=state.mode==='edit';$('#inputTitle').textContent=edit?'어디를 어떻게 바꾸고 싶은지 말해주세요.':'하고 싶은 걸 편하게 말해주세요.';$('#inputSub').textContent=edit?'스크린샷이 있으면 함께 고르고, 바꾸고 싶은 부분과 그대로 둘 부분을 말하면 됩니다.':'문장 순서나 표현은 신경 쓰지 않아도 됩니다.';$('#freeFields').classList.toggle('hidden',state.method!=='free');$('#guidedFields').classList.toggle('hidden',state.method!=='guided');$('#imageFields').classList.toggle('hidden',state.method!=='image');if(edit)$('#imageText').placeholder='예: 첫 번째 화면의 구조가 더 좋아. 사진과 버튼은 그대로 두고 배치와 크기만 저 화면처럼 되돌려줘. 다른 정상 기능은 건드리지 마.';show('input');}
function classify(t){const x=t.toLowerCase();if(/홈페이지|웹사이트|사이트|페이지|웹 도구|상세페이지/.test(x))return'웹사이트/웹도구';if(/프로그램|앱|관리|예약|crm|도구/.test(x))return'프로그램/업무도구';if(/이미지|사진|로고|포스터|배너|그림/.test(x))return'이미지';if(/글|문서|메일|후기|홍보|공지|시나리오/.test(x))return'글/문서';return'작업';}
function signals(t){const out=[];const rules=[['PC와 모바일 모두 자연스럽게 보여야 함',/모바일|반응형|pc|컴퓨터/],['작업 내용을 저장하고 나중에 이어서 사용할 수 있어야 함',/저장|이어|다시 접속|자동저장/],['입력하거나 수정한 내용이 화면에 바로 반영되어야 함',/미리보기|바로 반영|실시간/],['사진이나 이미지를 여러 장 다루고 순서·배치를 쉽게 바꿀 수 있어야 함',/사진|이미지|순서|배치|드래그/],['초보자도 설명서 없이 사용할 만큼 단순하고 직관적이어야 함',/초보|쉽게|직관|설명서|간단/],['완성 결과를 링크로 열거나 공유할 수 있어야 함',/링크|공유|주소/],['작업이 끝나면 실제 동작과 화면을 확인해야 함',/확인|테스트|검수|오류/],['이번 요청과 관계없는 기존 기능과 디자인은 유지해야 함',/그대로|유지|건드리지|기존|이것만|부분만/]];rules.forEach(r=>r[1].test(t)&&out.push(r[0]));return [...new Set(out)];}
function makeUnderstanding(raw){const kind=classify(raw);const sig=signals(raw);const edit=state.mode==='edit';let lines=[];if(edit){lines.push('현재 결과물 전체를 새로 만드는 것이 아니라, 필요한 부분만 수정하려는 작업으로 이해했어요.');}else{lines.push(kind+'를 새로 만들려는 작업으로 이해했어요.');}const first=raw.split(/\n|(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean)[0]||raw;lines.push('핵심 요청: '+first.replace(/[.!?]$/,''));if(sig.length)lines.push('특히 중요해 보이는 조건:\n- '+sig.join('\n- '));if(state.fileName)lines.push('참고 이미지: '+state.fileName+' (GPT에서 작업할 때 같은 이미지를 함께 첨부)');lines.push(edit?'수정 범위 밖의 정상 기능은 가능한 한 그대로 유지하는 방향이 적합해 보여요.':'사용자가 말하지 않은 큰 기능을 임의로 늘리기보다, 필요한 조건만 보완하는 방향이 적합해 보여요.');return lines.join('\n\n');}
function suggestionPool(raw){const x=raw.toLowerCase(), arr=[];const add=(id,title,desc)=>arr.push({id,title,desc});if(/홈페이지|웹사이트|사이트|페이지|프로그램|도구|앱/.test(x)){add('mobile','모바일 대응','PC와 모바일에서 모두 레이아웃이 깨지지 않도록 반응형 기준을 포함합니다.');add('preview','즉시 반영·미리보기','입력이나 설정 변경이 결과에 바로 반영되는지 확인하도록 합니다.');add('save','자동저장·이어하기','작업 도중 닫아도 최근 내용을 이어서 사용할 수 있게 합니다.');add('test','완료 후 실제 테스트','버튼, 입력, 모바일, 새로고침 등 주요 흐름을 직접 확인하게 합니다.');}
if(/사진|이미지/.test(x)){add('imagefit','사진 크기·잘림 확인','사진이 찌그러지거나 의도치 않게 잘리지 않는지 검수하도록 합니다.');}
if(state.mode==='edit'||/유지|건드리지|그대로|부분만/.test(x)){add('preserve','기존 정상 기능 유지','요청한 부분 외의 기능·텍스트·디자인은 변경하지 않도록 범위를 명확히 합니다.');add('scope','수정 범위 최소화','전체를 다시 만들지 말고 필요한 부분만 수정하도록 합니다.');}
if(state.method==='image'){add('reference','첨부 이미지 기준 명확화','이미지는 새 디자인 아이디어가 아니라 위치·크기·간격·정렬 등 무엇을 참고할지 구분해 적도록 합니다.');}
add('simple','초보자 중심','전문 용어와 불필요한 설정을 줄이고 화면만 보고도 사용할 수 있게 합니다.');
return [...new Map(arr.map(x=>[x.id,x])).values()];}
function renderSuggestions(){const pool=suggestionPool(state.raw);if(!state.selected.length)state.selected=pool.map(x=>x.id);$('#suggestions').innerHTML=pool.map(x=>`<label class="suggestion"><input type="checkbox" value="${x.id}" ${state.selected.includes(x.id)?'checked':''}><span><b>${x.title}</b><p>${x.desc}</p></span></label>`).join('');}
function selectedSuggestionLines(){const pool=suggestionPool(state.raw);const ids=new Set(state.selected);return pool.filter(x=>ids.has(x.id)).map(x=>'- '+x.title+': '+x.desc);}
function makeFinal(level=state.level){const edit=state.mode==='edit';const raw=state.raw.trim();const selected=selectedSuggestionLines();const understanding=state.understanding.trim();const imageLine=state.fileName?`\n- 참고 이미지 파일: ${state.fileName}\n- 실제 작업을 요청할 때 이 이미지도 함께 첨부해서 참고하게 해줘.`:'';const extra=state.extra?`\n\n# 추가로 반영할 내용\n${state.extra}`:'';
if(level==='short')return `${edit?'현재 결과물을 아래 요청대로 수정해줘.':'아래 요구사항을 바탕으로 결과물을 만들어줘.'}\n\n${raw}${imageLine}\n\n중요:\n${edit?'- 요청한 부분만 수정하고, 관련 없는 기존 정상 기능과 디자인은 유지해줘.\n':''}${selected.join('\n')}\n- 애매한 세부사항은 가장 안정적이고 사용하기 쉬운 방식으로 판단해줘.\n- 완료 후 실제로 정상 동작하는지 확인하고 문제가 있으면 수정해줘.${extra}`;
let detail=`# 작업 목적\n${edit?'현재 결과물의 핵심 구조와 정상 기능을 유지하면서, 사용자가 요청한 부분만 정확하게 수정하는 것':'사용자가 설명한 핵심 의도를 바꾸지 않고 실제로 사용할 수 있는 결과물을 만드는 것'}\n\n# 사용자가 말한 원문\n${raw}${imageLine}\n\n# SAY가 이해한 방향\n${understanding}\n\n# 함께 반영할 조건\n${selected.length?selected.join('\n'):'- 사용자가 명시한 요구사항만 우선 반영'}\n\n# 작업 원칙\n- 사용자의 핵심 의도를 임의로 바꾸지 마.\n- 사용자가 요청하지 않은 큰 기능을 마음대로 추가하지 마.\n- 사소한 간격, 버튼 크기, 반응형 기준 등은 가장 안정적이고 사용하기 쉬운 방식으로 판단해줘.\n- 전문 용어보다 실제 사용자가 이해하기 쉬운 표현과 흐름을 우선해줘.\n${edit?'- 이번 요청과 관련 없는 기존 기능, 텍스트, 데이터, 디자인은 가능한 한 변경하지 마.\n- 전체를 새로 만들기보다 요청 범위를 최소한으로 수정해줘.\n':''}\n# 완료 후 확인\n- 사용자가 요청한 핵심 내용이 빠짐없이 반영됐는지 확인해줘.\n- 주요 버튼·입력·링크 등 실제 동작이 정상인지 확인해줘.\n- PC와 모바일에서 화면이 깨지거나 불필요한 가로 스크롤이 생기지 않는지 확인해줘.\n${/사진|이미지/.test(raw)?'- 사진이나 이미지가 의도한 크기와 비율로 보이고, 이상하게 잘리거나 찌그러지지 않는지 확인해줘.\n':''}- 문제가 발견되면 가능한 범위에서 직접 수정하고 다시 확인해줘.`;
if(level==='precise')detail+=`\n\n# 진행 방식\n1. 먼저 내가 원하는 방향을 짧게 정리해줘.\n2. 꼭 필요한 질문이 있다면 최대 3개까지만 해줘.\n3. 질문하지 않아도 되는 사소한 부분은 안정적인 기본값으로 판단해서 계속 진행해줘.\n4. 내가 생각한 방식보다 더 안정적이고 쉬운 방법이 있다면 핵심 의도를 해치지 않는 범위에서 제안해줘.\n5. 방향에 큰 문제가 없으면 실제 작업까지 진행해줘.\n6. 작업 후 변경 내용과 확인 결과를 짧게 알려줘.`;
return detail+extra;}
function buildFinal(){state.final=makeFinal(state.level);$('#finalOutput').value=state.final;save();show('final');}
function toast(msg){const d=document.createElement('div');d.className='toast';d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('복사했어요 ✓')}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('복사했어요 ✓')}}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.mode)));
$$('[data-method]').forEach(b=>b.addEventListener('click',()=>{state.method=b.dataset.method;renderInput()}));
$$('[data-back]').forEach(b=>b.addEventListener('click',()=>{const x=b.dataset.back;if(x==='home')show('home');if(x==='method')state.mode==='edit'?show('home'):show('method');if(x==='input')renderInput();if(x==='understand')show('understand');if(x==='suggest')show('suggest')}));
$('#imageFile').addEventListener('change',e=>{const f=e.target.files[0];state.fileName=f?f.name:'';const p=$('#filePreview');if(f){p.className='preview-file';p.innerHTML=`<span>📎 ${f.name}</span><span>${Math.round(f.size/1024)} KB</span>`}else p.className='hidden';save()});
$('#understandBtn').addEventListener('click',()=>{const raw=currentRaw();if(!raw){toast('하고 싶은 내용을 먼저 적어주세요.');return}state.raw=raw;state.understanding=makeUnderstanding(raw);$('#understandText').textContent=state.understanding;$('#understandEdit').value=state.understanding;$('#originalText').textContent=raw;$('#understandEditWrap').classList.add('hidden');save();show('understand')});
$('#editUnderstanding').addEventListener('click',()=>{$('#understandEditWrap').classList.toggle('hidden');$('#understandEdit').focus()});
$('#confirmUnderstanding').addEventListener('click',()=>{if(!$('#understandEditWrap').classList.contains('hidden'))state.understanding=$('#understandEdit').value.trim()||state.understanding;renderSuggestions();save();show('suggest')});
$('#skipSuggestion').addEventListener('click',()=>{if(!$('#understandEditWrap').classList.contains('hidden'))state.understanding=$('#understandEdit').value.trim()||state.understanding;state.selected=[];buildFinal()});
$('#withSuggestions').addEventListener('click',()=>{state.selected=$$('#suggestions input:checked').map(x=>x.value);buildFinal()});
$('#withoutSuggestions').addEventListener('click',()=>{state.selected=[];buildFinal()});
$$('[data-level]').forEach(b=>b.addEventListener('click',()=>{state.level=b.dataset.level;$$('[data-level]').forEach(x=>x.classList.toggle('on',x===b));state.final=makeFinal(state.level);$('#finalOutput').value=state.final;save()}));
$('#finalOutput').addEventListener('input',()=>{state.final=$('#finalOutput').value;save()});
$('#applyContinue').addEventListener('click',()=>{const v=$('#continueInput').value.trim();if(!v)return;state.extra=state.extra?state.extra+'\n- '+v:'- '+v;state.final=makeFinal(state.level);$('#finalOutput').value=state.final;$('#continueInput').value='';save();toast('추가 내용을 반영했어요.')});
$('#copyFinal').addEventListener('click',()=>copyText($('#finalOutput').value));
$('#gptFinal').addEventListener('click',()=>{$('#gptText').value=$('#finalOutput').value.trim()+'\n\n---\n\n'+GPT_SUFFIX;$('#gptModal').classList.remove('hidden')});
$('#closeModal').addEventListener('click',()=>$('#gptModal').classList.add('hidden'));$('#gptModal').addEventListener('click',e=>{if(e.target.id==='gptModal')$('#gptModal').classList.add('hidden')});$('#copyGpt').addEventListener('click',()=>copyText($('#gptText').value));
function reset(){if(state.raw&&!confirm('현재 작업을 비우고 새로 시작할까요?'))return;state={mode:'',method:'free',raw:'',understanding:'',selected:[],level:'basic',fileName:'',extra:'',final:''};localStorage.removeItem(KEY);['#freeText','#gGoal','#gUser','#gResult','#gMust','#gExtra','#imageText','#continueInput'].forEach(s=>{const el=$(s);if(el)el.value=''});show('home')}
$('#newTop').addEventListener('click',reset);$('#restartFinal').addEventListener('click',reset);$('#brandHome').addEventListener('click',()=>show('home'));
$('#continueDraft').addEventListener('click',()=>{load();if(state.final){$('#finalOutput').value=state.final;$$('[data-level]').forEach(x=>x.classList.toggle('on',x.dataset.level===state.level));show('final')}else if(state.raw){$('#understandText').textContent=state.understanding||makeUnderstanding(state.raw);$('#understandEdit').value=state.understanding;$('#originalText').textContent=state.raw;show('understand')}else{toast('이어갈 작업이 아직 없어요.')}});
load();
if(state.final){$('#continueDraft').textContent='최근 작업 이어하기'}