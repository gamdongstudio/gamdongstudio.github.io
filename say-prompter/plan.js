/* SAY PROMPTER - plan.js
 * 사용자의 말을 "좋은 프롬프트의 뼈대"인 플랜으로 정리한다.
 * 기술 스택·회원가입·DB 같은 큰 기능을 임의로 추가하지 않는다.
 */
(function (global) {
  'use strict';

  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function noPeriod(s) { return clean(s).replace(/[.!?。]+$/, ''); }
  function hasJong(word) {
    var m = String(word || '').match(/[가-힣](?!.*[가-힣])/);
    if (!m) return false;
    var c = m[0].charCodeAt(0);
    return ((c - 0xAC00) % 28) !== 0;
  }
  function obj(word) { return word + (hasJong(word) ? '을' : '를'); }
  function sentence(s) { var t=clean(s); if(!t)return''; return /[.!?。]$/.test(t)?t:t+'.'; }
  function casualGoal(what) { var t=noPeriod(what); if(!t)return''; if(/(만들|제작|개발|구현|쓰고 싶|하고 싶)/.test(t))return sentence(t); return obj(t)+' 만들고 싶어.'; }
  function casualWish(s) { var t=noPeriod(s); if(!t)return''; return sentence(t); }
  function developHow(how,what) { var h=noPeriod(how); if(!h)return''; var w=String(what||''); if(/상세\s*페이지/.test(w)&&/사진/.test(h)&&/가격/.test(h)&&/자동/.test(h)){if(/미리\s*보/.test(h))return'사용자가 사진과 가격 같은 내용을 입력하면 상세페이지가 자동으로 구성되고, 입력한 내용은 미리보기에서 바로 확인하면서 수정할 수 있었으면 좋겠어.';return'사용자가 사진과 가격 같은 내용을 입력하면 상세페이지가 자동으로 구성됐으면 좋겠어.';}return casualWish(h); }
  var QUICK_LINES={mobile:'모바일에서도 자연스럽게 사용할 수 있었으면 좋겠어.',persist:'작업하던 내용은 저장돼서 나중에 이어서 사용할 수 있었으면 좋겠어.',preview:'입력하거나 수정한 내용은 미리보기에 바로 반영됐으면 좋겠어.',multiPhoto:'사진이나 파일을 여러 개 등록해서 사용할 수 있었으면 좋겠어.',order:'사진이나 항목의 순서는 사용자가 어렵지 않게 바꿀 수 있었으면 좋겠어.',publicLink:'완성된 결과는 누구나 열어볼 수 있는 공개 링크로 받을 수 있었으면 좋겠어.'};
  function quickLines(quick,baseText){var order=['mobile','persist','preview','multiPhoto','order','publicLink'];var t=String(baseText||'');var already={mobile:/(모바일|휴대폰|핸드폰|반응형)/,persist:/(자동\s*저장|저장.*이어|이어서|이어하기|나중에.*계속)/,preview:/(미리\s*보|실시간|바로.*반영|바로.*확인)/,multiPhoto:/(여러\s*장|여러장|여러\s*개.*사진|사진.*여러)/,order:/(순서|배치.*바꾸|드래그.*이동|정렬)/,publicLink:/(공개\s*링크|공유\s*링크|링크로.*받|링크.*공개)/};return order.filter(function(k){return quick&&quick[k]&&!(already[k]&&already[k].test(t));}).map(function(k){return QUICK_LINES[k];});}
  function answerLines(answers){if(!global.SP||!SP.questions)return[];var applied=SP.questions.apply(answers||[]),lines=(applied.lines||[]).slice(),f=applied.facts||{};if(f.login===true)lines.push('로그인 기능이 필요해.');if(f.login===false)lines.push('로그인 없이 바로 사용할 수 있었으면 좋겠어.');if(f.device===true)lines.push('PC와 모바일 모두에서 자연스럽게 사용할 수 있었으면 좋겠어.');if(f.persist===true)lines.push('작업 내용을 저장했다가 나중에 이어서 사용할 수 있었으면 좋겠어.');if(f.multiPhoto===true)lines.push('사진은 여러 장 등록할 수 있었으면 좋겠어.');if(f.order===true)lines.push('사진이나 항목 순서를 직접 바꿀 수 있었으면 좋겠어.');return lines;}
  function referenceLines(images,links){var lines=[];(images||[]).forEach(function(im,i){var role=clean(im.role)||'디자인 느낌',desc=clean(im.description),line='참고 이미지 '+(i+1)+'에서는 '+obj(role)+' 참고해줘.';if(desc)line+=' 특히 "'+desc+'"라는 설명을 기준으로 봐줘.';line+=' 이미지를 그대로 복제하기보다 내가 선호하는 방향을 이해하는 참고자료로 사용해줘.';lines.push(line);});(links||[]).forEach(function(l,i){var note=clean(l.note),line='참고 링크 '+(i+1)+'('+l.url+')는 사이트의 구조와 사용 흐름을 이해하기 위한 참고자료야.';if(note)line+=' 특히 "'+note+'"라는 설명을 기준으로 봐줘.';line+=' 동일하게 복제하지 말고 필요한 구조와 흐름만 참고해줘.';lines.push(line);});return lines;}
  function dedupe(lines){var seen={},out=[];(lines||[]).forEach(function(l){var t=clean(l);if(!t)return;var k=t.replace(/\s/g,'').replace(/[.!?]/g,'');if(seen[k])return;seen[k]=1;out.push(sentence(t));});return out;}
  function create(input){var lines=[];lines.push(casualGoal(input.fields&&input.fields.what));lines.push(developHow(input.fields&&input.fields.how,input.fields&&input.fields.what));lines.push(casualWish(input.fields&&input.fields.must));var baseText=[input.fields&&input.fields.what,input.fields&&input.fields.how,input.fields&&input.fields.must].filter(Boolean).join(' ');quickLines(input.quick,baseText).forEach(function(l){lines.push(l);});answerLines(input.answers).forEach(function(l){lines.push(l);});referenceLines(input.images,input.links).forEach(function(l){lines.push(l);});return dedupe(lines).join('\n\n');}
  function fix(input){var f=input.fields||{},target=clean(f.target)||'현재 완성본',change=clean(f.change),keep=clean(f.keep),refs=referenceLines(input.images,input.links);var changeText=change?sentence(change):'수정하고 싶은 내용을 입력해주세요.';if(refs.length)changeText+='\n\n'+refs.join('\n\n');var keepText=keep?sentence(keep):'현재 정상 작동하는 기능과 이번 요청과 관련 없는 디자인·데이터는 그대로 유지해줘.';var checkText='요청한 부분이 원하는 대로 바뀌었는지 확인하고, '+target+'의 기존 정상 기능이 그대로 작동하는지도 함께 확인해줘.';return{change:changeText,keep:keepText,check:checkText};}
  global.SP=global.SP||{};global.SP.plan={create:create,fix:fix,quickLines:quickLines,referenceLines:referenceLines};
})(window);
