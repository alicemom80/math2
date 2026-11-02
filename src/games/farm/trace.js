// 숫자 따라 그리기 (농장, 0~9): 굵은 점선 숫자를 획 순서대로 따라 쓴다.
// 초록 점과 화살표가 지금 쓸 획의 시작을 알려 준다. 너그럽게 판정한다(lineTrace.js): 벗어나면 멈추고 기다릴 뿐 틀림은 없다.
// 한동안 가만있으면 노란 점이 지금 획을 한 번 따라가며 보여 준다. 모든 획을 쓰면 정답.
import { h } from '@공통/widgets/dom.js';
import { pickOne, DRAW_PRAISE } from '@공통/games/logic.js';
import { pickHandler, replayClass } from '@공통/games/widgets.js';
import { buildPath, pointAt, startTrace, pressTrace, moveTrace, releaseTrace, isDone } from '../lineTrace.js';
import { strokesOf } from './traceDigits.js';
import { traceLinePrompt, LINE_START_HINT, LINE_IDLE_HINT } from '../../audio/villageScript.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TOLERANCE = 11;
const START_DOT = 5.5;
const ARROW_AT = 12; // 시작 화살표를 놓는 거리 (길을 따라)
const IDLE_HINT_MS = 5000;
const DEMO_MS = 2000;
const DEMO_STEP_MS = 40;
const MAX_DEMOS = 2; // 가만있기 안내는 한 문제에 이만큼만
const START_HINT_GAP_MS = 3000; // "초록 점을 눌러" 안내를 너무 자주 하지 않게
const LINE_COLOR = '#e8743b';
const DIGIT_WIDTH = 60;
// 브라우저 자동 검사가 획을 따라 그을 수 있게, 개발 서버와 검사용 빌드에만 획 좌표를 적어 둔다
const EXPOSE_PATH = import.meta.env.DEV || import.meta.env.VITE_E2E === '1';

// 난이도별 숫자: 쉬운 모양 → 둥근 모양 → 획이 여러 개이거나 어려운 모양
export const DIGITS_BY_LEVEL = Object.freeze([
  Object.freeze([1, 0, 7]),
  Object.freeze([4, 6, 9]),
  Object.freeze([2, 3, 5, 8]),
]);


/** 단계(level)의 숫자 중 하나. 바로 앞 문제(last)와 같은 수는 되도록 피한다 */
export function pickDigit(level, last) {
  const pool = DIGITS_BY_LEVEL[level] ?? DIGITS_BY_LEVEL[0];
  const others = pool.filter((d) => d !== last);
  return pickOne(others.length ? others : pool);
}

function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  el.append(...children);
  return el;
}

const dOf = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const placeAt = (el, [x, y]) => el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
const round1 = (v) => Math.round(v * 10) / 10;

/** 획 하나: 하얀 바탕길 + 점선 + 채워지는 색 선 */
function strokeLayer(path) {
  const d = dOf(path.points);
  const fill = svg('path', { class: 'lfill', d, pathLength: path.length, 'stroke-dasharray': `${path.length} ${path.length + 1}` });
  const draw = (reached) => {
    fill.setAttribute('stroke-dashoffset', String(path.length - reached));
    fill.style.visibility = reached > 0 ? '' : 'hidden';
  };
  draw(0);
  return { bed: svg('path', { class: 'lbed', d }), guide: svg('path', { class: 'lguide', d }), fill, draw };
}

/** 시작 화살표: 획이 처음 나아가는 방향을 가리킨다 */
function placeArrow(arrow, path) {
  const at = Math.min(ARROW_AT, path.length / 2);
  const [ax, ay] = pointAt(path, at - 2);
  const [bx, by] = pointAt(path, at + 2);
  const deg = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
  const [x, y] = pointAt(path, at);
  arrow.setAttribute('transform', `translate(${x} ${y}) rotate(${deg})`);
}

