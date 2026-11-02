// 반짝 무늬 보기 (기린): "잘 봐!" → 무늬를 2초 보여 주고 덤불로 가린다 → "몇 개였을까?"
// 덤불을 누르면 1.5초 다시 보여 준다. 무늬는 주사위 배치라 세지 않고 한눈에 알아보게 한다.
import { h, art } from '@공통/widgets/dom.js';
import { NATIVE, DICE, pickNumber, wait } from '@공통/games/logic.js';
import { numberOptions, pickHandler } from '@공통/games/widgets.js';
import { SPOTS_LOOK, SPOTS_PROMPT, SPOTS_HINT_START, spotsHintEnd } from '../../audio/script.js';
import { PICK_PRAISE } from '@공통/games/logic.js';

const MAX = 6;
const FIRST_LOOK_MS = 2000;
const PEEK_MS = 1500;
const HINT_START_MS = 1300;
const HINT_STEP_MS = 750;
const HINT_END_MS = 600;

export const spotsGame = {
  praise: PICK_PRAISE,
  key: 'spots',
  background: 'savanna-base',
  levels: [
    [1, 3],
    [2, 5],
    [3, 6],
  ],

  ask(play, { run, say, bubble, sfx }, { range, last }) {
    const n = pickNumber(range[0], range[1], last);
    let coverTimer = null;

    const spots = [];
    const cells = Array.from({ length: 9 }, (_, i) => {
      const order = DICE[n].indexOf(i);
      if (order < 0) return h('span', { class: 'cell' });
      const spot = art('prop', 'giraffe-spot', { class: 'spot' });
      spots[order] = spot;
      return h('span', { class: 'cell' }, spot);
    });

    const cover = h('button', { class: 'cover', 'aria-label': '다시 보기', hidden: true }, art('prop', 'bush'));
    const card = h('div', { class: 'card', 'data-count': n }, cells, cover);

    const showFor = (ms, after) => {
      cover.hidden = true;
      clearTimeout(coverTimer);
      coverTimer = setTimeout(() => {
        if (run.state.stopped || run.state.busy) return;
        cover.hidden = false;
        after?.();
      }, ms);
    };
    const reveal = () => {
      clearTimeout(coverTimer);
      cover.hidden = true;
    };

    cover.addEventListener('click', () => {
      run.poke();
      if (run.state.busy) return;
      sfx.ding();
      showFor(PEEK_MS);
    });

    play.replaceChildren(
      h('div', { class: 'spotq' }, art('character', 'giraffe', { class: 'gir', alt: '기린' }), card,
        numberOptions(n, 1, MAX, pickHandler(run, n, reveal))),
    );

    run.setPrompt(SPOTS_LOOK);
    showFor(FIRST_LOOK_MS, () => run.setPrompt(SPOTS_PROMPT));

    async function hint() {
      reveal();
      bubble(SPOTS_HINT_START, true);
      await wait(HINT_START_MS);
      for (let i = 0; i < spots.length; i++) {
        if (run.state.stopped) return;
        spots[i].classList.add('hl');
        say(NATIVE[i + 1]);
        await wait(HINT_STEP_MS);
      }
      await wait(HINT_END_MS);
      if (run.state.stopped) return; // 힌트 중에 화면을 떠났으면 말하지 않는다
      spots.forEach((s) => s.classList.remove('hl'));
      bubble(spotsHintEnd(n), true);
    }

    return { n, hint };
  },
};
