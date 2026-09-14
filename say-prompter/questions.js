/* SAY PROMPTER - questions.js
 * [더 구체적으로] 버튼이 하는 일.
 * 좋은 최종 프롬프트를 위해 아직 안 정해진 것만 되묻는다.
 */
(function (global) {
  'use strict';
  var MAX_QUESTIONS = 8;
  function readFacts(text) {
    var t=String(text||''); function yes(re){return re.test(t)?true:undefined;}
    return {multiPhoto:yes(/여러\s*장|여러장|여러\s*개|여러개|몇 장/),order:yes(/순서|배치|드래그|정렬|위치 바꾸/),saveOut:yes(/저장|다운로드|내려받|이미지로|내보내기|파일로|출력/),device:yes(/PC|피시|피씨|모바일|휴대폰|핸드폰|폰|반응형|데스크[탑톱]/i),login:yes(/로그인|회원|가입|계정|비밀번호/),persist:yes(/자동\s*저장|자동저장|이어서|이어하기|새로고침|복원|보관|나중에/),preview:yes(/미리\s*보|실시간|바로 보|보면서|확인하면서/),tech:yes(/리액트|react|vue|워드프레스|노코드|파이썬|python|엑셀|스프레드시트|next|node/i),audience:yes(/누가|고객|손님|방문자|사용자가|초보|어르신|직원/),tone:yes(/말투|문체|톤|느낌|분위기/),length:yes(/분량|글자 수|줄 정도|페이지 분량|장 정도/),background:yes(/배경/),keepSubject:yes(/인물|얼굴|구도|원본/)};
  }
  function hasJongText(word){var m=String(word||'').match(/[가-힣](?!.*[가-힣])/);if(!m)return false;return((m[0].charCodeAt(0)-0xAC00)%28)!==0;}
  function subjText(word){return word+(hasJongText(word)?'이':'가');}
  function withText(word){return word+(hasJongText(word)?'과':'와');}
  function means(a){var t=String(a||'').trim().replace(/[.\s]+$/,'');if(!t)return t;if(/(으로|로|서|게|기|고|해|줘|요|다|씩)$/.test(t))return t;var c=t.charCodeAt(t.length-1);var jong=(c>=0xAC00&&c<=0xD7A3)?(c-0xAC00)%28:0;return t+((jong===0||jong===8)?'로':'으로');}
  var CATALOG=[
    {id:'photo-multi',fact:'multiPhoto',when:function(c){return c.kind==='web'&&c.intent.has.photo&&c.f.multiPhoto===undefined;},q:function(){return'사진을 여러 장 등록할 수 있어야 하나요?';},kind:'yesno',yes:'사진은 여러 장 등록할 수 있으면 좋겠어.',no:'사진은 한 장만 등록할 수 있으면 돼.',free:function(a){return'사진 등록은 '+a+'.';}},
    {id:'order',fact:'order',when:function(c){return c.kind==='web'&&(c.intent.isMaker||c.intent.target)&&c.f.order===undefined;},q:function(c){var label=c.intent.target?c.intent.target.label:'결과물';return label+' 구성 순서를 사용자가 직접 바꿀 수 있어야 하나요?';},kind:'yesno',yes:'구성 순서는 사용자가 직접 바꿀 수 있으면 좋겠어.',no:'구성 순서는 정해진 대로 고정이어도 돼.',free:function(a){return'구성 순서는 '+a+'.';}},
    {id:'save-format',when:function(c){return c.kind==='web'&&c.f.saveOut===true;},q:function(){return'완성한 결과물은 어떤 형태로 저장할까요? (예: 이미지 한 장 / 구간별로 나눠서)';},kind:'text',free:function(a){return'완성한 결과물은 '+means(a)+' 저장할 수 있으면 좋겠어.';}},
    {id:'result-form',when:function(c){return c.kind==='web'&&c.f.saveOut===undefined;},q:function(){return'완성한 결과물을 어떤 형태로 받고 싶으세요? (예: 이미지로 저장, 링크 공유, 복사)';},kind:'text',free:function(a){return'완성한 결과물은 '+means(a)+' 받고 싶어.';}},
    {id:'device',fact:'device',when:function(c){return c.kind==='web'&&c.f.device===undefined;},q:function(){return'PC와 모바일 모두에서 사용하나요?';},kind:'yesno',yes:'PC와 모바일 모두에서 자연스럽게 보여야 해.',no:'PC 화면에서만 잘 보이면 돼.',free:function(a){return'사용 환경은 '+a+'.';}},
    {id:'persist',fact:'persist',when:function(c){return c.kind==='web'&&(c.intent.isMaker||c.intent.has.input)&&c.f.persist===undefined;},q:function(){return'작업하던 내용을 저장했다가 나중에 이어서 할 수 있어야 하나요?';},kind:'yesno',yes:'작업하던 내용은 저장돼서 나중에 이어서 만들 수 있으면 좋겠어.',no:'작업 내용을 따로 저장하지 않아도 괜찮아.',free:function(a){return'작업 내용 저장은 '+a+'.';}},
    {id:'login',fact:'login',when:function(c){return c.kind==='web'&&c.f.login===undefined;},q:function(){return'로그인 기능이 필요한가요?';},kind:'yesno',yes:'로그인 기능이 필요해.',no:'로그인 없이 바로 쓸 수 있으면 좋겠어.',free:function(a){return'로그인은 '+a+'.';}},
    {id:'web-audience',when:function(c){return c.kind==='web'&&c.f.audience===undefined;},q:function(){return'주로 누가 사용할 예정인가요? (예: 사진관 사장님, 고객, 내부 직원)';},kind:'text',free:function(a){return'주로 '+subjText(a)+' 사용할 예정이야.';}},
    {id:'external-service',when:function(c){return c.kind==='web'&&!/(네이버|카카오|구글|인스타|외부\s*서비스|연동|API)/i.test(c.text);},q:function(){return'꼭 연결해야 하는 외부 서비스가 있나요? (없으면 비워두세요)';},kind:'text',free:function(a){return withText(a)+' 연결이 필요해.';}},
    {id:'img-keep',when:function(c){return c.kind==='image'&&c.f.keepSubject===undefined;},q:function(){return'원본 인물과 구도는 그대로 두어야 하나요?';},kind:'yesno',yes:'원본 인물과 구도는 그대로 두고 요청한 부분만 바꿔줘.',no:'구도까지 바꿔도 괜찮아.',free:function(a){return'원본은 '+a+'.';}},
    {id:'img-bg',when:function(c){return c.kind==='image'&&c.f.background===undefined;},q:function(){return'배경도 함께 바꿀까요?';},kind:'yesno',yes:'배경도 함께 바꿔줘.',no:'배경은 그대로 두고 대상만 바꿔줘.',free:function(a){return'배경은 '+a+'.';}},
    {id:'img-use',when:function(c){return c.kind==='image';},q:function(){return'어디에 쓸 이미지인가요? (예: 상세페이지, 인쇄, SNS)';},kind:'text',free:function(a){return a+'에 쓸 이미지야. 그 용도에 맞는 크기와 화질로 만들어줘.';}},
    {id:'doc-audience',when:function(c){return c.kind==='document'&&c.f.audience===undefined;},q:function(){return'누가 읽을 글인가요?';},kind:'text',free:function(a){return a+'이(가) 읽을 글이야. 그에 맞는 눈높이로 써줘.';}},
    {id:'doc-length',when:function(c){return c.kind==='document'&&c.f.length===undefined;},q:function(){return'분량은 어느 정도가 좋을까요?';},kind:'text',free:function(a){return'분량은 '+a+' 정도면 좋겠어.';}},
    {id:'doc-tone',when:function(c){return c.kind==='document'&&c.f.tone===undefined;},q:function(){return'말투는 어떤 느낌이 좋을까요? (예: 정중하게, 친근하게)';},kind:'text',free:function(a){return'말투는 '+a+' 느낌으로 써줘.';}},
    {id:'avoid',when:function(){return true;},q:function(){return'꼭 유지하거나 반대로 피해야 하는 조건이 있나요?';},kind:'text',free:function(a){return a+' — 이 조건은 꼭 지켜줘.';}},
    {id:'tech',when:function(c){return c.f.tech===undefined;},q:function(){return'특별히 사용하고 싶은 기술이나 방식이 있나요?';},kind:'text',free:function(a){return means(a)+' 만들어줬으면 좋겠어.';}}
  ];
  function build(input){var f=readFacts(input.text),intent=input.intent,kind='web';if(intent.taskKind==='image')kind='image';else if(intent.taskKind==='document')kind='document';var ctx={f:f,intent:intent,kind:kind,text:input.text},out=[];CATALOG.forEach(function(item){if(out.length>=MAX_QUESTIONS)return;if(!item.when(ctx))return;out.push({id:item.id,q:item.q(ctx),kind:item.kind});});return out;}
  var YES_WORD=/^(네|넵|넹|예|응|어|그래|맞아|좋아|필요|필요해|있어|있음|해줘|원해|ㅇ+|y|yes|o|ok)$/i;
  var NO_WORD=/^(아니|아뇨|아니요|아님|노|없어|없음|불필요|괜찮아|안|ㄴ+|n|no|x)$/i;
  var YES_PHRASE=/(필요해|있으면 좋|했으면 좋|하고 싶|가능하게|되면 좋|해주세요|해줘)/;
  var NO_PHRASE=/(필요\s*없|없어도|안 해도|하지 마|아니야|아니에요|괜찮습니다)/;
  function isYes(t){return YES_WORD.test(t)||YES_PHRASE.test(t);}function isNo(t){return NO_WORD.test(t)||NO_PHRASE.test(t);}
  function findItem(id){for(var i=0;i<CATALOG.length;i++){if(CATALOG[i].id===id)return CATALOG[i];}return null;}
  function apply(answers){var facts={},lines=[];(answers||[]).forEach(function(a){var text=String(a.answer||'').trim();if(!text)return;var item=findItem(a.id);if(!item)return;if(item.kind==='yesno'){var yes=isYes(text),no=isNo(text);if(no){if(item.fact)facts[item.fact]=false;else lines.push(item.no);return;}if(yes){if(item.fact)facts[item.fact]=true;else lines.push(item.yes);return;}}lines.push(item.free(text.replace(/[.\s]+$/,'')));if(item.fact&&facts[item.fact]===undefined)facts[item.fact]=true;});var seen={},res=[];lines.forEach(function(l){var k=String(l).replace(/\s/g,'');if(!k||seen[k])return;seen[k]=1;res.push(l);});return{facts:facts,lines:res};}
  global.SP=global.SP||{};global.SP.questions={build:build,apply:apply,readFacts:readFacts,MAX:MAX_QUESTIONS};
})(window);