export const traceGame = {
  key: 'trace',
  background: 'farm-base',
  praise: DRAW_PRAISE,
  levels: [
    [0, 0],
    [1, 1],
    [2, 2],
  ], // 수 범위 대신 단계 번호를 쓴다 (range[0])

  ask(play, { run, bubble, sfx }, { range, last }) {
    const n = pickDigit(range[0], last);
    const strokes = strokesOf(n);
    const paths = strokes.map(buildPath);
    const layers = paths.map(strokeLayer);
    const start = svg('g', { class: 'lstart' }, svg('circle', { r: START_DOT }));
    const arrow = svg('polygon', { class: 'larrow', points: '-3.2,-3.6 3.8,0 -3.2,3.6' });
    const hintDot = svg('circle', { class: 'lhint', r: 4 });
    const board = svg(
      'svg',
      { class: 'lineq farm-trace', viewBox: `-12 -10 ${DIGIT_WIDTH + 20} 120`, style: `--line:${LINE_COLOR}`, role: 'img', 'aria-label': `숫자 ${n} 따라 쓰기` },
      ...layers.map((l) => l.bed),
      ...layers.map((l) => l.guide),
      ...layers.map((l) => l.fill),
      start,
      arrow,
      hintDot,
    );
    if (EXPOSE_PATH) board.dataset.strokes = JSON.stringify(strokes.map((s) => s.map(([x, y]) => [round1(x), round1(y)])));

    let index = 0;
    let trace = startTrace();
    let finished = false;
    let idleTimer = null;
    let demoTimer = null;
    let demos = 0;
    let lastStartHint = 0;
    const opts = { tolerance: TOLERANCE };
    const onDone = pickHandler(run, n);

    function showStart() {
      placeAt(start, pointAt(paths[index], trace.reached));
      placeArrow(arrow, paths[index]);
      arrow.style.visibility = trace.reached > 0 ? 'hidden' : '';
    }

    const alive = () => board.isConnected && !run.state.stopped && !finished;

    function stopDemo() {
      clearInterval(demoTimer);
      demoTimer = null;
      hintDot.classList.remove('on');
    }

    function armIdle() {
      clearTimeout(idleTimer);
      if (demos >= MAX_DEMOS) return;
      idleTimer = setTimeout(() => {
        if (!alive() || run.state.busy || trace.active) return;
        demos += 1;
        if (demos > 1) bubble(LINE_IDLE_HINT, true); // 첫 안내는 말 없이 점만 (방금 들은 설명과 겹치거나 끊지 않게)
        const path = paths[index];
        const from = trace.reached;
        const began = Date.now();
        hintDot.classList.add('on');
        demoTimer = setInterval(() => {
          const t = Math.min((Date.now() - began) / DEMO_MS, 1);
          if (!alive()) return stopDemo();
          placeAt(hintDot, pointAt(path, from + (path.length - from) * t));
          if (t >= 1) {
            stopDemo();
            armIdle();
          }
        }, DEMO_STEP_MS);
      }, IDLE_HINT_MS);
    }

    function nextStroke() {
      layers[index].draw(paths[index].length);
      sfx.pop();
      index += 1;
      trace = startTrace();
      board.classList.remove('drawing');
      if (index < paths.length) {
        showStart();
        armIdle();
        return;
      }
      finished = true;
      clearTimeout(idleTimer);
      stopDemo();
      start.remove();
      arrow.remove();
      onDone(n, board);
    }

    const toLocal = (e) => {
      const m = board.getScreenCTM();
      if (!m) return null;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      return [p.x, p.y];
    };

    board.addEventListener('pointerdown', (e) => {
      run.poke();
      if (finished || run.state.busy) return;
      const p = toLocal(e);
      if (!p) return;
      e.preventDefault();
      clearTimeout(idleTimer);
      stopDemo();
      trace = pressTrace(paths[index], trace, p, opts);
      if (trace.active) {
        board.setPointerCapture?.(e.pointerId);
        board.classList.add('drawing');
        return;
      }
      replayClass(start, 'hl'); // 엉뚱한 곳을 눌렀으면 이어 쓸 자리를 반짝인다
      if (Date.now() - lastStartHint > START_HINT_GAP_MS) {
        lastStartHint = Date.now();
        bubble(LINE_START_HINT, true);
      }
      armIdle();
    });

    board.addEventListener('pointermove', (e) => {
      if (!trace.active || finished) return;
      const p = toLocal(e);
      if (!p) return;
      run.poke();
      trace = moveTrace(paths[index], trace, p, opts);
      layers[index].draw(trace.reached);
      showStart();
      if (isDone(paths[index], trace)) nextStroke();
    });

    const release = () => {
      if (!trace.active || finished) return;
      trace = releaseTrace(trace);
      board.classList.remove('drawing');
      armIdle();
    };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => board.addEventListener(ev, release));

    showStart();
    play.replaceChildren(h('div', { class: 'farmtraceq' }, board));
    armIdle();

    // 틀리는 일이 없어서 엔진이 힌트를 부르지 않는다. 힌트는 위의 가만있기 안내가 맡는다.
    return { n, prompt: traceLinePrompt(n), hint: async () => {} };
  },
};
