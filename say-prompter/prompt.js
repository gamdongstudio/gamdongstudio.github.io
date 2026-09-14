/* SAY PROMPTER - prompt.js
 * 편집된 플랜을 GPT·Claude에 바로 붙여넣을 자연스러운 기본 프롬프트로 바꾼다.
 */
(function (global) {
  'use strict';
  function clean(s){return String(s||'').trim();}
  function paragraphs(s){return clean(s).split(/\n{2,}/).map(function(x){return x.trim();}).filter(Boolean);}
  function hasJong(word){var m=String(word||'').match(/[가-힣](?!.*[가-힣])/);if(!m)return false;var c=m[0].charCodeAt(0);return((c-0xAC00)%28)!==0;}
  function subj(word){return word+(hasJong(word)?'이':'가');}
  function shortCreate(plan){var ps=paragraphs(plan);return ps.slice(0,Math.min(4,ps.length)).join('\n\n');}
  function preciseCreate(plan,quick){var out=clean(plan),checks=[];if(quick&&quick.preview)checks.push('입력한 내용이 미리보기에 바로 반영되는지');if(quick&&quick.order)checks.push('사진이나 항목 순서 변경이 정상적으로 반영되는지');if(quick&&quick.mobile)checks.push('모바일 화면이 자연스럽게 보이는지');if(quick&&quick.publicLink)checks.push('완성된 공개 링크가 정상적으로 열리는지');if(checks.length)out+='\n\n작업이 끝나면 '+checks.join(', ')+' 확인해줘.';return out;}
  function buildCreate(plan,level,quick){if(level==='short')return shortCreate(plan);if(level==='precise')return preciseCreate(plan,quick);return clean(plan);}
  function buildFix(plan,level,target){var change=clean(plan.change),keep=clean(plan.keep),check=clean(plan.check);var head=clean(target)?'지금 만들어 둔 '+subj(clean(target))+' 있어.':'지금 만들어 둔 완성본이 있어.';var parts=[head];if(level==='short'){if(change)parts.push('이번에는 '+change);if(keep)parts.push(keep);parts.push('현재 정상 작동하는 기능과 이번 요청과 관계없는 부분은 그대로 유지하고, 전체를 새로 만들지 마.');return parts.join('\n\n');}if(change)parts.push('이번에는 아래 부분만 수정해줘.\n'+change);if(keep)parts.push('나머지는 이렇게 유지해줘.\n'+keep);parts.push('현재 정상 작동하는 기능과 기존 데이터는 유지하고, 이번 요청과 관계없는 부분은 불필요하게 바꾸지 말고, 전체를 새로 만들지 마.');if(check)parts.push('작업이 끝나면 '+check);return parts.join('\n\n');}
  global.SP=global.SP||{};global.SP.prompt={buildCreate:buildCreate,buildFix:buildFix};
})(window);
