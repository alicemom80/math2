// 도토리 세기 (숲속, 11~20): 꽉 찬 10칸 상자(열) + 낱개 도토리. "열" 다음부터 이어 센다.
// 상자를 누르면 "열", 낱개를 누르면 "열하나, 열둘…". 힌트는 상자부터 같이 센다.
import { h, art } from '@공통/widgets/dom.js';
import { pickNumber, wait } from '@공통/games/logic.js';
import { numberOptions, pickHandler } from '@공통/games/widgets.js';
import { nativeCount } from '@공통/games/numbers.js';
import { tapToCount, countTogether, markCount, HINT_START_MS, HINT_STEP_MS } from '@공통/games/shared/counting.js';
import { ACORNS_PROMPT, ACORNS_HINT, countHintEnd } from '../../audio/villageScript.js';
import { COUNT_PRAISE } from '@공통/games/logic.js';

const TEN = 10;
const MAX = 20;

export const acornsGame = {
  praise: COUNT_PRAISE,
  key: 'acorns',
  background: 'forest-base',
  levels: [
    [11, 13],
    [11, 16],
    [13, 20],
  ],

  ask(play, ctx, { range, last }) {
    const { run, say, bubble, sfx } = ctx;
    const n = pickNumber(range[0], range[1], last);
    const acorn = () => art('prop', 'acorn');

    const box = h('button', { class: 'tenbox', 'aria-label': '도토리 상자, 열 개' }, Array.from({ length: TEN }, acorn));
    box.addEventListener('click', () => {
      run.poke();
      if (run.state.busy) return;
      markCount(box, TEN);
      sfx.pop();
      say(nativeCount(TEN));
    });
    const loose = Array.from({ length: n - TEN }, () => h('button', { class: 'loose', 'aria-label': '도토리' }, acorn()));
    const afterTen = { wordOf: (k) => nativeCount(TEN + k), labelOf: (k) => TEN + k };
    const counter = tapToCount(loose, ctx, afterTen);

    play.replaceChildren(
      h('div', { class: 'countq' }, h('div', { class: 'tray forest' }, box, h('div', { class: 'loosegroup' }, loose)),
        numberOptions(n, TEN + 1, MAX, pickHandler(run, n))),
    );

    async function hint() {
      counter.reset();
      bubble(ACORNS_HINT, true);
      await wait(HINT_START_MS);
      if (run.state.stopped) return;
      box.classList.add('hl');
      markCount(box, TEN);
      say(nativeCount(TEN));
      await wait(HINT_STEP_MS);
      box.classList.remove('hl');
      if (!(await countTogether(loose, ctx, afterTen))) return;
      counter.setAll();
      bubble(countHintEnd(n), true);
    }

    return { n, prompt: ACORNS_PROMPT, hint };
  },
};
