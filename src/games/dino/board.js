// 숫자판 찾기 (공룡 나라, 1~50): "삼십오를 찾아서 눌러 줘!" → 숫자판에서 그 수를 누른다.
// 숫자판은 단계에 따라 20 → 30 → 50칸으로 넓어진다. 힌트: 그 수가 있는 줄이 반짝인다.
import { h } from '@공통/widgets/dom.js';
import { pickNumber } from '@공통/games/logic.js';
import { pickHandler } from '@공통/games/widgets.js';
import { boardPrompt, BOARD_HINT } from '../../audio/villageScript.js';
import { PICK_PRAISE } from '@공통/games/logic.js';

const ROW = 10;

export const boardGame = {
  praise: PICK_PRAISE,
  key: 'board',
  background: 'dino-base',
  levels: [
    [1, 20],
    [1, 30],
    [1, 50],
  ],

  ask(play, { run, bubble }, { range, last }) {
    const n = pickNumber(range[0], range[1], last);
    const onPick = pickHandler(run, n);
    const cells = Array.from({ length: range[1] }, (_, i) => {
      const v = i + 1;
      const btn = h('button', { class: 'bcell pick', 'data-value': v, 'aria-label': String(v) }, String(v));
      btn.addEventListener('click', () => onPick(v, btn));
      return btn;
    });
    // 찾아야 할 숫자를 판 옆 빈 곳에 크게 보여 준다
    const target = h('div', { class: 'btarget', 'aria-hidden': 'true' }, String(n));
    play.replaceChildren(h('div', { class: 'boardq' }, target, h('div', { class: `board rows${range[1] / ROW}` }, cells)));

    async function hint() {
      const row = Math.floor((n - 1) / ROW);
      cells.slice(row * ROW, row * ROW + ROW).forEach((c) => c.classList.add('hl'));
      bubble(BOARD_HINT, true);
    }

    return { n, prompt: boardPrompt(n), hint };
  },
};
