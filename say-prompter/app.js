const STORAGE_KEY = 'say-prompter-v1';

const ideaInput = document.getElementById('ideaInput');
const makeBtn = document.getElementById('makeBtn');
const resultSection = document.getElementById('resultSection');
const resultOutput = document.getElementById('resultOutput');
const typeBadge = document.getElementById('typeBadge');
const draftState = document.getElementById('draftState');
const newBtn = document.getElementById('newBtn');
const refineBtn = document.getElementById('refineBtn');
const copyBtn = document.getElementById('copyBtn');
const gptBtn = document.getElementById('gptBtn');
const refinePanel = document.getElementById('refinePanel');
const refineInput = document.getElementById('refineInput');
const applyRefineBtn = document.getElementById('applyRefineBtn');
const actionNote = document.getElementById('actionNote');
const gptModal = document.getElementById('gptModal');
const gptCombined = document.getElementById('gptCombined');
const modalClose = document.getElementById('modalClose');
const copyCombinedBtn = document.getElementById('copyCombinedBtn');

const GPT_SUFFIX = `위 내용을 바탕으로 실제 작업에 바로 사용할 수 있도록
프롬프트를 한 단계 더 구체적으로 다듬어줘.

내 핵심 의도는 바꾸지 말고,
빠진 조건이나 애매한 부분이 있다면 필요한 범위에서 보완해줘.

먼저 내가 원하는 방향을 어떻게 이해했는지 짧게 정리해줘.

꼭 필요한 질문이 있다면 최대 3개까지만 해주고,
사소한 부분은 가장 안정적이고 사용하기 좋은 방식으로 판단해줘.

내가 생각한 방법보다 더 좋은 방법이 있다면 함께 제안해줘.

방향에 큰 문제가 없다면 실제 작업에 사용할 수 있는
최종 프롬프트까지 완성해줘.`;

const TYPES = {
  website: { label: '웹사이트 / 웹도구', words: ['홈페이지','웹사이트','사이트','랜딩','상세페이지','페이지','웹 제작','웹도구','쇼핑몰'] },
  program: { label: '프로그램 / 업무도구', words: ['프로그램','앱','도구','관리','예약','고객관리','crm','대시보드','자동 저장','로그인'] },
  image: { label: '이미지 제작', words: ['이미지','사진 만들어','포스터','배너','썸네일','로고','일러스트','그림','카드뉴스'] },
  writing: { label: '글 / 문서 작성', words: ['글','문서','소개글','후기','홍보 글','메일','문자','공지','보고서','기획서','제안서','시나리오'] },
  automation: { label: '자동화', words: ['자동화','자동으로','반복','수집','연동','워크플로','업무 자동'] },
  presentation: { label: '강의 / 발표자료', words: ['ppt','파워포인트','슬라이드','강의자료','발표자료','교재'] }
};

