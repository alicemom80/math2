// 카카오톡 같은 앱 안 브라우저에서는 ▶를 누르면 폰의 바깥(기본) 브라우저로 연다.
// 안 열리면(아이폰 등) 주소를 복사하고 알려 준다.
const INAPP_UA = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i; // 앱 안 브라우저임을 알려 주는 사용자 글자(UA)
const KAKAO_UA = /KAKAOTALK/i;
const OPEN_WAIT_MS = 1500; // 바깥으로 열라고 한 뒤에도 이 화면이 그대로면 주소 복사로 바꾼다
const COPIED_TEXT = '주소를 복사했어요. 브라우저 주소창에 붙여 넣어 주세요.';
const COPY_FAIL_TEXT = '주소를 직접 복사해 주세요. 주소창을 길게 눌러도 돼요.';

export const isInApp = () => INAPP_UA.test(navigator.userAgent);

// 클립보드 API를 못 쓰면 임시 글상자에 주소를 넣고 복사 명령을 쓴다
function copyByTextarea(text) {
  const box = document.createElement('textarea');
  box.value = text;
  box.setAttribute('readonly', '');
  box.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.append(box);
  box.select();
  box.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  box.remove();
  return ok;
}

function copyAddress(toast) {
  const url = location.href;
  const done = (ok) => toast(ok ? COPIED_TEXT : COPY_FAIL_TEXT);
  if (!navigator.clipboard?.writeText) { done(copyByTextarea(url)); return; }
  navigator.clipboard.writeText(url).then(() => done(true), () => done(copyByTextarea(url)));
}

/** 카카오톡이면 카카오 전용 주소로, 다른 앱의 안드로이드면 기본 브라우저(intent)로 연다. */
export function openOutside(toast) {
  const ua = navigator.userAgent;
  let target = null;
  if (KAKAO_UA.test(ua)) target = `kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}`;
  else if (/android/i.test(ua)) target = `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;end`;
  if (!target) { copyAddress(toast); return; }
  location.href = target;
  setTimeout(() => { if (!document.hidden) copyAddress(toast); }, OPEN_WAIT_MS);
}
