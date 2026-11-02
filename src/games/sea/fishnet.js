// 물고기 묶기 (바닷가, 11~39 묶음과 낱개): 그물 하나에 물고기 열 마리. 그물과 낱개 물고기로 모두 몇 마리인지 센다.
// 그물을 누르면 "열, 스물, 서른", 낱개를 누르면 그 뒤를 이어 "스물하나…". 힌트는 그물부터 같이 센다.
import { h, art } from '@공통/widgets/dom.js';
import { pickNumber, wait } from '@공통/games/logic.js';
import { numberOptions, pickHandler } from '@공통/games/widgets.js';
import { nativeCount } from '@공통/games/numbers.js';
import { splitTens } from '@공통/games/questions.js';
import { tapToCount, countTogether, HINT_START_MS } from '@공통/games/shared/counting.js';
import { FISH_PROMPT, FISH_HINT, fishHintEnd } from '../../audio/villageScript.js';
import { COUNT_PRAISE } from '@공통/games/logic.js';

const TEN = 10;
const MIN = 11;
const MAX = 39;

export const fishnetGame = {
  praise: COUNT_PRAISE,
  key: 'fishnet',
  background: 'sea-base',
  levels: [
    [11, 19],
    [11, 29],
    [21, 39],
  ],

  ask(play, ctx, { range, last }) {
    const { run, bubble } = ctx;
    const n = pickNumber(range[0], range[1], last);
    const { bundles, ones } = splitTens(n);
    const fish = () => art('prop', 'fish');

    const nets = Array.from({ length: bundles }, () =>
      h('button', { class: 'tenbox net', 'aria-label': '물고기 그물, 열 마리' }, Array.from({ length: TEN }, fish)));
    const loose = Array.from({ length: ones }, () => h('button', { class: 'loose', 'aria-label': '물고기' }, fish()));
    const byNet = { wordOf: (k) => nativeCount(TEN * k), labelOf: (k) => TEN * k };
    const afterNets = { wordOf: (k) => nativeCount(TEN * bundles + k), labelOf: (k) => TEN * bundles + k };
    const netCounter = tapToCount(nets, ctx, byNet);
    const looseCounter = tapToCount(loose, ctx, afterNets);

    play.replaceChildren(
      h('div', { class: 'countq' }, h('div', { class: 'tray sea' }, h('div', { class: 'netgroup' }, nets), h('div', { class: 'loosegroup' }, loose)),
        numberOptions(n, MIN, MAX, pickHandler(run, n))),
    );

    async function hint() {
      netCounter.reset();
      looseCounter.reset();
      bubble(FISH_HINT, true);
      await wait(HINT_START_MS);
      if (!(await countTogether(nets, ctx, byNet))) return;
      if (!(await countTogether(loose, ctx, afterNets))) return;
      netCounter.setAll();
      looseCounter.setAll();
      bubble(fishHintEnd(n), true);
    }

    return { n, prompt: FISH_PROMPT, hint };
  },
};
