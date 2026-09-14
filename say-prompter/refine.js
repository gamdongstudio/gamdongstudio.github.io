/* SAY PROMPTER - refine.js
 * [요청 다듬기] 와 [더 구체적으로] 두 가지 기능.
 * 요청 다듬기: 뜻은 바꾸지 않고 문장만 정리한다.
 */
(function (global) {
  'use strict';
  var FILLER=/(^|\s)(좀|그냥|막|아무튼|일단|뭐|이제|약간|한번|한 번|혹시)(?=\s|$)/;
  var REWRITE=[[/이쁘게|예쁘게/g,'보기 좋게'],[/빨리\s*되게/g,'빠르게 동작하게'],[/제대로\s*되게/g,'정상적으로 동작하게'],[/이상하지\s*않게/g,'어색하지 않게']];
  var MOBILE_WISH=/(?:모바일|휴대폰|핸드폰|폰)(?:에서)?(?:도|는)?\s*(?:잘\s*보였으면\s*좋겠\S*|잘\s*보이게\s*\S*|잘\s*보이면\s*\S*|잘\s*나왔으면\s*좋겠\S*|보기\s*편했으면\s*좋겠\S*|안\s*깨지게\s*\S*)/g;
  var MAKE_TARGET=/(홈페이지|웹사이트|사이트|페이지|앱|어플|화면|쇼핑몰|블로그)/;
  function objParticle(word){var c=word.charCodeAt(word.length-1);if(c<0xAC00||c>0xD7A3)return'를';return((c-0xAC00)%28!==0)?'을':'를';}
  function prepare(text){var s=String(text||'').trim(),prev;do{prev=s;s=s.replace(FILLER,'$1');}while(s!==prev);s=s.replace(/(줘|주세요|좋겠어|좋겠다|해요|할래)\s+(?=\S)/g,'$1. ');return s.replace(/\s{2,}/g,' ').trim();}
  function splitParts(s){return s.split(/\n+|[.!?]+\s*|\s그리고\s|\s또\s|,\s*/).map(function(p){return p.trim();}).filter(function(p){return p.length>=2;});}
  function applyRewrites(s){var out=s;REWRITE.forEach(function(r){out=out.replace(r[0],r[1]);});return out;}
  function toRequestForm(s){var t=s.replace(/[.\s]+$/,'');if(!t)return'';if(/(주세요|하세요|합니다|됩니다|주십시오|좋겠습니다)$/.test(t))return t+'.';t=t.replace(/해\s*줘$/,'해주세요').replace(/해\s*줄래$/,'해주세요').replace(/만들어\s*줘$/,'만들어주세요').replace(/바꿔\s*줘$/,'바꿔주세요').replace(/넣어\s*줘$/,'넣어주세요').replace(/빼\s*줘$/,'빼주세요').replace(/옮겨\s*줘$/,'옮겨주세요').replace(/줘$/,'주세요').replace(/했으면\s*좋겠\S*$/,'해주세요').replace(/했으면\s*해$/,'해주세요').replace(/좋겠\S*$/,'좋겠습니다').replace(/야\s?(해|돼|된다)$/,'야 합니다');return t+'.';}
  function toMyVoice(line){var SP=global.SP;var t=String(line||'').replace(/[.\s]+$/,'');t=t.replace(/만들어\s*(줘|주세요)$/,'만들고 싶어');if(SP&&SP.intent&&SP.intent.casual)t=SP.intent.casual(t);return t+'.';}
  function tidy(text){var raw=prepare(text);if(!raw)return'';MOBILE_WISH.lastIndex=0;var wantsMobile=MOBILE_WISH.test(raw);MOBILE_WISH.lastIndex=0;var parts=splitParts(raw);if(wantsMobile){parts=parts.map(function(p){return p.replace(MOBILE_WISH,'').replace(/\s{2,}/g,' ').trim();}).filter(function(p){return p.length>=2;});}var lines=parts.map(function(p){return toRequestForm(applyRewrites(p));}).filter(Boolean);if(wantsMobile){var merged=false;lines=lines.map(function(l){if(merged||!MAKE_TARGET.test(l))return l;merged=true;return l.replace(MAKE_TARGET,function(m){return'모바일에서도 보기 편한 반응형 '+m;}).replace(new RegExp('('+MAKE_TARGET.source.slice(1,-1)+')\\s+(만들|제작|제작해|개발)'),function(all,word,verb){return word+objParticle(word)+' '+verb;});});if(!merged)lines.push('모바일에서도 보기 편하게 해주세요.');}lines=lines.map(toMyVoice);var seen={},out=[];lines.forEach(function(l){var k=l.replace(/\s/g,'');if(!k||seen[k])return;seen[k]=1;out.push(l);});return out.join(' ');}
  global.SP=global.SP||{};global.SP.refine={tidy:tidy};
})(window);
