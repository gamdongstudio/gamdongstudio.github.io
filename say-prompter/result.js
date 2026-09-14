/* SAY PROMPTER - components/result.js
 * 최종 프롬프트 출력 + 길이 선택 + 복사 + TXT 저장.
 */
(function (global) {
  'use strict';
  function renderLength(rowEl,current){Array.prototype.forEach.call(rowEl.querySelectorAll('.len-btn'),function(b){b.classList.toggle('is-on',b.getAttribute('data-len')===current);});}
  function renderText(preEl,text){preEl.textContent=text;}
  var REFINE_SUFFIX=[
    '위 내용을 바탕으로 실제 작업에 바로 사용할 수 있도록',
    '프롬프트를 한 단계 더 구체적으로 다듬어줘.',
    '',
    '내 핵심 의도는 바꾸지 말고,',
    '빠진 조건이나 애매한 부분이 있다면 필요한 범위에서 보완해줘.',
    '',
    '먼저 내가 원하는 방향을 어떻게 이해했는지 짧게 정리해줘.',
    '',
    '꼭 필요한 질문이 있다면 최대 3개까지만 해주고,',
    '사소한 부분은 가장 안정적이고 사용하기 좋은 방식으로 판단해줘.',
    '',
    '내가 생각한 방법보다 더 좋은 방법이 있다면 함께 제안해줘.',
    '',
    '방향에 큰 문제가 없다면 실제 작업에 사용할 수 있는',
    '최종 프롬프트까지 완성해줘.'
  ].join('\n');
  function withRefine(text){return String(text||'').replace(/\s+$/,'')+'\n\n'+REFINE_SUFFIX+'\n';}
  function copy(text,done){if(global.navigator&&navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){done(true);},function(){done(fallbackCopy(text));});return;}done(fallbackCopy(text));}
  function fallbackCopy(text){try{var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.top='-1000px';document.body.appendChild(ta);ta.focus();ta.select();var ok=document.execCommand('copy');document.body.removeChild(ta);return ok;}catch(e){return false;}}
  var PROVIDER_LABEL={basic:'기본',openai:'GPT',anthropic:'Claude'};
  function makeTitle(requestText){var first=String(requestText||'').split(/\n|[.!?]/)[0].replace(/\s+/g,' ').trim();if(!first)return'프롬프트';if(first.length>24)first=first.slice(0,24);return first;}
  function safeFileName(s){return String(s).replace(/[\\/:*?"<>|]/g,'').replace(/[\x00-\x1f]/g,'').replace(/\s+/g,'_').replace(/_{2,}/g,'_').replace(/^[._]+|[._]+$/g,'').slice(0,60)||'프롬프트';}
  function today(){var d=new Date();var p=function(n){return(n<10?'0':'')+n;};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
  function buildTxt(info){return['SAY PROMPTER','','작업 제목: '+info.title,'생성 날짜: '+today(),'생성 방식: '+(PROVIDER_LABEL[info.provider]||'기본'),'','[사용자 요청]','',info.request,'','','[최종 프롬프트]','',info.prompt,''].join('\n');}
  function saveTxt(info,done){try{var title=makeTitle(info.request);var name='SAY_PROMPTER_'+safeFileName(title)+'_'+today()+'.txt';var body=buildTxt({title:title,provider:info.provider,request:info.request,prompt:info.prompt});var blob=new Blob(['﻿'+body],{type:'text/plain;charset=utf-8'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},1000);done(true,name);}catch(e){done(false,'');}}
  global.SP=global.SP||{};global.SP.result={renderLength:renderLength,renderText:renderText,copy:copy,withRefine:withRefine,REFINE_SUFFIX:REFINE_SUFFIX,saveTxt:saveTxt,makeTitle:makeTitle,safeFileName:safeFileName,buildTxt:buildTxt};
})(window);
