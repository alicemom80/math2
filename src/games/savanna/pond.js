// 물웅덩이 채우기 (하마): 목표 수만큼 하마를 끌거나 톡 눌러 물웅덩이에 넣고 ✓를 누른다.
import { h, art } from '@공통/widgets/dom.js';
import { NATIVE, pickNumber, wait } from '@공통/games/logic.js';
import { tenFrameEl, replayClass } from '@공통/games/widgets.js';
import { pondPrompt, pondHintStart, POND_EMPTY, pondTooFew, pondTooMany } from '../../audio/script.js';
import { COUNT_PRAISE } from '@공통/games/logic.js';

const MAX_HIPPOS = 8;
const EXTRA_HIPPOS = 2;
// 하마 크기·간격 (cqh). games.css의 .hip 크기와 맞춘다
const HIP_W = 15;
const HIP_H = 18;
const HIP_STEP_X = 16;
const HIP_STEP_Y = 19;
const POND_ROW = 4;
const HOME_LEFT = 6; // 기다리는 하마 자리를 왼쪽 끝에서 조금 띄운다
const DRAG_START_PX = 8;
const HINT_START_MS = 2000;
const HINT_STEP_MS = 750;
// 물웅덩이 그림 안의 물 부분(타원): 가운데와 반지름 비율
const WATER = { cx: 0.5, cy: 0.52, rx: 0.42, ry: 0.38 };

export const pondGame = {
  praise: COUNT_PRAISE,
  key: 'pond',
  background: 'savanna-base',
  levels: [
    [1, 3],
    [2, 5],
    [3, 6],
  ],

  ask(play, { run, say, bubble, sfx }, { range, last }) {
    const n = pickNumber(range[0], range[1], last);
    const total = Math.min(n + EXTRA_HIPPOS, MAX_HIPPOS);

    const pond = h('div', { class: 'pond' }, art('prop', 'pond'));
    const sign = h('div', { class: 'sign', 'aria-label': `목표 ${n}`, 'data-target': n }, h('b', {}, String(n)), tenFrameEl(n));
    const done = h('button', { class: 'rbtn press done', 'aria-label': '다 했어' }, art('icon', 'check', { class: 'ico' }));
    const pq = h('div', { class: 'pondq' }, pond, sign, done);
    play.replaceChildren(pq);

    const unit = () => (pq.closest('.stage')?.clientHeight ?? 800) / 100; // 1cqh를 픽셀로
    const home = (i) => ({ x: (HOME_LEFT + (i % 2) * HIP_STEP_X) * unit(), y: Math.floor(i / 2) * HIP_STEP_Y * unit() + 2 * unit() });
    // 웅덩이 안: 들어간 하마 m마리를 한 줄에 4마리씩, 물 한가운데를 중심으로 모아 놓는다
    const slot = (j, m) => {
      const u = unit();
      const rows = Math.ceil(m / POND_ROW);
      const row = Math.floor(j / POND_ROW);
      const inRow = Math.min(POND_ROW, m - row * POND_ROW);
      const col = j % POND_ROW;
      return {
        x: pond.offsetLeft + pond.offsetWidth * WATER.cx + (col - (inRow - 1) / 2) * HIP_STEP_X * u - (HIP_W * u) / 2,
        y: pond.offsetTop + pond.offsetHeight * WATER.cy + (row - (rows - 1) / 2) * HIP_STEP_Y * u - (HIP_H * u) / 2,
      };
    };

    const hippos = Array.from({ length: total }, (_, i) => {
      const el = h('div', { class: 'hip', role: 'button', tabindex: '0', 'aria-label': '하마' }, art('character', 'hippo', { alt: '' }));
      pq.append(el);
      return { el, i, inPond: false };
    });
    const inside = () => hippos.filter((hp) => hp.inPond);

    function layout() {
      let j = 0;
      const m = inside().length;
      hippos.forEach((hp) => {
        const p = hp.inPond ? slot(j++, m) : home(hp.i);
        hp.el.style.left = `${p.x}px`;
        hp.el.style.top = `${p.y}px`;
        hp.el.setAttribute('aria-pressed', String(hp.inPond));
      });
    }

    function setIn(hp, value) {
      const was = hp.inPond;
      hp.inPond = value;
      layout();
      if (value && !was) {
        sfx.pop();
        say(NATIVE[inside().length] ?? String(inside().length));
      } else if (!value && was) sfx.ding();
    }

    function inWater(el) {
      const r = pond.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const dx = (b.left + b.width / 2 - (r.left + r.width * WATER.cx)) / (r.width * WATER.rx);
      const dy = (b.top + b.height / 2 - (r.top + r.height * WATER.cy)) / (r.height * WATER.ry);
      return dx * dx + dy * dy <= 1;
    }

    hippos.forEach((hp) => {
      const { el } = hp;
      let start = null;
      el.addEventListener('pointerdown', (e) => {
        run.poke();
        // 이미 다른 손가락으로 잡고 있으면 무시 (드래그 위치가 튀지 않게)
        if (start || run.state.busy) return;
        el.setPointerCapture?.(e.pointerId);
        start = { id: e.pointerId, x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop, moved: false };
      });
      el.addEventListener('pointermove', (e) => {
        if (!start || e.pointerId !== start.id) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (!start.moved && Math.hypot(dx, dy) < DRAG_START_PX) return;
        start.moved = true;
        el.classList.add('drag');
        const scale = pq.getBoundingClientRect().width / pq.clientWidth || 1;
        el.style.left = `${start.left + dx / scale}px`;
        el.style.top = `${start.top + dy / scale}px`;
      });
      const release = (e) => {
        if (!start || e.pointerId !== start.id) return null;
        const { moved } = start;
        start = null;
        el.classList.remove('drag');
        return { moved };
      };
      el.addEventListener('pointerup', (e) => {
        const r = release(e);
        if (!r) return;
        // 정답 처리·힌트 중에 놓으면 상태는 그대로 두고 제자리로
        if (run.state.busy) layout();
        else setIn(hp, r.moved ? inWater(el) : !hp.inPond);
      });
      // 시스템 제스처 등으로 취소되면 넣거나 빼지 않고 제자리로만 돌린다
      el.addEventListener('pointercancel', (e) => {
        if (release(e)) layout();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (!run.state.busy) setIn(hp, !hp.inPond);
      });
    });

    done.addEventListener('click', async () => {
      run.poke();
      if (run.state.busy) return;
      const isRight = inside().length === n;
      if (!isRight) replayClass(done, 'no');
      if ((await run.answer(isRight)) === 'right') pond.classList.add('glow');
    });

    // 처음 배치는 화면에 붙은 뒤 크기를 알 수 있어서 한 박자 뒤에 한다
    layout();
    requestAnimationFrame(layout);

    async function hint() {
      bubble(pondHintStart(n), true);
      await wait(HINT_START_MS);
      const list = inside();
      for (let i = 0; i < list.length; i++) {
        if (run.state.stopped) return;
        list[i].el.classList.add('hl');
        say(NATIVE[i + 1]);
        await wait(HINT_STEP_MS);
      }
      if (run.state.stopped) return; // 힌트 중에 화면을 떠났으면 말하지 않는다
      list.forEach((hp) => hp.el.classList.remove('hl'));
      const k = list.length;
      bubble(
        k === 0 ? POND_EMPTY : k < n ? pondTooFew(k) : pondTooMany(k),
        true,
      );
    }

    return { n, prompt: pondPrompt(n), hint };
  },
};
