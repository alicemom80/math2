// 열씩 세기 (바닷가, 10~50): 조개가 열 개씩 든 상자들. 상자를 눌러 "십, 이십, 삼십…" 하고 세어 숫자를 고른다.
import { h, art } from '@공통/widgets/dom.js';
import { pickNumber, wait } from '@공통/games/logic.js';
import { numberButtons, pickHandler } from '@공통/games/widgets.js';
import { sinoWord, tensChoices } from '@공통/games/numbers.js';
import { tapToCount, countTogether, HINT_START_MS } from '@공통/games/shared/counting.js';
import { SHELLS_PROMPT, SHELLS_HINT, shellsHintEnd } from '../../audio/villageScript.js';
import { COUNT_PRAISE } from '@공통/games/logic.js';

const TEN = 10;

export const shellsGame = {
  praise: COUNT_PRAISE,
  key: 'shells',
  background: 'sea-base',
  // 상자 수 범위
  levels: [
    [1, 3],
    [1, 4],
    [2, 5],
  ],

  ask(play, ctx, { range, last }) {
    const { run, bubble } = ctx;
    const boxes = pickNumber(range[0], range[1], last / TEN);
    const n = boxes * TEN;
    const shell = () => art('prop', 'shell');

    const items = Array.from({ length: boxes }, () =>
      h('button', { class: 'tenbox shellbox', 'aria-label': '조개 상자, 열 개' }, Array.from({ length: TEN }, shell)));
    const byTen = { wordOf: (k) => sinoWord(TEN * k), labelOf: (k) => TEN * k };
    const counter = tapToCount(items, ctx, byTen);

    play.replaceChildren(
      h('div', { class: 'countq' }, h('div', { class: 'tray sea boxes' }, items), numberButtons(tensChoices(n), pickHandler(run, n))),
    );

    async function hint() {
      counter.reset();
      bubble(SHELLS_HINT, true);
      await wait(HINT_START_MS);
      if (!(await countTogether(items, ctx, byTen))) return;
      counter.setAll();
      bubble(shellsHintEnd(n), true);
    }

    return { n, prompt: SHELLS_PROMPT, hint };
  },
};
