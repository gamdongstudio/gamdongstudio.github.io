/* SAY PROMPTER - store.js
 * 입력, 선택값, 플랜, 결과를 브라우저에 자동 저장한다.
 * 로그인·서버·클라우드 저장은 쓰지 않는다.
 */
(function (global) {
  'use strict';

  var KEY = 'sayprompter.v5.plan';
  var settings = { length: 'normal' };
  var draft = null;

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function load() {
    try {
      var saved = safeParse(global.localStorage.getItem(KEY) || '');
      if (!saved || typeof saved !== 'object') return;
      if (saved.settings && saved.settings.length) settings.length = saved.settings.length;
      if (saved.draft && typeof saved.draft === 'object') draft = saved.draft;
    } catch (e) {}
  }

  function saveAll() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify({ settings: settings, draft: draft }));
    } catch (e) {
      /* 이미지 dataURL 때문에 용량을 넘겼을 때 텍스트 상태라도 보존한다. */
      try {
        var lighter = draft ? JSON.parse(JSON.stringify(draft)) : null;
        if (lighter && lighter.images) {
          lighter.images = lighter.images.map(function (im) {
            return {
              id: im.id, name: im.name, role: im.role,
              description: im.description || '', dataUrl: ''
            };
          });
        }
        global.localStorage.setItem(KEY, JSON.stringify({ settings: settings, draft: lighter }));
      } catch (ignore) {}
    }
  }

  load();

  global.SP = global.SP || {};
  global.SP.store = {
    get length() { return settings.length; },
    set: function (key, value) {
      if (key === 'length') settings.length = value;
      saveAll();
    },
    getDraft: function () { return draft; },
    saveDraft: function (next) { draft = next; saveAll(); },
    clearDraft: function () { draft = null; saveAll(); }
  };
})(window);


/* SAY PROMPTER - analyzer.js
 * 사용자가 말한 요청을 읽고
 *  - 수정할 내용 / 유지할 내용 분리
 *  - 중요한 관계(처음만 같고 나중엔 따로 등) 인식
 *  - 이해 확인이 필요한 요청인지 판단
 *  - 필요한 테스트 항목 선택
 * 까지 처리한다. 외부 API 없이 로컬에서 동작.
 */
