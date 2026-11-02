// 무늬 잇기 (바닷가, 반복 규칙): 펭귄·물고기·조개·불가사리가 규칙대로 줄 서 있고, 물음표 자리에 올 친구를 고른다.
// 규칙은 AB → AAB·ABB → ABC 순서로 어려워진다. 힌트: 되풀이되는 묶음을 차례로 반짝인다.
import { h, art } from '@공통/widgets/dom.js';
import { pickNumber, wait } from '@공통/games/logic.js';
import { pickHandler } from '@공통/games/widgets.js';
import { patternQuestion, PATTERN_TYPES } from '@공통/games/questions.js';
import { PATTERN_PROMPT, PATTERN_HINT, PATTERN_HINT_END } from '../../audio/villageScript.js';
import { PICK_PRAISE } from '@공통/games/logic.js';

const ITEMS = {
  penguin: { kind: 'character', name: '펭귄' },
  fish: { kind: 'prop', name: '물고기' },
  shell: { kind: 'prop', name: '조개' },
  star: { kind: 'prop', name: '불가사리' },
};
const HINT_START_MS = 1500;
/** 힌트 말이 끝나기를 이만큼까지만 기다린다 (말 끝 알림이 오지 않는 브라우저 대비) */
const HINT_SPEECH_MAX_MS = 5000;
const UNIT_MS = 1100;

/** 말이 끝날 때까지 (적어도 minMs, 길어도 HINT_SPEECH_MAX_MS) 기다린다 */
const untilSpoken = (spoken, minMs = 0) =>
  Promise.all([wait(minMs), Promise.race([Promise.resolve(spoken).catch(() => {}), wait(HINT_SPEECH_MAX_MS)])]);

const itemArt = (key) => art(ITEMS[key].kind, key, { alt: '' });

export const patternGame = {
  praise: PICK_PRAISE,
  key: 'pattern',
  background: 'sea-base',
  // 규칙 번호 범위 (PATTERN_TYPES: AB, AAB, ABB, ABC)
  levels: [
    [0, 0],
    [0, 2],
    [1, PATTERN_TYPES.length - 1],
  ],

  ask(play, { run, bubble }, { range, last }) {
    const type = pickNumber(range[0], range[1], last);
    const q = patternQuestion(type, Object.keys(ITEMS));
    const unit = PATTERN_TYPES[type].length;

    const cells = q.sequence.map((key) => h('span', { class: 'pcell' }, itemArt(key)));
    const blank = h('span', { class: 'pcell blank' }, h('b', {}, '?'));
    const fill = () => blank.replaceChildren(itemArt(q.answer));
    const onPick = pickHandler(run, q.answer, fill);
    const options = q.options.map((key) => {
      const btn = h('button', { class: 'opt pict press pick', 'data-value': key, 'aria-label': ITEMS[key].name }, itemArt(key));
      btn.addEventListener('click', () => onPick(key, btn));
      return btn;
    });

    play.replaceChildren(h('div', { class: 'patternq' }, h('div', { class: 'pseq' }, cells, blank), h('div', { class: 'opts' }, options)));

    async function hint() {
      // 힌트 말이 끝난 뒤 반짝이고, 반짝임이 끝나면 마지막 안내 (말끼리 끊지 않게)
      await untilSpoken(bubble(PATTERN_HINT, true), HINT_START_MS);
      for (let start = 0; start + unit <= cells.length; start += unit) {
        if (run.state.stopped) return;
        const group = cells.slice(start, start + unit);
        group.forEach((c) => c.classList.add('hl'));
        await wait(UNIT_MS);
        group.forEach((c) => c.classList.remove('hl'));
      }
      if (run.state.stopped) return;
      blank.classList.add('hl');
      bubble(PATTERN_HINT_END, true);
    }

    return { n: type, answer: q.answer, prompt: PATTERN_PROMPT, hint };
  },
};
