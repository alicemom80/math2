// 과일 세기 (코끼리): 파티 과일을 하나씩 눌러 고유어로 세고, 숫자 보기에서 고른다.
import { h, art } from '@공통/widgets/dom.js';
import { NATIVE, pickNumber, pickOne, wait } from '@공통/games/logic.js';
import { numberOptions, pickHandler } from '@공통/games/widgets.js';
import { fruitPrompt, FRUIT_HINT_START, fruitHintEnd } from '../../audio/script.js';
import { COUNT_PRAISE } from '@공통/games/logic.js';

const MAX = 10;
// [그림 이름, 과일 이름, 붙는 말(이/가)]
const FRUITS = [
  ['fruit-apple', '사과', '가'],
  ['fruit-strawberry', '딸기', '가'],
  ['fruit-orange', '귤', '이'],
  ['fruit-banana', '바나나', '가'],
  ['fruit-grape', '포도', '가'],
  ['fruit-peach', '복숭아', '가'],
];
const HINT_START_MS = 1400;
const HINT_STEP_MS = 750;

function mark(item, k) {
  item.classList.add('c');
  item.querySelector('span')?.remove();
  item.append(h('span', {}, String(k)));
}

export const fruitGame = {
  praise: COUNT_PRAISE,
  key: 'fruit',
  background: 'savanna-base',
  levels: [
    [1, 5],
    [3, 7],
    [4, 10],
  ],

  ask(play, { run, say, bubble, sfx }, { range, last }) {
    const n = pickNumber(range[0], range[1], last);
    const [artName, name, particle] = pickOne(FRUITS);
    let counted = 0;

    const items = Array.from({ length: n }, () => {
      const item = h('button', { class: 'fruit', 'aria-label': name }, art('prop', artName));
      item.addEventListener('click', () => {
        run.poke();
        if (item.classList.contains('c') || run.state.busy) return;
        counted += 1;
        mark(item, counted);
        sfx.pop();
        say(NATIVE[counted]);
      });
      return item;
    });

    const tray = h('div', { class: 'tray' }, items);
    play.replaceChildren(h('div', { class: 'fruitq' }, tray, numberOptions(n, 1, MAX, pickHandler(run, n))));

    async function hint() {
      items.forEach((it) => {
        it.classList.remove('c');
        it.querySelector('span')?.remove();
      });
      counted = 0;
      bubble(FRUIT_HINT_START, true);
      await wait(HINT_START_MS);
      for (let i = 0; i < items.length; i++) {
        if (run.state.stopped) return;
        items[i].classList.add('hl');
        mark(items[i], i + 1);
        say(NATIVE[i + 1]);
        await wait(HINT_STEP_MS);
        items[i].classList.remove('hl');
      }
      if (run.state.stopped) return; // 힌트 중에 화면을 떠났으면 말하지 않는다
      counted = items.length;
      bubble(fruitHintEnd(n), true);
    }

    return { n, prompt: fruitPrompt(name, particle), hint };
  },
};
