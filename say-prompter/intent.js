/* SAY PROMPTER - intent.js
 *
 * 사용자의 짧고 거친 한 마디에서
 *   ① 결국 무엇을 만들고 싶은가
 *   ② 그 결과물이 어떻게 동작하기를 원하는가
 * 를 읽어낸다.
 *
 * 이 파일의 결과는 "분석 보고서"가 아니라
 * 최종 프롬프트에 그대로 들어갈 **사람의 말투로 된 문장**이다.
 *
 * 중요: 사용자가 말하지 않은 커다란 기능을 새로 만들어내지 않는다.
 *       만들려는 물건이라면 당연히 딸려오는 동작까지만 구체화한다.
 */
(function (global) {
  'use strict';

  var DIGIT_JONG = { '0': 1, '1': 1, '3': 1, '6': 1, '7': 1, '8': 1 };
  function hasJong(word) { var ch=String(word).trim().slice(-1); if (/\d/.test(ch)) return !!DIGIT_JONG[ch]; var c=ch.charCodeAt(0); if(c<0xAC00||c>0xD7A3)return false; return (c-0xAC00)%28!==0; }
  function jo(word,withJong,without){return word+(hasJong(word)?withJong:without);}
  function casual(s){return String(s||'').trim().replace(/[.\s]+$/,'').replace(/해\s*주세요$/,'해줘').replace(/주세요$/,'줘').replace(/하세요$/,'해줘').replace(/두세요$/,'둬').replace(/주십시오$/,'줘').replace(/마세요$/,'마').replace(/좋겠습니다$/,'좋겠어').replace(/합니다$/,'해').replace(/됩니다$/,'돼').replace(/이어야 합니다$/,'이어야 해');}

  var PLATFORMS=['스마트스토어','스마트플레이스','네이버 블로그','인스타그램','쿠팡','카페24','워드프레스','당근마켓','아임웹'];
  var TARGETS=[
    {key:'detail',words:['상세페이지','상세 페이지'],label:'상세페이지'},
    {key:'landing',words:['랜딩페이지','랜딩 페이지'],label:'랜딩페이지'},
    {key:'shop',words:['쇼핑몰','스토어','온라인몰'],label:'쇼핑몰'},
    {key:'portfolio',words:['포트폴리오'],label:'포트폴리오'},
    {key:'gallery',words:['갤러리','사진첩'],label:'갤러리'},
    {key:'form',words:['신청서','신청 폼','예약 폼','예약 페이지','문의 폼','설문'],label:'신청 페이지'},
    {key:'blog',words:['블로그'],label:'블로그'},
    {key:'app',words:['앱','어플','애플리케이션'],label:'앱'},
    {key:'homepage',words:['홈페이지','웹사이트','소개 페이지','소개페이지'],label:'홈페이지'},
    {key:'page',words:['페이지','사이트','화면'],label:'페이지'}
  ];
  var TOPICS=['가족사진','웨딩','돌잔치','프로필 사진','반려동물','인테리어','부동산','음식','카페','학원','뷰티','헬스','꽃집','스튜디오','공방'];
  var RE={maker:/(만드는\s*(사이트|도구|프로그램|앱|웹|서비스)|제작\s*(도구|사이트|기)|만들어주는|생성기|에디터|빌더|만들기\s*도구)/,imageWork:/(보정|누끼|배경\s*제거|합성|리터치|색보정|화질|해상도\s*올|업스케일|잘라|크롭)/,docWork:/(글\s*써|글을\s*써|문서|보고서|이메일|기획서|원고|대본|카피|소개글\s*써|블로그\s*글)/,photoish:/(사진|촬영|스냅|웨딩|돌잔치|프로필|앨범)/,input:/(입력|적으면|넣으면|작성|폼)/,preview:/(미리\s*보|바로 보이|실시간|확인하면서)/,photo:/(사진|이미지|썸네일)/,many:/(여러\s*장|여러장|많이|여러\s*개)/,order:/(순서|배치|드래그|정렬|위치)/,save:/(저장|다운로드|내려받|이미지로|내보내기|파일로)/,responsive:/(모바일|휴대폰|핸드폰|폰|반응형|PC|피시|피씨|데스크[탑톱])/i,link:/(링크|클릭|버튼|눌러|누르면|이동)/,nav:/(링크|클릭|눌러|누르면|이동|연결)/,autosave:/(자동\s*저장|자동저장|이어하기|이어서|새로고침|복원)/,easy:/(쉽게|초보|간단|직관|편하게|어렵지 않)/};
  function find(text,list,getWords){for(var i=0;i<list.length;i++){var words=getWords?getWords(list[i]):[list[i]];for(var j=0;j<words.length;j++){if(text.indexOf(words[j])!==-1)return list[i];}}return null;}
  function detect(text,mode){var t=String(text||'');var target=find(t,TARGETS,function(x){return x.words;});var platform=find(t,PLATFORMS);var topic=find(t,TOPICS);var isMaker=RE.maker.test(t);var taskKind='web';if(RE.imageWork.test(t)&&!isMaker&&!target)taskKind='image';else if(RE.docWork.test(t)&&!isMaker)taskKind='document';else if(!target&&!isMaker&&!/(사이트|앱|화면|페이지|웹|프로그램|만들)/.test(t))taskKind='other';return{taskKind:taskKind,isMaker:isMaker,platform:platform,topic:topic,target:target,photoish:RE.photoish.test(t),has:{input:RE.input.test(t),preview:RE.preview.test(t),photo:RE.photo.test(t),many:RE.many.test(t),order:RE.order.test(t),save:RE.save.test(t),responsive:RE.responsive.test(t),link:RE.link.test(t),nav:RE.nav.test(t),autosave:RE.autosave.test(t),easy:RE.easy.test(t)}};}
  function whatLine(intent,analysis){var label=intent.target?intent.target.label:null;if(intent.isMaker&&label){var head='';if(intent.platform)head+=intent.platform+'에서 사용할 ';if(intent.topic)head+=intent.topic+' ';if(intent.target.key==='detail'&&intent.topic)head+='상품 ';return head+jo(label,'을','를')+' 초보자도 쉽게 만들 수 있는 웹 제작 도구를 만들고 싶어.';}if(intent.isMaker)return '내가 원하는 결과물을 초보자도 쉽게 만들 수 있는 웹 제작 도구를 만들고 싶어.';if(label){var pre='';if(intent.platform)pre+=intent.platform+'에서 쓸 ';if(intent.topic)pre+=intent.topic+' ';if(intent.has.responsive)pre+='PC와 모바일에서 모두 보기 편한 ';return pre+jo(label,'을','를')+' 만들고 싶어.';}if(intent.taskKind==='image')return '첨부한 사진을 아래 내용대로 다듬고 싶어.';if(intent.taskKind==='document')return '아래 내용에 맞는 글을 쓰고 싶어.';var first=(analysis&&analysis.changes&&analysis.changes[0])||text0(analysis);return casual(first)+'.';}
  function text0(analysis){return(analysis&&analysis.text)?analysis.text.split('\n')[0]:'';}
  var FIELDS={detail:'상품명, 가격, 옵션, 설명, 사진',detailPhoto:'상품명, 가격, 촬영 구성, 설명, 사진',shop:'상품명, 가격, 옵션, 상품 설명, 사진',homepage:'가게 이름, 소개글, 사진, 연락처, 오시는 길',landing:'제목, 소개 문구, 사진, 문의 버튼',portfolio:'작업 제목, 설명, 사진',gallery:'사진, 제목, 간단한 설명',form:'이름, 연락처, 희망 날짜, 요청사항',blog:'제목, 본문, 사진',_default:'제목, 설명, 사진'};
  function fieldsFor(intent){var k=intent.target?intent.target.key:null;if(k==='detail')return intent.photoish?FIELDS.detailPhoto:FIELDS.detail;return FIELDS[k]||FIELDS._default;}
  var FEATURE_LINES={preview:{yes:'입력한 내용은 실시간 미리보기에서 바로 확인하면서 수정할 수 있으면 좋겠어.'},multiPhoto:{yes:'사진은 여러 장 등록할 수 있으면 좋겠어.',no:'사진은 한 장만 등록할 수 있으면 돼.'},order:{yes:'사진 순서나 배치 방식은 사용자가 어렵지 않게 바꿀 수 있으면 좋겠어.',no:'구성 순서는 정해진 대로 고정이어도 돼.'},saveOut:{yes:'완성된 결과물은 이미지로 저장할 수 있으면 좋겠어.'},device:{yes:'PC와 모바일 모두에서 자연스럽게 보였으면 좋겠어.',no:'PC 화면에서만 잘 보이면 돼.'},persist:{yes:'작업하던 내용은 저장돼서 나중에 이어서 만들 수 있으면 좋겠어.',no:'작업 내용을 따로 저장하지 않아도 괜찮아.'},login:{yes:'로그인 기능이 필요해.',no:'로그인 없이 바로 쓸 수 있으면 좋겠어.'}};
  var FEATURE_ORDER=['preview','multiPhoto','order','saveOut','device','persist','login'];
  function featureLines(facts,intent){var out=[];FEATURE_ORDER.forEach(function(key){var v=facts[key];if(v===undefined)return;var def=FEATURE_LINES[key];if(!def)return;if(v===true&&def.yes){if(key==='multiPhoto'&&intent.photoish)out.push('사진은 여러 장 등록할 수 있고, 대표 사진과 상세 사진처럼 구분해서 쓸 수 있으면 좋겠어.');else if(key==='saveOut'&&intent.target)out.push('완성된 '+jo(intent.target.label,'은','는')+' 이미지로 저장할 수 있으면 좋겠어.');else out.push(def.yes);}else if(v===false&&def.no)out.push(def.no);});return out;}
  function howLines(intent,analysis,level,facts){var out=[];var label=intent.target?intent.target.label:'결과물';var f=facts||{};if(intent.isMaker){out.push('사용자가 '+fieldsFor(intent)+' 같은 내용을 입력하면 '+jo(label,'이','가')+' 자동으로 만들어졌으면 좋겠어.');}else if(intent.target){var k=intent.target.key;if(k==='form'){out.push('방문한 사람이 '+fieldsFor(intent)+'을 입력하고 보낼 수 있으면 좋겠어.');out.push('필수 항목을 빠뜨리면 어디가 비었는지 바로 알려줬으면 해.');}else if(k==='gallery'||k==='portfolio'){out.push('사진이 보기 좋게 정리돼서 보이고, 누르면 크게 볼 수 있으면 좋겠어.');}else if(k==='shop'||k==='detail'||k==='landing'){out.push('상품 사진과 설명이 눈에 잘 들어오게 배치됐으면 좋겠어.');if(intent.has.nav)out.push('문의나 구매 버튼은 누르면 어디로 가는지 분명하게 동작했으면 해.');}else{out.push('화면 구성이 한눈에 들어오고, 필요한 내용을 쉽게 찾을 수 있으면 좋겠어.');if(intent.has.nav)out.push('메뉴와 버튼은 누르면 어디로 가는지 분명하게 동작했으면 해.');}}else if(intent.taskKind==='image'){out.push('요청한 부분만 자연스럽게 바꿔줘.');}else if(intent.taskKind==='document'){out.push('내용이 한눈에 들어오도록 구조를 잡아줘.');}featureLines(f,intent).forEach(function(l){out.push(l);});(analysis.changes||[]).forEach(function(c){var line=casual(c);if(!line||line.length<3)return;if(isRestatement(line,intent))return;if(covered(out,line))return;out.push(line+(/[.!?]$/.test(line)?'':'.'));});if(intent.isMaker)out.push('처음 쓰는 사람도 설명서를 읽지 않고 쓸 수 있을 만큼 단순하고 직관적으로 만들어줘.');return dedupe(out);}
  function isRestatement(line,intent){if(RE.maker.test(line))return true;if(intent.target){for(var i=0;i<intent.target.words.length;i++){if(line.indexOf(intent.target.words[i])!==-1&&/(만들|제작|하고 싶)/.test(line))return true;}}if(intent.platform&&line.indexOf(intent.platform)!==-1&&/(만들|하고 싶)/.test(line))return true;return false;}
  var JOSA=/(하고|하면|해서|되고|지고|이고|으로|에서|에게|까지|부터|이나|라도|면서|고|를|을|은|는|이|가|도|만|의|와|과)$/;
  function covered(list,line){var joined=list.join(' ').replace(/[\s.]/g,'');var key=line.replace(/[\s.]/g,'');if(!joined)return false;if(joined.indexOf(key)!==-1)return true;var words=line.split(/[\s,.]+/).filter(function(w){return w.length>=2;});if(words.length<4)return false;var hit=0;words.forEach(function(w){var stem=w.replace(JOSA,'');if(stem.length>=2&&joined.indexOf(stem)!==-1)hit++;});return(hit/words.length)>=0.6;}
  function dedupe(list){var seen={},out=[];list.forEach(function(l){var k=l.replace(/\s/g,'');if(!k||seen[k])return;seen[k]=1;out.push(l);});return out;}
  global.SP=global.SP||{};global.SP.intent={detect:detect,whatLine:whatLine,fieldsFor:fieldsFor,howLines:howLines,casual:casual,jo:jo};
})(window);
