// 부모님 메뉴 (자물쇠 1초 누르기로 열림). 부모님용이라 글자로 된 메뉴.
import { h } from '@공통/widgets/dom.js';
import { remainingMs, MINUTE, moreTimeChange, testLimitChange, resetChange } from '../app/playtime.js';
import { SAVANNA } from '../villages/savanna.js';

const MORE_MINUTES = 15;
const DEFAULT_LIMIT_MIN = 15;

/** 켜짐/꺼짐 버튼 */
const toggle = (on, label, onclick) =>
  h('button', { class: on ? 'on' : '', 'aria-pressed': String(on), 'aria-label': label, onclick }, on ? '켜짐' : '꺼짐');

const row = (title, ...controls) => h('div', { class: 'row' }, h('span', {}, title), h('span', { class: 'ctrls' }, controls));

export function createParentMenu(stage, app) {
  let modal = null;
  let resetArmed = false;

  function close() {
    modal?.remove();
    modal = null;
    resetArmed = false;
  }

  function apply(change, message) {
    app.update(change);
    if (message) app.toast(message);
    render();
  }

  function render() {
    const p = app.progress;
    const left = Math.ceil(remainingMs(p) / MINUTE);
    const inGame = app.current.name === 'game';

    const resetBtn = h(
      'button',
      {
        class: resetArmed ? 'danger' : '',
        onclick: () => {
          if (!resetArmed) {
            resetArmed = true;
            render();
            return;
          }
          app.update(resetChange);
          close();
          app.go('map');
          app.toast('진행 기록을 지웠어요');
        },
      },
      resetArmed ? '한 번 더 누르면 지워져요' : '지우기',
    );

    const panel = h(
      'div',
      { class: 'panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': '부모님 메뉴' },
      h('h3', {}, '부모님 메뉴'),
      h('div', { class: 'left' }, `오늘 남은 놀이 시간: 약 ${left}분 · 스티커 ${p.stickers.length}/${SAVANNA.animals.length}`),
      row('놀이 시간', h('button', { onclick: () => apply((q) => moreTimeChange(q, MORE_MINUTES), `${MORE_MINUTES}분 더 놀 수 있어요`) }, `${MORE_MINUTES}분 더 놀기`)),
      row(
        '시간 제한',
        h('button', { class: p.limitMin === DEFAULT_LIMIT_MIN ? 'on' : '', onclick: () => apply({ limitMin: DEFAULT_LIMIT_MIN }) }, `${DEFAULT_LIMIT_MIN}분`),
        h('button', { class: p.limitMin === 1 ? 'on' : '', onclick: () => apply(testLimitChange, '1분 뒤에 잠겨요 (시험용)') }, '1분 (시험용)'),
      ),
      row('모든 마을 열기', toggle(p.allOpen, '모든 마을 열기', () => {
        apply((q) => ({ allOpen: !q.allOpen }));
        if (app.current.name === 'map') app.refresh();
      })),
      inGame ? row('게임 그만하고 나가기', h('button', { onclick: () => { close(); app.go('village', { village: app.current.params.village ?? 'savanna' }); } }, '마을로 나가기')) : null,
      row('진행 기록 지우기', resetBtn),
      row('만든 사람 소식', h('a', { class: 'ig', href: 'https://www.instagram.com/alicemom80/', target: '_blank', rel: 'noopener noreferrer' }, '📷 @alicemom80')),
      h('button', { class: 'close', onclick: close }, '닫기'),
    );

    const next = h('div', { class: 'modal' }, panel);
    if (modal) modal.replaceWith(next);
    else stage.append(next);
    modal = next;
  }

  return {
    open() {
      app.sfx.ding();
      resetArmed = false;
      render();
    },
    close,
    get isOpen() {
      return modal != null;
    },
  };
}