function normalize(text) {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function classify(text) {
  const lower = text.toLowerCase();
  let best = { key: 'general', score: 0, label: '일반 작업' };
  for (const [key, info] of Object.entries(TYPES)) {
    const score = info.words.reduce((sum, word) => sum + (lower.includes(word.toLowerCase()) ? 1 : 0), 0);
    if (score > best.score) best = { key, score, label: info.label };
  }
  if (best.key === 'website' && /프로그램|관리|예약|crm|도구/.test(lower)) {
    return { key: 'program', label: TYPES.program.label };
  }
  return best;
}

function extractSignals(text) {
  const found = [];
  const rules = [
    ['모바일에서도 자연스럽게 보이기', /모바일|반응형|휴대폰/],
    ['PC에서도 안정적으로 보이기', /pc|컴퓨터|데스크톱/],
    ['작업 내용을 저장하고 나중에 이어서 사용하기', /저장|이어|다시 접속|자동저장/],
    ['입력한 내용이 결과나 미리보기에 바로 반영되기', /미리보기|바로 반영|실시간/],
    ['여러 개의 사진·이미지를 등록하고 관리하기', /사진.*여러|여러.*사진|이미지.*여러|여러 장/],
    ['사진이나 항목의 순서를 쉽게 바꾸기', /순서|드래그|배치/],
    ['초보자도 설명 없이 사용할 수 있을 만큼 단순하게 만들기', /초보|쉽게|직관|설명서|간단/],
    ['완성 결과를 링크로 열고 공유할 수 있게 하기', /링크|공유|주소/],
    ['작업이 끝난 뒤 실제 동작을 확인하고 오류를 수정하기', /확인해|테스트|검수|오류/],
    ['가격 정보를 입력하고 보여주기', /가격|금액/],
    ['오시는 길이나 위치 정보를 보여주기', /오시는 길|주소|위치|지도/],
    ['연락처 또는 문의 방법을 보여주기', /연락처|문의|전화|카톡/]
  ];
  for (const [label, re] of rules) if (re.test(text)) found.push(label);
  return [...new Set(found)];
}

function splitMeaningful(text) {
  return normalize(text)
    .split(/(?<=[.!?요다죠])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length >= 4)
    .slice(0, 8);
}

function inferGoal(text, type) {
  const first = splitMeaningful(text)[0] || text;
  const cleaned = first.replace(/^(저는|나는|제가)\s*/, '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 110) return cleaned.replace(/[.!?]$/, '');
  return cleaned.slice(0, 107) + '…';
}

function formatUserNeeds(text) {
  const sentences = splitMeaningful(text);
  if (!sentences.length) return `- ${text}`;
  return sentences.map(s => `- ${s.replace(/[.!?]$/, '')}`).join('\n');
}

function makeWebsitePrompt(text, type) {
  const signals = extractSignals(text);
  const goal = inferGoal(text, type);
  const defaults = [
    '처음 보는 사람도 화면만 보고 다음 행동을 이해할 수 있는 단순한 흐름으로 구성',
    'PC와 모바일에서 모두 자연스럽게 보이는 반응형 구성',
    '입력·수정 결과가 가능한 한 즉시 화면에 반영되도록 구성',
    '이번 요청과 관계없는 기능은 과하게 추가하지 않기'
  ];
  const verification = [
    '주요 버튼과 입력 기능이 실제로 동작하는지',
    'PC와 모바일에서 레이아웃이 깨지거나 가로 스크롤이 생기지 않는지',
    '사용자가 입력하거나 수정한 내용이 의도대로 결과에 반영되는지',
    '새로고침이나 다시 접속했을 때 저장이 필요한 내용이 유지되는지'
  ];
  if (/사진|이미지/.test(text)) verification.push('사진이 찌그러지거나 의도치 않게 잘리지 않는지');
  if (/링크|공유/.test(text)) verification.push('완성 결과 링크가 정상적으로 열리는지');

  return `아래 요구사항을 바탕으로 실제로 사용할 수 있는 ${type.label}을 만들어줘.\n\n# 내가 만들고 싶은 것\n${goal}\n\n# 내가 말한 요구사항\n${formatUserNeeds(text)}\n\n# 구현할 때 꼭 지켜줬으면 하는 것\n${[...signals, ...defaults.filter(d => !signals.some(s => s.includes(d.split(' ')[0])))].map(x => `- ${x}`).join('\n')}\n\n# 화면과 사용 흐름\n- 처음 사용하는 사람도 설명서를 읽지 않고 사용할 수 있게 해줘.\n- 가장 중요한 입력이나 행동을 먼저 보여주고, 부가 기능은 필요할 때만 보이게 해줘.\n- 전문 용어보다 일반 사용자가 이해하기 쉬운 표현을 사용해줘.\n- 모바일에서는 버튼과 입력칸이 손가락으로 누르기 충분한 크기가 되게 해줘.\n\n# 구현 방식\n- 세부적인 여백, 버튼 크기, 반응형 기준처럼 사소한 결정은 가장 안정적이고 사용하기 쉬운 방식으로 판단해줘.\n- 사용자가 말하지 않은 큰 기능을 임의로 추가하거나 핵심 흐름을 바꾸지 마.\n- 되도록 복잡한 설정 화면보다 입력 → 바로 결과 확인 흐름을 우선해줘.\n\n# 작업 완료 후 확인\n${verification.map(x => `- ${x}`).join('\n')}\n- 문제가 발견되면 가능한 범위에서 직접 수정한 뒤 다시 확인해줘.\n\n# 최종 목표\n사용자가 처음 접속했을 때 무엇을 해야 하는지 고민하지 않고 바로 사용할 수 있고, 내가 처음 말한 핵심 의도가 결과물에 빠짐없이 반영된 상태로 완성해줘.`;
}

function makeImagePrompt(text, type) {
  return `아래 내용을 바탕으로 바로 이미지 제작에 사용할 수 있는 프롬프트로 정리해줘.\n\n# 만들고 싶은 이미지\n${inferGoal(text, type)}\n\n# 내가 말한 조건\n${formatUserNeeds(text)}\n\n# 이미지 제작 기준\n- 핵심 주제가 가장 먼저 눈에 들어오게 구성해줘.\n- 요청한 분위기, 인물·사물, 배경, 비율, 텍스트 여부가 있다면 빠뜨리지 마.\n- 내가 명확히 말하지 않은 세부 요소는 전체 분위기를 해치지 않는 자연스러운 기본값으로 정해줘.\n- 불필요한 장식이나 과한 요소를 임의로 추가하지 마.\n- SNS나 출력물처럼 사용처가 드러나면 그 매체에 맞는 비율과 여백을 고려해줘.\n\n# 최종 확인\n- 요청한 핵심 요소가 빠지지 않았는지\n- 이미지 비율과 구도가 사용 목적에 맞는지\n- 글자가 필요한 경우 잘리지 않고 읽기 쉬운지\n- 인물이나 사물이 어색하게 변형되지 않았는지\n\n내 의도는 유지하면서 실제 이미지 생성에 바로 넣을 수 있는 한 번에 이해되는 최종 프롬프트로 완성해줘.`;
}

function makeWritingPrompt(text, type) {
  return `아래 요청을 바탕으로 바로 결과물을 작성할 수 있는 작업 프롬프트로 정리해줘.\n\n# 작성 목적\n${inferGoal(text, type)}\n\n# 내가 말한 내용\n${formatUserNeeds(text)}\n\n# 작성 기준\n- 내가 말한 핵심 정보와 의도를 임의로 바꾸지 마.\n- 독자가 자연스럽게 이해할 수 있는 순서로 내용을 재구성해줘.\n- 말투나 분위기에 대한 요청이 있으면 가장 우선해서 반영해줘.\n- 요청하지 않은 사실이나 숫자는 지어내지 마.\n- 중복 표현은 줄이고, 핵심 내용은 눈에 잘 들어오게 정리해줘.\n\n# 결과물\n완성본을 먼저 보여주고, 필요한 경우에만 짧은 수정 포인트를 덧붙여줘. 사용자가 바로 복사해서 쓸 수 있는 형태로 완성해줘.`;
}

function makeAutomationPrompt(text, type) {
  return `아래 요구사항을 바탕으로 실제로 사용할 수 있는 자동화 또는 업무 흐름을 설계하고 구현해줘.\n\n# 자동화하려는 일\n${inferGoal(text, type)}\n\n# 내가 말한 요구사항\n${formatUserNeeds(text)}\n\n# 기본 흐름\n입력 → 처리 → 결과 확인 → 저장 또는 전달 순서가 한눈에 이해되게 구성해줘.\n\n# 구현 기준\n- 반복 작업을 줄이는 것이 최우선이야.\n- 사용자가 매번 같은 내용을 다시 입력하지 않도록 해줘.\n- 실패하거나 정보가 부족한 경우 사용자가 무엇을 해야 하는지 명확하게 보여줘.\n- 중요한 데이터가 사라지지 않도록 저장과 복구 방식을 고려해줘.\n- 초보자도 사용할 수 있게 전문 용어와 복잡한 설정을 최소화해줘.\n\n# 작업 완료 후 확인\n- 정상적인 입력에서 처음부터 끝까지 흐름이 동작하는지\n- 빠진 값이나 잘못된 입력이 있을 때 오류가 안전하게 처리되는지\n- 저장 또는 결과 출력이 실제로 유지되는지\n- 모바일과 PC에서 사용할 필요가 있다면 양쪽 모두 확인해줘.\n\n내 핵심 의도를 바꾸지 말고, 실제 반복 업무에 바로 쓸 수 있는 수준으로 완성해줘.`;
}

function makePresentationPrompt(text, type) {
  return `아래 내용을 바탕으로 바로 제작할 수 있는 강의·발표자료 작업 프롬프트로 정리해줘.\n\n# 자료의 목적\n${inferGoal(text, type)}\n\n# 내가 말한 요구사항\n${formatUserNeeds(text)}\n\n# 구성 기준\n- 처음 보는 사람도 흐름을 따라올 수 있게 도입 → 핵심 내용 → 예시 또는 실습 → 정리 순서로 구성해줘.\n- 한 슬라이드에 너무 많은 글을 넣지 말고 핵심 문장과 시각 자료 중심으로 구성해줘.\n- 대상 연령이나 숙련도가 드러나면 그 수준에 맞게 설명 난이도를 조절해줘.\n- 반복되는 내용은 합치고, 꼭 필요한 단계와 예시는 빠뜨리지 마.\n\n# 결과\n슬라이드별 제목과 핵심 내용, 필요한 이미지 또는 화면 예시까지 실제 제작에 바로 사용할 수 있게 정리해줘.`;
}

function makeGeneralPrompt(text, type) {
  return `아래 요청을 실제 작업에 바로 사용할 수 있는 프롬프트로 정리해줘.\n\n# 내가 원하는 것\n${inferGoal(text, type)}\n\n# 내가 말한 요구사항\n${formatUserNeeds(text)}\n\n# 작업 원칙\n- 내 핵심 의도를 바꾸지 마.\n- 중요한 요구사항이 빠지지 않도록 자연스러운 순서로 정리해줘.\n- 꼭 필요한 정보가 명확하지 않을 때만 질문하고, 사소한 부분은 안정적이고 사용하기 좋은 기본값으로 판단해줘.\n- 내가 요청하지 않은 큰 기능이나 전혀 다른 방향을 임의로 추가하지 마.\n- 결과물은 바로 복사해서 실제 작업에 사용할 수 있는 형태로 완성해줘.\n\n# 확인\n작업이 끝나면 내가 처음 말한 목적과 조건이 결과물에 모두 반영되었는지 한 번 확인해줘.`;
}

function generatePrompt(text) {
  const clean = normalize(text);
  const type = classify(clean);
  let prompt;
  if (type.key === 'website' || type.key === 'program') prompt = makeWebsitePrompt(clean, type);
  else if (type.key === 'image') prompt = makeImagePrompt(clean, type);
  else if (type.key === 'writing') prompt = makeWritingPrompt(clean, type);
  else if (type.key === 'automation') prompt = makeAutomationPrompt(clean, type);
  else if (type.key === 'presentation') prompt = makePresentationPrompt(clean, type);
  else prompt = makeGeneralPrompt(clean, type);
  return { type, prompt };
}

function saveState(message = '저장됨') {
  const state = {
    idea: ideaInput.value,
    result: resultOutput.value,
    visible: !resultSection.classList.contains('hidden'),
    type: typeBadge.textContent
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  draftState.textContent = message;
  clearTimeout(saveState.timer);
  saveState.timer = setTimeout(() => draftState.textContent = '자동 저장', 1200);
}

function loadState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!state) return;
    ideaInput.value = state.idea || '';
    resultOutput.value = state.result || '';
    typeBadge.textContent = state.type || '일반 작업';
    if (state.visible && state.result) resultSection.classList.remove('hidden');
  } catch (_) {}
}

