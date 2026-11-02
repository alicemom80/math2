// 숫자 찾기 (농장, 1~50): 큰 숫자 하나를 보여 주고 "사십을 찾아봐! 어느 줄에 있을까?"
// → "1 ~ 10", "11 ~ 20" … 줄 버튼 중 그 숫자가 들어 있는 줄을 고른다. 힌트: 정답 줄이 반짝인다.
import { h } from '@공통/widgets/dom.js';
import { pickNumber } from '@공통/games/logic.js';
import { pickHandler } from '@공통/games/widgets.js';
import { rowFindPrompt, ROWFIND_HINT } from '../../audio/villageScript.js';
import { PICK_PRAISE } from '@공통/games/logic.js';

const ROW = 10;
const rowOf = (n) => Math.ceil(n / ROW); // 1~10 → 1줄, 11~20 → 2줄 …

export const rowFindGame = {
  praise: PICK_PRAISE,
  key: 'rowfind',
  background: 'farm-base',
  levels: [
    [1, 20],
    [1, 30],
    [1, 50],
  ],

  ask(play, { run, bubble }, { range, last }) {
    const n = pickNumber(range[0], range[1], last);
    const answer = rowOf(n);
    const onPick = pickHandler(run, answer);
    const rows = Array.from({ length: range[1] / ROW }, (_, i) => {
      const r = i + 1;
      const label = `${(r - 1) * ROW + 1} ~ ${r * ROW}`;
      const btn = h('button', { class: 'rowbtn pick', 'data-value': r, 'aria-label': label }, label);
      btn.addEventListener('click', () => onPick(r, btn));
      return btn;
    });
    const target = h('div', { class: 'rftarget', 'aria-hidden': 'true' }, String(n));
    play.replaceChildren(h('div', { class: 'rowfindq' }, target, h('div', { class: `rowbtns rows${rows.length}` }, rows)));

    async function hint() {
      rows[answer - 1].classList.add('hl');
      bubble(ROWFIND_HINT, true);
    }

    return { n, answer, prompt: rowFindPrompt(n), hint };
  },
};
