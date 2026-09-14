/* SAY PROMPTER - app.js
 * 5차 기반 플랜 중심 흐름.
 * 새로 만들기: 3개 입력 → (선택) 다듬기/더 구체적으로/참고자료 → SAY 플랜 → 프롬프트
 * 완성본 수정하기: 수정 대상/변경/유지 → 수정 플랜 → 수정 프롬프트
 */
(function (global) {
  'use strict';

  var SP = global.SP;
  var store = SP.store;
  var el = {};
  var saveTimer = null;

  var app = {
    mode: 'create',
    length: store.length || 'normal',
    quick: { mobile:false, persist:false, preview:false, multiPhoto:false, order:false, publicLink:false },
    images: [],
    links: [],
    questions: [],
    answers: [],
    undoFields: null,
    planUndo: null,
    plan: null,
    lastRequest: ''
  };

  function $(id) { return document.getElementById(id); }
  function clean(s) { return String(s || '').trim(); }
  function scrollTo(node) { if (node && node.scrollIntoView) node.scrollIntoView({behavior:'smooth',block:'start'}); }

  var toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.toast.hidden = true; }, 2400);
  }

  function createFields() { return { what:clean(el.qWhat.value), how:clean(el.qHow.value), must:clean(el.qMust.value) }; }
  function fixFields() { return { target:clean(el.fixTarget.value), change:clean(el.fixChange.value), keep:clean(el.fixKeep.value) }; }
  function combinedText() {
    var f = app.mode === 'create' ? createFields() : fixFields();
    return Object.keys(f).map(function(k){return f[k];}).filter(Boolean).join('\n');
  }

  function draftSnapshot() {
    return {
      mode: app.mode,
      length: app.length,
      create: createFields(),
      fix: fixFields(),
      quick: app.quick,
      images: app.images,
      links: app.links,
      answers: app.answers,
      planCreate: el.planText ? el.planText.value : '',
      planFix: el.planChange ? {change:el.planChange.value,keep:el.planKeep.value,check:el.planCheck.value} : null,
      result: el.resultText ? el.resultText.value : '',
      detailOpen: el.detailPanel ? !el.detailPanel.hidden : false,
      planOpen: el.cardPlan ? !el.cardPlan.hidden : false,
      resultOpen: el.cardResult ? !el.cardResult.hidden : false
    };
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){ store.saveDraft(draftSnapshot()); }, 220);
  }

  function renderMode() {
    Array.prototype.forEach.call(el.modeRow.querySelectorAll('.mode-btn'), function(b){
      b.classList.toggle('is-on', b.getAttribute('data-mode') === app.mode);
    });
    var isCreate = app.mode === 'create';
    el.createFields.hidden = !isCreate;
    el.fixFields.hidden = isCreate;
    el.btnExpand.hidden = !isCreate;
    el.detailPanel.hidden = !isCreate || !app.detailOpen;
    el.createPlanBox.hidden = !isCreate;
    el.fixPlanBox.hidden = isCreate;
    el.btnPlan.textContent = isCreate ? 'SAY 플랜 만들기' : '수정 플랜 만들기';
    scheduleSave();
  }

  function renderQuick() {
    Array.prototype.forEach.call(el.quickGrid.querySelectorAll('.quick-card'), function(b){
      b.classList.toggle('is-on', !!app.quick[b.getAttribute('data-quick')]);
    });
  }

  function inferQuick() {
    var t = combinedText();
    var tests = {
      mobile: /(모바일|휴대폰|핸드폰|반응형)/,
      persist: /(자동\s*저장|저장.*이어|이어서|이어하기|나중에.*계속)/,
      preview: /(미리\s*보|실시간|바로.*반영|바로.*확인)/,
      multiPhoto: /(여러\s*장|여러장|사진.*여러|파일.*여러)/,
      order: /(순서|배치.*바꾸|드래그|정렬)/,
      publicLink: /(공개\s*링크|공유\s*링크|링크로.*받|링크.*공개)/
    };
    Object.keys(tests).forEach(function(k){ if (tests[k].test(t)) app.quick[k] = true; });
    renderQuick();
  }

  function renderImages() {
    SP.imageAttach.render(el.thumbGrid, el.attachCount, app.images, {
      onRole:function(id,role){ app.images.forEach(function(im){if(im.id===id) im.role=role;}); scheduleSave(); },
      onDescription:function(id,text){ app.images.forEach(function(im){if(im.id===id) im.description=text;}); scheduleSave(); },
      onDelete:function(id){ app.images=app.images.filter(function(im){return im.id!==id;}); renderImages(); scheduleSave(); }
    });
    renderAttachCount();
  }

  function renderAttachCount() {
    var parts=[]; if(app.images.length)parts.push('사진 '+app.images.length+'장'); if(app.links.length)parts.push('링크 '+app.links.length+'개');
    el.attachCount.textContent=parts.join(' · ');
  }

  function renderLinks() {
    SP.linkAttach.render(el.linkList, app.links, {
      onNote:function(id,text){ app.links.forEach(function(l){if(l.id===id)l.note=text;}); scheduleSave(); },
      onDelete:function(id){ app.links=app.links.filter(function(l){return l.id!==id;}); renderLinks(); scheduleSave(); }
    });
    renderAttachCount();
  }

  function addLink() {
    var url=SP.linkAttach.normalizeUrl(el.linkInput.value);
    if(!url){toast('주소를 확인해주세요. 예) https://example.com');return;}
    if(app.links.some(function(l){return l.url===url;})){toast('이미 추가된 링크입니다.');return;}
    var link=SP.linkAttach.create(url); app.links.push(link); el.linkInput.value=''; renderLinks(); scheduleSave();
    SP.linkAttach.fetchContent(link).then(function(){ renderLinks(); scheduleSave(); if(link.status==='failed') toast('이 사이트는 내용을 직접 읽기 어려워 주소와 설명만 참고합니다.'); });
  }

  function getEditableFields() { return app.mode==='create' ? [el.qWhat,el.qHow,el.qMust] : [el.fixTarget,el.fixChange,el.fixKeep]; }

  function tidy() {
    var nodes=getEditableFields();
    if(!nodes.some(function(n){return clean(n.value);})){toast('먼저 내용을 적어주세요.');nodes[0].focus();return;}
    app.undoFields=nodes.map(function(n){return n.value;});
    var changed=false;
    nodes.forEach(function(n){ if(clean(n.value)){var next=SP.refine.tidy(n.value); if(next!==n.value){n.value=next;changed=true;}} });
    if(!changed){app.undoFields=null;toast('이미 충분히 정리된 요청입니다.');return;}
    el.btnUndo.hidden=false; scheduleSave(); toast('뜻은 그대로 두고 문장만 정리했습니다.');
  }

  function restoreUndo() {
    if(!app.undoFields)return;
    getEditableFields().forEach(function(n,i){n.value=app.undoFields[i]||'';});
    app.undoFields=null; el.btnUndo.hidden=true; scheduleSave(); toast('원래 내용으로 되돌렸습니다.');
  }

  function askMore() {
    if(!clean(el.qWhat.value)){toast('먼저 무엇을 만들고 싶은지 적어주세요.');el.qWhat.focus();return;}
    inferQuick();
    app.detailOpen=true; el.detailPanel.hidden=false;

    var intent=SP.intent.detect(combinedText(),'create');
    var qs=SP.questions.build({text:combinedText(),intent:intent}).filter(function(q){
      if(['device','persist','photo-multi','order','result-form'].indexOf(q.id)!==-1) return false;
      if(q.id==='tech' || q.id==='login') return false;
      return true;
    }).slice(0,4);
    app.questions=qs;
    renderQuestions();
    el.moreQuestions.hidden=!qs.length;
    scrollTo(el.detailPanel); scheduleSave();
  }

  function renderQuestions() {
    el.qList.innerHTML='';
    app.questions.forEach(function(q){
      var box=document.createElement('div');box.className='q-item';
      var tx=document.createElement('div');tx.className='q-text';tx.textContent=q.q;box.appendChild(tx);
      var input=document.createElement('input');input.type='text';input.className='q-input';input.setAttribute('data-qid',q.id);
      var saved=app.answers.filter(function(a){return a.id===q.id;})[0]; input.value=saved?saved.answer:'';
      input.placeholder=q.kind==='yesno'?'예 / 아니요 또는 직접 적어주세요':'선택사항 · 비워둬도 됩니다';
      if(q.kind==='yesno'){
        var chips=document.createElement('div');chips.className='q-chips';
        ['예','아니요'].forEach(function(v){var c=document.createElement('button');c.type='button';c.className='q-chip';c.textContent=v;if(saved&&saved.answer===v)c.classList.add('is-on');c.addEventListener('click',function(){input.value=v;Array.prototype.forEach.call(chips.querySelectorAll('.q-chip'),function(o){o.classList.toggle('is-on',o===c);});collectAnswers();scheduleSave();});chips.appendChild(c);});
        box.appendChild(chips);
      }
      input.addEventListener('input',function(){collectAnswers();scheduleSave();});box.appendChild(input);el.qList.appendChild(box);
    });
  }

  function collectAnswers() {
    var out=[];Array.prototype.forEach.call(el.qList.querySelectorAll('.q-input'),function(i){var v=clean(i.value);if(v)out.push({id:i.getAttribute('data-qid'),answer:v});});app.answers=out;return out;
  }

  function validateInput() {
    if(app.mode==='create'){
      if(!clean(el.qWhat.value)){toast('먼저 무엇을 만들고 싶은지 적어주세요.');el.qWhat.focus();return false;}
      if(!clean(el.qHow.value)){toast('어떻게 작동했으면 좋은지도 짧게 적어주세요.');el.qHow.focus();return false;}
    }else{
      if(!clean(el.fixTarget.value)){toast('어떤 완성본을 수정할지 적어주세요.');el.fixTarget.focus();return false;}
      if(!clean(el.fixChange.value)){toast('어디를 어떻게 바꾸고 싶은지 적어주세요.');el.fixChange.focus();return false;}
    }
    return true;
  }

  function currentPlanSnapshot() {
    if(app.mode==='create') return {mode:'create',text:el.planText.value};
    return {mode:'fix',change:el.planChange.value,keep:el.planKeep.value,check:el.planCheck.value};
  }

  function buildPlan() {
    if(!validateInput())return;
    collectAnswers();
    app.planUndo=currentPlanSnapshot();
    if(app.mode==='create'){
      var text=SP.plan.create({fields:createFields(),quick:app.quick,answers:app.answers,images:app.images,links:app.links});
      el.planText.value=text;
    }else{
      var p=SP.plan.fix({fields:fixFields(),images:app.images,links:app.links});
      el.planChange.value=p.change;el.planKeep.value=p.keep;el.planCheck.value=p.check;
    }
    el.btnPlanUndo.hidden=true;app.plan=currentPlanSnapshot();el.cardPlan.hidden=false;el.cardResult.hidden=true;scrollTo(el.cardPlan);scheduleSave();
  }

  function armPlanUndo() {
    if(app.planUndo && !el.btnPlanUndo.hidden) return;
    app.planUndo=app.plan || currentPlanSnapshot();
    el.btnPlanUndo.hidden=false;
  }

  function undoPlan() {
    if(!app.planUndo)return;
    var p=app.planUndo;
    if(p.mode==='create'){el.planText.value=p.text||'';}else{el.planChange.value=p.change||'';el.planKeep.value=p.keep||'';el.planCheck.value=p.check||'';}
    app.plan=currentPlanSnapshot();app.planUndo=null;el.btnPlanUndo.hidden=true;scheduleSave();toast('이전 플랜으로 되돌렸습니다.');
  }

  function generatePrompt() {
    if(el.cardPlan.hidden){buildPlan();if(el.cardPlan.hidden)return;}
    app.lastRequest=combinedText();
    var text;
    if(app.mode==='create') text=SP.prompt.buildCreate(el.planText.value,app.length,app.quick);
    else text=SP.prompt.buildFix({change:el.planChange.value,keep:el.planKeep.value,check:el.planCheck.value},app.length,fixFields().target);
    el.resultText.value=text;SP.result.renderLength(el.lenRow,app.length);el.cardResult.hidden=false;scrollTo(el.cardResult);scheduleSave();
  }

  function rebuildLength() { if(el.cardResult.hidden)return; generatePrompt(); }

  function clearAll() {
    ['qWhat','qHow','qMust','fixTarget','fixChange','fixKeep','planText','planChange','planKeep','planCheck','resultText'].forEach(function(id){if(el[id])el[id].value='';});
    app.quick={mobile:false,persist:false,preview:false,multiPhoto:false,order:false,publicLink:false};app.images=[];app.links=[];app.questions=[];app.answers=[];app.plan=null;app.planUndo=null;app.detailOpen=false;
    renderQuick();renderImages();renderLinks();el.detailPanel.hidden=true;el.moreQuestions.hidden=true;el.cardPlan.hidden=true;el.cardResult.hidden=true;store.clearDraft();
    (app.mode==='create'?el.qWhat:el.fixTarget).focus();
  }

  function restoreDraft() {
    var d=store.getDraft(); if(!d)return;
    app.mode=d.mode||'create';app.length=d.length||app.length;app.quick=Object.assign(app.quick,d.quick||{});app.images=d.images||[];app.links=d.links||[];app.answers=d.answers||[];app.detailOpen=!!d.detailOpen;
    if(d.create){el.qWhat.value=d.create.what||'';el.qHow.value=d.create.how||'';el.qMust.value=d.create.must||'';}
    if(d.fix){el.fixTarget.value=d.fix.target||'';el.fixChange.value=d.fix.change||'';el.fixKeep.value=d.fix.keep||'';}
    if(d.planCreate)el.planText.value=d.planCreate;
    if(d.planFix){el.planChange.value=d.planFix.change||'';el.planKeep.value=d.planFix.keep||'';el.planCheck.value=d.planFix.check||'';}
    if(d.result)el.resultText.value=d.result;
    el.cardPlan.hidden=!d.planOpen;el.cardResult.hidden=!d.resultOpen;
    if(app.mode==='create'&&app.detailOpen) askMore();
  }

  function bind() {
    el.modeRow.addEventListener('click',function(e){var b=e.target.closest('.mode-btn');if(!b)return;app.mode=b.getAttribute('data-mode');app.detailOpen=false;el.cardPlan.hidden=true;el.cardResult.hidden=true;renderMode();});
    getAllTextInputs().forEach(function(n){n.addEventListener('input',scheduleSave);});
    el.btnTidy.addEventListener('click',tidy);el.btnUndo.addEventListener('click',restoreUndo);el.btnExpand.addEventListener('click',askMore);
    el.quickGrid.addEventListener('click',function(e){var b=e.target.closest('.quick-card');if(!b)return;var k=b.getAttribute('data-quick');app.quick[k]=!app.quick[k];renderQuick();scheduleSave();});
    el.btnSkipQuestions.addEventListener('click',function(){app.answers=[];el.moreQuestions.hidden=true;scheduleSave();toast('추가 질문은 건너뜁니다.');});
    el.btnPickImage.addEventListener('click',function(){el.fileInput.click();});
    el.fileInput.addEventListener('change',function(){SP.imageAttach.readFiles(el.fileInput.files,function(list){app.images=app.images.concat(list);renderImages();el.fileInput.value='';scheduleSave();});});
    el.btnToggleLink.addEventListener('click',function(){el.linkBox.hidden=!el.linkBox.hidden;if(!el.linkBox.hidden)el.linkInput.focus();});
    el.btnAddLink.addEventListener('click',addLink);el.linkInput.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();addLink();}});
    el.btnPlan.addEventListener('click',buildPlan);el.btnClear.addEventListener('click',clearAll);el.btnPrompt.addEventListener('click',generatePrompt);el.btnPlanUndo.addEventListener('click',undoPlan);
    [el.planText,el.planChange,el.planKeep,el.planCheck].forEach(function(n){n.addEventListener('focus',armPlanUndo,{once:false});n.addEventListener('input',function(){app.plan=currentPlanSnapshot();scheduleSave();});});
    el.lenRow.addEventListener('click',function(e){var b=e.target.closest('.len-btn');if(!b)return;app.length=b.getAttribute('data-len');store.set('length',app.length);SP.result.renderLength(el.lenRow,app.length);rebuildLength();});
    el.resultText.addEventListener('input',scheduleSave);
    el.btnCopy.addEventListener('click',function(){SP.result.copy(el.resultText.value,function(ok){toast(ok?'프롬프트를 복사했습니다.':'복사에 실패했습니다. 직접 선택해 복사해주세요.');});});
    el.btnCopyRefine.addEventListener('click',function(){SP.result.copy(SP.result.withRefine(el.resultText.value),function(ok){toast(ok?'정밀화 요청까지 함께 복사했습니다. ChatGPT나 Claude에 붙여넣어 보세요.':'복사에 실패했습니다.');});});
    el.btnSaveTxt.addEventListener('click',function(){SP.result.saveTxt({provider:'basic',request:app.lastRequest||combinedText(),prompt:el.resultText.value},function(ok,name){toast(ok?(name+' 로 저장했습니다.'):'저장에 실패했습니다.');});});
    el.btnRemake.addEventListener('click',function(){el.cardResult.hidden=true;scrollTo(el.cardPlan);});
  }

  function getAllTextInputs(){return [el.qWhat,el.qHow,el.qMust,el.fixTarget,el.fixChange,el.fixKeep,el.linkInput];}

  function init() {
    ['modeRow','createFields','fixFields','qWhat','qHow','qMust','fixTarget','fixChange','fixKeep','btnTidy','btnExpand','btnUndo','detailPanel','quickGrid','moreQuestions','qList','btnSkipQuestions','btnPickImage','fileInput','thumbGrid','attachCount','btnToggleLink','linkBox','linkInput','btnAddLink','linkList','btnPlan','btnClear','cardPlan','createPlanBox','fixPlanBox','planText','planChange','planKeep','planCheck','btnPlanUndo','btnPrompt','cardResult','lenRow','resultText','btnCopy','btnCopyRefine','btnSaveTxt','btnRemake','toast'].forEach(function(id){el[id]=$(id);});
    restoreDraft();renderMode();renderQuick();renderImages();renderLinks();SP.result.renderLength(el.lenRow,app.length);bind();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  global.SP.app=app;
})(window);