function showToast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1800);
}

async function copyText(text, successText) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successText);
    return true;
  } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) showToast(successText);
    return ok;
  }
}

function handleGenerate() {
  const text = normalize(ideaInput.value);
  if (text.length < 6) {
    showToast('하고 싶은 일을 조금만 더 적어주세요.');
    ideaInput.focus();
    return;
  }
  const { type, prompt } = generatePrompt(text);
  typeBadge.textContent = type.label;
  resultOutput.value = prompt;
  resultSection.classList.remove('hidden');
  refinePanel.classList.add('hidden');
  actionNote.textContent = '핵심 의도는 유지하고, 실제 작업에 필요한 조건만 보완했어요.';
  saveState('정리 완료 · 저장됨');
  requestAnimationFrame(() => resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function applyRefinement() {
  const request = normalize(refineInput.value);
  if (!request) {
    showToast('어떻게 다듬을지 한마디 적어주세요.');
    return;
  }
  let current = resultOutput.value.trim();
  const lower = request.toLowerCase();
  if (/간단|짧게|압축/.test(lower)) {
    current = current
      .replace(/# 화면과 사용 흐름[\s\S]*?(?=# 구현 방식|# 작업 완료 후 확인|# 최종 목표)/, '')
      .replace(/\n{3,}/g, '\n\n');
  }
  const addition = `\n\n# 추가로 반영할 요청\n- ${request}\n- 위 요청은 기존 핵심 의도를 바꾸지 않는 범위에서 우선 반영해줘.`;
  if (!current.includes('# 추가로 반영할 요청')) current += addition;
  else current += `\n- ${request}`;
  resultOutput.value = current;
  refineInput.value = '';
  refinePanel.classList.add('hidden');
  actionNote.textContent = `“${request}” 요청을 추가로 반영했어요.`;
  saveState();
  showToast('다듬기 요청을 반영했어요.');
}

makeBtn.addEventListener('click', handleGenerate);
ideaInput.addEventListener('input', () => saveState('작성 중… 자동 저장'));
resultOutput.addEventListener('input', () => saveState('수정 내용 저장됨'));

for (const chip of document.querySelectorAll('.chip')) {
  chip.addEventListener('click', () => {
    ideaInput.value = chip.dataset.example || '';
    ideaInput.focus();
    saveState('예시를 불러왔어요');
  });
}

newBtn.addEventListener('click', () => {
  if (!ideaInput.value.trim() && !resultOutput.value.trim()) return;
  if (!confirm('현재 내용을 비우고 새로 시작할까요?')) return;
  ideaInput.value = '';
  resultOutput.value = '';
  resultSection.classList.add('hidden');
  refinePanel.classList.add('hidden');
  localStorage.removeItem(STORAGE_KEY);
  draftState.textContent = '새 작업을 시작했어요';
  ideaInput.focus();
});

refineBtn.addEventListener('click', () => {
  refinePanel.classList.toggle('hidden');
  if (!refinePanel.classList.contains('hidden')) refineInput.focus();
});

applyRefineBtn.addEventListener('click', applyRefinement);
refineInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    applyRefinement();
  }
});

copyBtn.addEventListener('click', async () => {
  if (!resultOutput.value.trim()) return;
  const ok = await copyText(resultOutput.value, '프롬프트를 복사했어요 ✓');
  if (ok) actionNote.textContent = '이제 원하는 AI 도구에 붙여넣어 바로 사용할 수 있어요.';
});

gptBtn.addEventListener('click', () => {
  const base = resultOutput.value.trim();
  if (!base) return;
  gptCombined.value = `${base}\n\n---\n\n${GPT_SUFFIX}`;
  gptModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});

modalClose.addEventListener('click', closeModal);
gptModal.addEventListener('click', (e) => { if (e.target === gptModal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !gptModal.classList.contains('hidden')) closeModal(); });
function closeModal() {
  gptModal.classList.add('hidden');
  document.body.style.overflow = '';
}

copyCombinedBtn.addEventListener('click', () => copyText(gptCombined.value, 'GPT용 전체 문장을 복사했어요 ✓'));

loadState();
