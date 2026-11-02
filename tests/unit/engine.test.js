import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGameRun, NEXT_DELAY_MS, IDLE_REMIND_MS, RETRY_LOCK_MS, RETRY_TEXT, IDLE_TEXT } from '@공통/games/engine.js';

const LEVELS = [
  [1, 3],
  [2, 5],
  [4, 6],
];

function setup({ hint = vi.fn(async () => {}) } = {}) {
  const fx = { say: vi.fn(), bubble: vi.fn(), cheer: vi.fn(), sfx: { yes: vi.fn(), boing: vi.fn() } };
  const asked = [];
  const ask = vi.fn((info) => {
    asked.push(info);
    return { n: info.range[0], prompt: `문제 ${info.index + 1}`, hint };
  });
  const onProgress = vi.fn();
  const onFinish = vi.fn();
  const run = createGameRun({ levels: LEVELS, fx, ask, onProgress, onFinish });
  return { run, fx, ask, asked, hint, onProgress, onFinish };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('게임 흐름', () => {
  test('시작하면 첫 문제를 쉬운 범위로 묻고 말풍선에 보여 준다', () => {
    const { run, asked, fx } = setup();
    run.start();
    expect(asked[0]).toMatchObject({ index: 0, range: [1, 3] });
    expect(fx.bubble).toHaveBeenCalledWith('문제 1', true);
    expect(run.state.index).toBe(0);
  });

  test('맞히면 칭찬하고 1.6초 뒤 다음 문제로 간다', async () => {
    const { run, asked, fx, onProgress } = setup();
    run.start();
    expect(await run.answer(true)).toBe('right');
    expect(fx.sfx.yes).toHaveBeenCalled();
    expect(fx.cheer).toHaveBeenCalled();
    expect(onProgress).toHaveBeenLastCalledWith(1, 5);

    vi.advanceTimersByTime(NEXT_DELAY_MS - 1);
    expect(asked).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(asked).toHaveLength(2);
  });

  test('정답 효과가 끝나기 전 다시 누르면 무시한다', async () => {
    const { run, onProgress } = setup();
    run.start();
    await run.answer(true);
    expect(await run.answer(true)).toBe('ignored');
    expect(await run.answer(false)).toBe('ignored');
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  test('첫 오답은 "다시 해 볼까?"만, 두 번째 오답에서 같이 세기 힌트를 준다', async () => {
    const { run, fx, hint } = setup();
    run.start();
    expect(await run.answer(false)).toBe('retry');
    expect(fx.bubble).toHaveBeenLastCalledWith(RETRY_TEXT, true);
    expect(fx.sfx.boing).toHaveBeenCalledTimes(1);
    expect(hint).not.toHaveBeenCalled();

    vi.advanceTimersByTime(RETRY_LOCK_MS);
    expect(await run.answer(false)).toBe('hint');
    expect(hint).toHaveBeenCalledTimes(1);
    expect(run.state.busy).toBe(false);
  });

  test('힌트가 나오는 동안에는 답을 받지 않는다', async () => {
    let release;
    const hint = vi.fn(() => new Promise((r) => (release = r)));
    const { run } = setup({ hint });
    run.start();
    await run.answer(false);
    vi.advanceTimersByTime(RETRY_LOCK_MS);
    const pending = run.answer(false);
    expect(run.state.busy).toBe(true);
    expect(await run.answer(true)).toBe('ignored');
    release();
    await pending;
    expect(await run.answer(true)).toBe('right');
  });

  test('첫 오답 직후 연타는 무시해서 "다시 해 볼까?" 기회를 지킨다', async () => {
    const { run, hint, fx } = setup();
    run.start();
    await run.answer(false);
    expect(run.state.busy).toBe(true);
    expect(await run.answer(false)).toBe('ignored');
    expect(hint).not.toHaveBeenCalled();
    expect(fx.sfx.boing).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(RETRY_LOCK_MS);
    expect(run.state.busy).toBe(false);
    expect(await run.answer(true)).toBe('right');
  });

  test('힌트가 길어도 중간에 8초 알림이 끼어들지 않고, 힌트가 끝난 뒤 다시 잰다', async () => {
    let release;
    const hint = vi.fn(() => new Promise((r) => (release = r)));
    const { run, fx } = setup({ hint });
    run.start();
    await run.answer(false);
    vi.advanceTimersByTime(RETRY_LOCK_MS);
    const pending = run.answer(false);
    run.poke(); // 힌트 중에 아이가 화면을 눌러도
    vi.advanceTimersByTime(IDLE_REMIND_MS * 2);
    expect(fx.bubble).not.toHaveBeenCalledWith(IDLE_TEXT, true);

    release();
    await pending;
    vi.advanceTimersByTime(IDLE_REMIND_MS);
    expect(fx.bubble).toHaveBeenLastCalledWith(IDLE_TEXT, true);
  });

  test('5문제를 다 맞히면 끝 알림을 한 번 보낸다', async () => {
    const { run, onFinish, asked } = setup();
    run.start();
    for (let i = 0; i < 5; i++) {
      await run.answer(true);
      vi.advanceTimersByTime(NEXT_DELAY_MS);
    }
    expect(asked).toHaveLength(5);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test('한 번에 3번 연속 맞히면 다음 문제 범위가 커진다', async () => {
    const { run, asked } = setup();
    run.start();
    for (let i = 0; i < 3; i++) {
      await run.answer(true);
      vi.advanceTimersByTime(NEXT_DELAY_MS);
    }
    expect(asked[3].range).toEqual([2, 5]);
  });

  test('바로 앞 문제의 수를 알려 줘서 같은 수가 반복되지 않게 한다', async () => {
    const { run, asked } = setup();
    run.start();
    await run.answer(true);
    vi.advanceTimersByTime(NEXT_DELAY_MS);
    expect(asked[1].last).toBe(1);
  });

  test('8초 동안 아무것도 안 누르면 다시 듣는 방법을 한 번만 알려 준다', () => {
    const { run, fx } = setup();
    run.start();
    vi.advanceTimersByTime(IDLE_REMIND_MS);
    expect(fx.bubble).toHaveBeenLastCalledWith(IDLE_TEXT, true);
    vi.advanceTimersByTime(IDLE_REMIND_MS * 3);
    expect(fx.bubble.mock.calls.filter(([t]) => t === IDLE_TEXT)).toHaveLength(1);
  });

  test('무언가를 누르면 8초를 처음부터 다시 잰다', () => {
    const { run, fx } = setup();
    run.start();
    vi.advanceTimersByTime(IDLE_REMIND_MS - 1000);
    run.poke();
    vi.advanceTimersByTime(IDLE_REMIND_MS - 1000);
    expect(fx.bubble).not.toHaveBeenCalledWith(IDLE_TEXT, true);
  });

  test('replay는 지금 문제를 다시 읽어 준다', () => {
    const { run, fx } = setup();
    run.start();
    run.replay();
    expect(fx.say).toHaveBeenLastCalledWith('문제 1');
  });

  test('놀이 시간이 다 되면 하던 문제를 맞힌 뒤 다음 문제 대신 멈춘다', async () => {
    const fx = { say: vi.fn(), bubble: vi.fn(), cheer: vi.fn(), sfx: { yes: vi.fn(), boing: vi.fn() } };
    const ask = vi.fn(() => ({ n: 1, prompt: '문제', hint: async () => {} }));
    const onPause = vi.fn();
    let over = false;
    const run = createGameRun({ levels: LEVELS, fx, ask, shouldPause: () => over, onPause });
    run.start();
    over = true; // 문제를 푸는 중에 시간이 다 됨
    await run.answer(true);
    vi.advanceTimersByTime(NEXT_DELAY_MS);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(run.state.stopped).toBe(true);
  });

  test('stop하면 남은 타이머가 모두 멈춘다', async () => {
    const { run, asked, fx } = setup();
    run.start();
    await run.answer(true);
    run.stop();
    vi.advanceTimersByTime(IDLE_REMIND_MS * 2);
    expect(asked).toHaveLength(1);
    expect(fx.bubble).not.toHaveBeenCalledWith(IDLE_TEXT, true);
    expect(await run.answer(true)).toBe('ignored');
  });
});
