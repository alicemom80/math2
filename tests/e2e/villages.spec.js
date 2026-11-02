import { test, expect } from './fixtures.js';
import { startWith } from './helpers.js';

// 숲속·바닷가·공룡·농장 마을 게임 11개 (농장의 숫자 따라 그리기는 아래 따로): 첫 문제는 두 번 틀려 힌트를 보고, 5문제를 맞혀 별을 받는다.
// 게임판(.play)의 data-answer가 정답이고, 고르는 버튼은 .pick[data-value].
test.setTimeout(90_000);

const GAMES = [
  ['숲속 마을', '풍선 터뜨리기', 'balloon'],
  ['숲속 마을', '어느 쪽이 많아?', 'trees'],
  ['숲속 마을', '도토리 세기', 'acorns'],
  ['바닷가 마을', '무늬 잇기', 'pattern'],
  ['바닷가 마을', '물고기 묶기', 'fishnet'],
  ['바닷가 마을', '열씩 세기', 'shells'],
  ['공룡 나라', '숫자판 찾기', 'board'],
  ['공룡 나라', '발자국 빈칸', 'steps'],
  ['공룡 나라', '알 더하기·빼기', 'eggs'],
  ['농장 마을', '달걀 바구니', 'basket'],
  ['농장 마을', '숫자 찾기', 'rowfind'],
];

const answerOf = (page) => page.locator('.play').getAttribute('data-answer');

async function pickRight(page) {
  const answer = await answerOf(page);
  await page.locator(`.play .pick[data-value="${answer}"]`).click({ force: true }); // 풍선은 계속 떠다녀서 멈추기를 기다리지 않는다
}

for (const [village, name, key] of GAMES) {
  test(`${village} · ${name}: 두 번 틀리면 힌트, 5문제를 맞히면 별`, async ({ page }) => {
    await startWith(page, { allOpen: true });
    await page.getByRole('button', { name: village, exact: true }).click();
    await expect(page.locator('.gcard')).toHaveCount(3);
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.qdots i')).toHaveCount(5);

    // 첫 문제: 두 번 틀린다 → 힌트가 끝나면 정답을 누를 수 있다
    const answer = await answerOf(page);
    const wrong = page.locator(`.play .pick:not([data-value="${answer}"])`).first();
    await wrong.click({ force: true });
    await expect(page.locator('.bubble')).toContainText('다시 해 볼까?');
    await page.waitForTimeout(800); // 첫 오답 뒤 잠깐 누르기를 막는다
    await wrong.click({ force: true });
    await expect(async () => {
      await pickRight(page);
      await expect(page.locator('.qdots i.on')).toHaveCount(1, { timeout: 600 });
    }).toPass({ timeout: 20_000 });

    for (let q = 2; q <= 5; q++) {
      await expect(page.locator('.play .right')).toHaveCount(0, { timeout: 5000 }); // 다음 문제가 뜰 때까지
      await pickRight(page);
      await expect(page.locator('.qdots i.on')).toHaveCount(q);
    }

    await expect(page.locator('.reward .sticker')).toBeVisible();
    await page.getByRole('button', { name: '다음' }).click();
    await expect(page.locator(`.gcard[data-game="${key}"] .star`)).toBeVisible();
  });
}

/** 숫자 따라 그리기: 검사용 빌드가 적어 둔 획 좌표(data-strokes)를 마우스로 차례로 긋는다 */
async function traceDigit(page) {
  const board = page.locator('.play svg.lineq');
  await expect(board).toBeVisible();
  const strokes = await board.evaluate((svg) => {
    const m = svg.getScreenCTM();
    return JSON.parse(svg.dataset.strokes).map((s) =>
      s.map(([x, y]) => {
        const p = new DOMPoint(x, y).matrixTransform(m);
        return [p.x, p.y];
      }),
    );
  });
  for (const stroke of strokes) {
    const dense = [stroke[0]];
    for (let i = 1; i < stroke.length; i += 1) {
      const [ax, ay] = stroke[i - 1];
      const [bx, by] = stroke[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 6));
      for (let k = 1; k <= steps; k += 1) dense.push([ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps]);
    }
    await page.mouse.move(...dense[0]);
    await page.mouse.down();
    for (const p of dense.slice(1)) await page.mouse.move(...p);
    await page.mouse.up();
  }
}

test('농장 마을 · 숫자 따라 그리기: 5문제를 따라 그리면 별', async ({ page }) => {
  await startWith(page, { allOpen: true });
  await page.getByRole('button', { name: '농장 마을', exact: true }).click();
  await expect(page.locator('.gcard')).toHaveCount(3);
  await page.getByRole('button', { name: '숫자 따라 그리기', exact: true }).click();
  await expect(page.locator('.qdots i')).toHaveCount(5);
  for (let q = 1; q <= 5; q++) {
    await expect(page.locator('.play .right')).toHaveCount(0, { timeout: 5000 });
    // 새 문제는 아직 아무것도 안 그린 상태로 시작한다 (이전 문제의 긋기가 넘어오지 않는다)
    await expect(page.locator('.play .lfill:not([style*="hidden"])')).toHaveCount(0);
    await traceDigit(page);
    await expect(page.locator('.qdots i.on')).toHaveCount(q);
  }
  await expect(page.locator('.reward .sticker')).toBeVisible();
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.locator('.gcard[data-game="trace"] .star')).toBeVisible();
});

test('숲속 마을 게임 3개를 다 끝내면 바닷가 마을이 열린다', async ({ page }) => {
  await startWith(page, { forestOpen: true, done: { balloon: true, trees: true } });
  await page.getByRole('button', { name: '바닷가 마을, 잠김' }).waitFor();
  await page.getByRole('button', { name: '숲속 마을', exact: true }).click();
  await page.getByRole('button', { name: '도토리 세기', exact: true }).click();
  for (let q = 1; q <= 5; q++) {
    await expect(page.locator('.play .right')).toHaveCount(0, { timeout: 5000 });
    await pickRight(page);
    await expect(page.locator('.qdots i.on')).toHaveCount(q);
  }
  await expect(page.locator('.reward .open')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('elephant-numbers')));
  expect(saved.seaOpen).toBe(true);
});

test('스티커북: 마을 버튼으로 쪽을 넘기고, 마을에서 열면 그 마을 쪽이 먼저 보인다', async ({ page }) => {
  await startWith(page, { allOpen: true, stickers: ['rabbit', 'penguin', 'crab'] });
  await page.getByRole('button', { name: '숲속 마을', exact: true }).click();
  await page.getByRole('button', { name: '스티커북' }).click();
  await expect(page.locator('.slot')).toHaveCount(6);
  await expect(page.locator('.slot.has')).toHaveCount(1);

  await page.getByRole('button', { name: '바닷가 마을 스티커' }).click();
  await expect(page.locator('.slot')).toHaveCount(10);
  await expect(page.locator('.slot.has')).toHaveCount(2);

  await page.getByRole('button', { name: '스티커북 닫기' }).click();
  await expect(page.locator('.gcard')).toHaveCount(3);
});
