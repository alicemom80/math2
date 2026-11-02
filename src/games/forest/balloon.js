// 풍선 터뜨리기 (숲속, 1~20 숫자 알아보기): "십사 풍선을 터뜨려 줘!" → 숫자 풍선 5개 중 골라 누른다.
// 힌트: 정답 풍선이 반짝이고 "이게 십사 풍선이야!"
import { h, art } from '@공통/widgets/dom.js';
import { pickNumber, wait } from '@공통/games/logic.js';
import { pickHandler } from '@공통/games/widgets.js';
import { pickDistinct } from '@공통/games/questions.js';
import { balloonPrompt, BALLOON_HINT, balloonHintEnd } from '../../audio/villageScript.js';
import { PICK_PRAISE } from '@공통/games/logic.js';

const BALLOONS = 5;
const COLORS = ['balloon-red', 'balloon-blue', 'balloon-yellow', 'balloon-green'];
const PIECE_COLORS = ['#ff6b5e', '#5fb6f0', '#ffd23f', '#6cc96a']; // 터질 때 튀는 조각 색 (풍선 색과 같은 순서)
const PIECES = 8;
const POP_AT_MS = 600; // 둥실 올라간 뒤 터지는 때 (villages.css의 balloon-rise 길이와 같다)
const HINT_MS = 1600;

/** 정답 풍선: 올라가다 펑! 조각과 글자를 넣고, 터지는 순간 소리를 낸다 */
function popBalloon(btn, run, sfx) {
  const pieces = Array.from({ length: PIECES }, (_, k) => h('i', { style: `--a:${(360 / PIECES) * k}deg` }));
  btn.querySelector('.bfloat').append(h('span', { class: 'bpop', 'aria-hidden': 'true' }, pieces, h('em', {}, '펑!')));
  setTimeout(() => {
    if (!run.state.stopped) sfx.pop();
  }, POP_AT_MS);
}

export const balloonGame = {
  praise: PICK_PRAISE,
  key: 'balloon',
  background: 'forest-base',
  levels: [
    [1, 10],
    [6, 15],
    [11, 20],
  ],

  ask(play, { run, bubble, sfx }, { range, last }) {
    const n = pickNumber(range[0], range[1], last);
    const onPick = pickHandler(run, n, () => popBalloon(buttons.find((b) => Number(b.dataset.value) === n), run, sfx));
    const buttons = pickDistinct(n, range[0], range[1], BALLOONS).map((v, i) => {
      const color = PIECE_COLORS[i % PIECE_COLORS.length];
      const btn = h(
        'button',
        { class: 'balloon pick', 'data-value': v, 'aria-label': String(v), style: `--i:${i};--c:${color}` },
        // 누르는 자리(버튼)는 그대로 두고 안의 그림만 둥실거린다 (움직이는 걸 누르기 어렵지 않게)
        h('span', { class: 'bfloat' }, art('prop', COLORS[i % COLORS.length]), h('b', {}, String(v))),
      );
      btn.addEventListener('click', () => onPick(v, btn));
      return btn;
    });
    play.replaceChildren(h('div', { class: 'balloonq' }, buttons));

    async function hint() {
      const target = buttons.find((b) => Number(b.dataset.value) === n);
      bubble(BALLOON_HINT, true);
      target.classList.add('hl');
      await wait(HINT_MS);
      if (run.state.stopped) return;
      bubble(balloonHintEnd(n), true);
    }

    return { n, prompt: balloonPrompt(n), hint };
  },
};