(function (global) {
  'use strict';

  /* ---------------- 사전 ---------------- */

  var RE = {
    action: /(바꿔|바꾸|변경|수정|고쳐|고치|옮겨|옮기|이동|추가|넣어|넣게|넣도록|삭제|지워|없애|연결|링크|줄여|키워|확대|축소|통일|맞춰|정렬|개선|부드럽|만들어|생성|적용|표시|보이게|숨기|나눠|분리|따로|바뀌게|되게|나오게|나왔으면|뜨게|표시되게|줄이|늘리|키우|보이도록)/,
    keep: /(그대로|유지|건드리지|손대지|손 대지|바뀌면 안|변경하지|바꾸지|놔둬|놔두|두고|정상 작동|정상작동|잘 됐|잘됐|잘 돼|잘돼|문제없|문제 없)/,
    create: /(새로 만들|처음부터|새 프로그램|새 앱|새 사이트|새 페이지|제작해|개발해|구현해|만들고 싶)/,
    problem: /(안 되|안돼|안 돼|안됨|이상|문제|섞이|겹치|깨지|안 나와|안나와|오류|버그|잘못|불편|어색|안 보|안보여|너무\s*(크|커|작|많|적|길|짧|좁|넓))/,
    persistence: /(자동\s?저장|자동저장|이어하기|이어서 만들|새로고침|브라우저|복원|다시 접속|껐다|종료|저장해|저장되게|저장이)/,
    image: /(사진|이미지|썸네일|갤러리)/,
    drag: /(드래그|끌어|순서|정렬|재배치)/,
    link: /(링크|클릭|이동|연결|버튼|눌러|누르면)/,
    download: /(다운로드|내려받|저장 파일|내보내기|export)/i,
    publish: /(완성|배포|발행|퍼블리시|실제 홈페이지|실제 화면|최종 화면)/,
    lengthShort: /(짧게|간단히|간단하게|짧은|한 줄|요약해서|핵심만)/,
    lengthPrecise: /(자세히|자세하게|정밀|꼼꼼|구체적|헷갈리지|그대로 복사|복사해서 넣|복사해서 쓰|개발자가|빠짐없이|정확하게 만들|놓치지)/
  };

  /* 중요한 관계 자동 인식 (요구사항 8) */
  var RELATIONS = [
    {
      id: 'initial-same-later-separate',
      test: function (t) {
        return (/처음[에엔]?[는]?[^.]{0,14}(같|동일)/.test(t) && /(따로|각각|개별|나중)/.test(t)) ||
               /처음에만/.test(t);
      },
      plain: '처음 만들 때만 이름이 같고, 그 뒤에는 각각 따로 바꿀 수 있습니다.',
      rule: '최초 생성 시점에만 이름(초기값)을 동일하게 맞추고, 그 이후에는 각 항목의 이름을 서로 독립적으로 수정할 수 있어야 합니다. 한 항목의 이름을 바꿔도 다른 항목의 이름은 바뀌지 않아야 합니다.'
    },
    {
      id: 'name-only-shared',
      test: function (t) { return /이름만/.test(t); },
      plain: '이름만 같이 쓰고, 사진이나 내용은 각각 따로 관리합니다.',
      rule: '이름만 공유 대상이며, 사진·설명·링크 등 나머지 데이터는 항목별로 완전히 분리해 저장해야 합니다.'
    },
    {
      id: 'photo-separate',
      test: function (t) { return RE.image.test(t) && /(각각|따로|개별|별도)/.test(t); },
      plain: '사진은 항목마다 따로 넣고, 서로 공유하지 않습니다.',
      rule: '사진(이미지)은 항목별로 각각 저장하며, 한 항목의 사진이 다른 항목에 함께 나타나거나 덮어써지면 안 됩니다.'
    },
    {
      id: 'a-change-b-keep',
      test: function (t) { return /(바꿔도|바꾸어도|수정해도|변경해도|고쳐도)/.test(t) && /(안|않|그대로)/.test(t); },
      plain: '한쪽을 바꿔도 다른 쪽은 바뀌지 않아야 합니다.',
      rule: function (t) {
        var m = t.match(/(\S{1,18}?)(?:을|를)\s*(?:바꿔도|바꾸어도|수정해도|변경해도|고쳐도)\s*(\S{1,18}?)(?:은|는)/);
        if (m) {
          return m[1] + '을(를) 변경해도 ' + m[2] + '은(는) 영향을 받지 않아야 합니다. 두 값은 서로 연결하지 마세요.';
        }
        return '한쪽 항목을 변경해도 다른 항목은 영향을 받지 않아야 합니다. 두 값을 서로 연결하지 마세요.';
      }
    },
    {
      id: 'pc-only',
      test: function (t) { return /(PC|피시|피씨|데스크[탑톱]|컴퓨터)[^.]{0,6}(만|에서만)/i.test(t); },
      plain: 'PC 화면만 수정하고 모바일은 건드리지 않습니다.',
      rule: 'PC(데스크톱) 화면에만 적용합니다. 모바일 화면의 레이아웃과 동작은 현재 상태를 그대로 유지하세요.'
    },
    {
      id: 'mobile-keep',
      test: function (t) { return /모바일[^.]{0,12}(그대로|유지|건드리지|손대지|안 건드)/.test(t); },
      plain: '모바일 화면은 지금 그대로 둡니다.',
      rule: '모바일 화면은 현재 상태를 그대로 유지하고 변경하지 마세요.'
    },
    {
      id: 'pc-keep',
      test: function (t) { return /(PC|피시|피씨|데스크[탑톱]|컴퓨터)[^.]{0,12}(그대로|유지|건드리지|손대지|안 건드|영향)/i.test(t); },
      plain: 'PC 화면은 지금 그대로 둡니다.',
      rule: 'PC 화면에는 영향을 주지 말고 지금 상태를 그대로 유지해주세요.'
    },
    {
      id: 'mobile-only',
      test: function (t) { return /모바일[^.]{0,6}(만|에서만)/.test(t); },
      plain: '모바일 화면만 수정합니다.',
      rule: '모바일 화면에만 적용합니다. PC 화면은 현재 상태를 그대로 유지하세요.'
    },
    {
      id: 'design-keep',
      test: function (t) { return /디자인[^.]{0,12}(그대로|유지|건드리지|바꾸지|안 건드)/.test(t); },
      plain: '지금 디자인은 그대로 두고 동작만 손봅니다.',
      rule: '전체 디자인(색상·글꼴·간격·배치)은 변경하지 말고 현재 상태를 그대로 유지하세요.'
    },
    {
      id: 'function-only',
      test: function (t) { return /기능만/.test(t); },
      plain: '보이는 모습은 그대로 두고 기능만 고칩니다.',
      rule: '동작(기능)만 수정하고 화면 디자인은 변경하지 마세요.'
    },
    {
      id: 'screen-keep',
      test: function (t) { return /(이 화면|현재 화면|지금 화면)[^.]{0,12}(그대로|유지|두고)/.test(t); },
      plain: '이 화면 구성은 그대로 두고 요청한 부분만 바꿉니다.',
      rule: '현재 화면 구성(요소 종류·순서·문구)은 그대로 두고, 요청한 부분만 변경하세요.'
    },
    {
      id: 'keep-working',
      test: function (t) { return /(기존|지금|현재)[^.]{0,10}(정상|잘 되|잘되|잘 돼|잘돼|작동)/.test(t); },
      plain: '지금 잘 되고 있는 기능은 건드리지 않습니다.',
      rule: '기존에 정상 작동하는 기능은 그대로 유지하고 재작성하지 마세요.'
    }
  ];

  /* ---------------- 유틸 ---------------- */

  function norm(t) {
    return String(t || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  }

  /* "기존 디자인은 그대로 두고 자동저장도 되게 해줘" 처럼
     한 문장에 유지 조건과 수정 요청이 같이 들어온 경우를 갈라준다. */
  var KEEP_CONNECT = /^(.*?(?:그대로 두고|그대로 놔두고|유지하고|유지한 채|건드리지 말고|손대지 말고|바꾸지 말고|수정하지 말고))\s*(.+)$/;

  function subSplit(c) {
    var m = c.match(KEEP_CONNECT);
    if (m && m[2].trim().length >= 3) return [m[1].trim(), m[2].trim()];
    return [c];
  }

  function splitClauses(text) {
    /* "첨부 1, 2는" 처럼 숫자 목록 안의 쉼표는 자르지 않는다 */
    var rough = text
      .split(/\n+|[.!?]+\s*|\s그리고\s|\s또\s|,(?!\s*\d)\s*/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length >= 2; });

    var out = [];
    rough.forEach(function (c) { subSplit(c).forEach(function (p) { out.push(p); }); });
    return out.filter(function (s) { return s.length >= 2; });
  }

  /* 말투만 다듬고 사용자의 표현은 최대한 그대로 둔다 (요구사항 7) */
  function polish(s) {
    var t = s.trim()
      .replace(/^(그리고|그래서|또|근데|그런데|일단|그럼|아무튼)\s*/, '')
      .replace(/[.\s]+$/, '');
    t = t
      .replace(/그대로 두고$/, '그대로 두세요')
      .replace(/그대로 놔두고$/, '그대로 두세요')
      .replace(/유지하고$/, '유지하세요')
      .replace(/말고$/, '마세요')
      .replace(/줘$/, '주세요')
      .replace(/줄래$/, '주세요')
      .replace(/좋겠어$/, '좋겠습니다')
      .replace(/좋겠다$/, '좋겠습니다')
      .replace(/야\s?해$/, '야 합니다')
      .replace(/야\s?돼$/, '야 합니다')
      .replace(/야\s?된다$/, '야 합니다');
    return t;
  }

  /* "첨부 1, 2는 현재 상태고" 같은 이미지 설명은 [첨부 이미지] 항목이 따로 담당하므로
     수정 요청 문장에서는 덜어낸다. */
  function stripAttachTalk(c) {
    return c
      .replace(/첨부\s*[\d\s,및와과]*\s*(?:은|는|이|가)?\s*(?:현재|지금)\s*상태[고이요]?\s*/g, '')
      .replace(/^\d+\s*(?:번)?\s*(?:은|는)\s*(?:현재|지금)\s*상태[고이요]?\s*/, '')
      .trim();
  }

  function uniq(list) {
    var seen = {}, out = [];
    list.forEach(function (v) {
      var k = v.trim();
      if (!k || seen[k]) return;
      seen[k] = 1;
      out.push(k);
    });
    return out;
  }

  /* ---------------- 이미지 역할 자동 구분 (요구사항 2) ---------------- */

  function assignImageRoles(images, text) {
    if (!images.length) return;

    images.forEach(function (img, i) {
      if (img.roleLocked) return;              // 사용자가 직접 지정한 역할은 유지
      if (images.length === 1) {
        img.role = '참고 이미지';
      } else {
        img.role = (i === images.length - 1) ? '원하는 화면' : '현재 화면';
      }
    });

    // "3번처럼", "3과 같이" → 그 번호는 원하는 화면
    var m, reLike = /(\d+)\s*(?:번)?\s*(?:처럼|같이|과 같|와 같)/g;
    while ((m = reLike.exec(text)) !== null) {
      var idx = parseInt(m[1], 10) - 1;
      if (images[idx] && !images[idx].roleLocked) images[idx].role = '원하는 화면';
    }

    // "첨부 1, 2는 현재" → 그 번호들은 현재 화면
    var mc = text.match(/첨부\s*([\d\s,및와과]+?)\s*(?:은|는|이|가)?\s*(?:현재|지금)/);
    if (mc) {
      (mc[1].match(/\d+/g) || []).forEach(function (n) {
        var k = parseInt(n, 10) - 1;
        if (images[k] && !images[k].roleLocked) images[k].role = '현재 화면';
      });
    }
  }

  /* 이미지·링크를 최종 프롬프트 문장으로 바꾸는 일은 builder.js 가 맡는다.
     (크기·비율·링크 성공 여부 같은 기술 정보는 결과물에 넣지 않는다.) */

  /* ---------------- 테스트 항목 선택 (요구사항 15) ---------------- */

  function buildTests(text, ctx) {
    var t = [];
    t.push(ctx.kind === 'create'
      ? '요청한 내용이 의도한 대로 만들어졌는지 확인'
      : '요청한 부분이 의도한 대로 바뀌었는지 확인');

    if (/(PC|피시|피씨|데스크[탑톱]|컴퓨터|반응형)/i.test(text)) t.push('PC 화면 확인');
    if (/(모바일|휴대폰|폰|반응형)/.test(text)) t.push('모바일 화면 확인');

    if (ctx.persistence) {
      t.push('새로고침 후에도 내용이 그대로 남아 있는지 확인');
      t.push('이어서 만들기로 들어갔을 때 이전 내용이 복원되는지 확인');
      if (RE.image.test(text)) t.push('브라우저를 껐다 켜도 사진이 그대로 보이는지 확인');
    }
    if (RE.image.test(text)) {
      t.push('사진 추가 / 삭제가 정상 동작하는지 확인');
      if (/(각각|따로|개별|별도)/.test(text)) t.push('항목별 사진이 서로 섞이지 않는지 확인');
    }
    if (RE.drag.test(text)) t.push('드래그로 순서를 바꿔도 정상 동작하는지 확인');
    if (RE.link.test(text)) t.push('링크·버튼 클릭 시 의도한 곳으로 이동하는지 확인');
    if (RE.download.test(text)) t.push('다운로드 결과 파일 확인');
    if (RE.publish.test(text)) t.push('실제 완성 화면에서 확인');
    if (ctx.hasImages) t.push('첨부 이미지와 실제 화면을 비교해 간격·위치·크기·정렬이 맞는지 확인');
    if (ctx.keeps.length) t.push('유지하기로 한 기능이 그대로 동작하는지 확인');

    return uniq(t).slice(0, 9);
  }

  /* ---------------- 자동저장 / 복원 (요구사항 16) ---------------- */

  function buildPersistence(text) {
    var items = [];
    if (RE.image.test(text)) {
      items.push('업로드한 이미지 데이터 자체(경로나 임시 URL이 아니라 실제 이미지 데이터)를 저장');
    }
    items.push('사용자가 입력한 텍스트(이름·설명·링크 등)를 저장');
    if (RE.drag.test(text)) items.push('항목의 순서를 저장');
    items.push('새로고침 또는 브라우저 재실행 후 이어서 만들기로 들어오면 위 내용을 그대로 복원');
    return items;
  }

  /* ---------------- 메인 ---------------- */

  function analyze(input) {
    var text = norm(input.text);
    var images = input.images || [];
    var links = input.links || [];
    var mode = input.mode || 'create';          // 'create' = 새 프롬프트, 'fix' = 완성 후 수정하기
    var locked = input.locked || [];
    var settings = input.settings || { confirmMode: 'auto' };

    /* 새 프롬프트는 ①이 "무엇을 만들지"(제목에 해당)이므로
       요구사항 문장은 ②③에서만 뽑는다. ①은 whatLine 이 따로 문장으로 만든다. */
    var clauseSource = input.fields
      ? [input.fields.how, input.fields.must].filter(Boolean).join('\n')
      : text;

    var clauses = splitClauses(clauseSource);

    /* 수정할 내용 / 유지할 내용 분리 (요구사항 9) */
    var changes = [], keeps = [], problems = [];
    clauses.forEach(function (c) {
      var isKeep = RE.keep.test(c);
      var isAction = RE.action.test(c);
      if (RE.problem.test(c) && !isKeep) problems.push(polish(c));
      if (isKeep && !(isAction && !/그대로|유지|건드리지|손대지|바뀌면 안/.test(c))) {
        keeps.push(polish(c));
      } else if (isAction) {
        var cleaned = stripAttachTalk(c);
        if (cleaned.length >= 2) changes.push(polish(cleaned));
      }
    });

    changes = uniq(changes);
    keeps = uniq(keeps);
    problems = uniq(problems);

    /* 바꿀 내용을 하나도 못 찾았으면 사용자의 말을 그대로 쓴다.
       단 여러 줄이면 통째로 붙이지 말고 줄 단위로 나눠 담는다. */
    if (!changes.length && clauseSource) {
      clauseSource.split('\n').forEach(function (line) {
        var l = line.trim();
        if (l.length >= 2) changes.push(polish(l));
      });
      changes = uniq(changes);
      keeps = keeps.filter(function (k) { return changes.indexOf(k) === -1; });
    }

    /* 새로 만들기인지 수정인지 —
       "완성 후 수정하기" 를 고른 경우에는 무조건 수정으로 본다. */
    var kind;

    /* "무엇을 만들고 싶은지"(①) 를 따로 받았으면 그 칸만 보고 판단한다.
       ②에 "미리보면서 수정하고 싶어" 같은 말이 있다고 해서
       기존 결과물을 고치는 요청으로 오해하면 안 되기 때문이다. */
    var kindSource = (input.fields && input.fields.what) ? input.fields.what : text;

    /* "이미" 는 "이미지" 와 헷갈리므로 뒤에 '지' 가 오면 제외한다 */
    var mentionsExisting = /(기존|현재|지금|고쳐|고치|수정|바꿔|바꾸|옮겨|유지|그대로|이미(?!지))/.test(kindSource);
    if (mode === 'fix') {
      kind = 'modify';
    } else if (input.fields) {
      /* ①은 "무엇을 만들고 싶으신가요?" 에 대한 답이다.
         "가족사진 갤러리 홈페이지" 처럼 이름만 적어도 새로 만드는 요청으로 본다.
         기존 것을 고친다고 분명히 말했을 때만 수정으로 돌린다. */
      kind = mentionsExisting ? 'modify' : 'create';
    } else if (mentionsExisting) {
      kind = 'modify';
    } else if (RE.create.test(kindSource) || /(만들|만드는|만들기|제작|개발|구현|새로)/.test(kindSource)) {
      kind = 'create';
    } else {
      kind = 'modify';
    }

    /* 관계 자동 인식 (요구사항 8) */
    var constraints = [];
    RELATIONS.forEach(function (r) {
      if (!r.test(text)) return;
      constraints.push({
        id: r.id,
        plain: r.plain,
        rule: (typeof r.rule === 'function') ? r.rule(text) : r.rule
      });
    });

    /* 정상 적용된 기능은 항상 유지 목록에 포함 (요구사항 12) */
    locked.forEach(function (f) { keeps.push(f + ' — 현재 정상 동작, 유지'); });
    keeps = uniq(keeps);

    /* 이미지 역할 자동 지정 (내부 판단용) */
    assignImageRoles(images, text);

    /* 자동저장 */
    var persistence = RE.persistence.test(text);

    var ctx = { keeps: keeps, persistence: persistence, hasImages: images.length > 0, kind: kind };
    var tests = (kind === 'modify' || persistence || images.length) ? buildTests(text, ctx) : buildTests(text, ctx).slice(0, 4);

    /* 이해 확인이 필요한지 판단 (요구사항 5) */
    var reasons = [];
    if (constraints.some(function (c) { return c.id === 'initial-same-later-separate'; })) reasons.push('처음에는 같고 나중에는 따로인 구조');
    if (constraints.some(function (c) { return c.id === 'a-change-b-keep'; })) reasons.push('한쪽을 바꿔도 다른 쪽은 유지해야 하는 조건');
    if (RE.keep.test(text)) reasons.push('기존 기능을 유지해야 하는 조건');
    if (images.length >= 2) reasons.push('이미지가 여러 장 첨부됨');
    if (mode === 'continue') reasons.push('이전 작업을 이어서 수정');
    if (changes.length >= 2) reasons.push('여러 가지를 한 번에 바꾸는 요청');
    if (text.length >= 90) reasons.push('요청이 길어 해석이 갈릴 수 있음');
    if (/(각각|따로|개별)/.test(text) && /(공유|같이|함께|동일|같)/.test(text)) reasons.push('공유하는 것과 따로 두는 것이 섞여 있음');

    var needConfirm;
    if (settings.confirmMode === 'always') needConfirm = true;
    else if (settings.confirmMode === 'never') needConfirm = false;
    else needConfirm = reasons.length > 0;

    /* 쉬운 말 요약 (요구사항 3, 7) */
    var summary = [];
    constraints.forEach(function (c) { if (summary.length < 4) summary.push(c.plain); });
    changes.slice(0, 3).forEach(function (c) {
      if (summary.length < 5) summary.push(c + ' — 이 부분을 바꿉니다.');
    });
    if (summary.length < 5 && kind === 'modify') {
      summary.push('나머지 기존 기능과 디자인은 그대로 둡니다.');
    }
    summary = uniq(summary).slice(0, 5);

    /* 길이 자동 선택 (요구사항 14) */
    var lengthHint = null;
    if (RE.lengthPrecise.test(text)) lengthHint = 'precise';
    else if (RE.lengthShort.test(text)) lengthHint = 'short';
    else if (constraints.length >= 2 || (changes.length >= 3 && keeps.length)) lengthHint = 'precise';

    return {
      text: text,
      kind: kind,
      mode: mode,
      images: images,
      links: links,
      fields: input.fields || null,        // 새 프롬프트의 ①②③ 답변
      answers: input.answers || [],        // [더 구체적으로] 추가 질문 답변
      changes: changes,
      keeps: keeps,
      problems: problems,
      constraints: constraints,
      persistence: persistence,
      persistenceItems: persistence ? buildPersistence(text) : [],
      tests: tests,
      summary: summary,
      reasons: uniq(reasons),
      needConfirm: needConfirm,
      lengthHint: lengthHint
    };
  }

  global.SP = global.SP || {};
  global.SP.analyze = analyze;
  global.SP.analyzerInternals = { polish: polish, splitClauses: splitClauses, RELATIONS: RELATIONS };

})(window);
