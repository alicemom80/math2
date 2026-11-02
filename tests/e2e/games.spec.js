import { test, expect } from './fixtures.js';

// 게임 하나가 5문제 + 문제 사이 1.6초라 넉넉히
test.setTimeout(60_000);

async function openGame(page, name) {
  await page.goto('./');
  await page.getByRole('button', { name: '시작' }).click();
  await page.getByRole('button', { name: '사바나 마을', exact: true }).click();
  await page.getByRole('button', { name }).click();
  await expect(page.locator('.qdots i')).toHaveCount(5);
}

/** 정답을 고른 뒤 다음 문제가 뜰 때까지 기다린다 */
async function waitNext(page, solved) {
  await expect(page.locator('.qdots i.on')).toHaveCount(solved);
  if (solved < 5) await expect(page.locator('.opt.right, .pond.glow')).toHaveCount(0, { timeout: 5000 });
}

async function expectStarOnCard(page, key) {
  // 5문제를 끝내면 보상 화면 → ▶ → 마을
  await expect(page.locator('.reward .sticker')).toBeVisible();
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.locator('.gcard')).toHaveCount(3);
  await expect(page.locator(`.gcard[data-game="${key}"] .star`)).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('elephant-numbers')));
  expect(saved.done[key]).toBe(true);
}

test('과일 세기: 하나씩 누르면 번호가 붙고, 5문제를 맞히면 마을로 돌아가 별이 붙는다', async ({ page }) => {
  await openGame(page, '과일 세기');

  for (let q = 1; q <= 5; q++) {
    const fruits = page.locator('.tray .fruit');
    const n = await fruits.count();
    expect(n).toBeGreaterThanOrEqual(1);
    await fruits.first().click();
    await expect(fruits.first().locator('span')).toHaveText('1');

    await expect(page.locator('.opts .opt')).toHaveCount(3);
    await page.locator(`.opts .opt[aria-label="${n}"]`).click();
    await waitNext(page, q);
  }

  await expectStarOnCard(page, 'fruit');
});

test('과일 세기: 첫 오답은 다시 해 보자고 하고, 두 번째 오답은 같이 세어 준다', async ({ page }) => {
  await openGame(page, '과일 세기');
  const n = await page.locator('.tray .fruit').count();
  const wrong = page.locator(`.opts .opt:not([aria-label="${n}"])`).first();

  await wrong.click();
  await expect(page.locator('.bubble')).toContainText('다시 해 볼까?');

  await wrong.click();
  await expect(page.locator('.bubble')).toContainText('같이 세어 보자');
  await expect(page.locator('.tray .fruit.c')).toHaveCount(n, { timeout: 15_000 });
  await expect(page.locator('.bubble')).toContainText('숫자를 골라 봐', { timeout: 15_000 });

  // 힌트 뒤에는 다시 풀 수 있다
  await page.locator(`.opts .opt[aria-label="${n}"]`).click();
  await expect(page.locator('.qdots i.on')).toHaveCount(1);
});

test('반짝 무늬 보기: 처음엔 "잘 봐!" 후 덤불로 가리고, 덤불을 누르면 다시 보여 준다', async ({ page }) => {
  await openGame(page, '반짝 무늬 보기');
  await expect(page.locator('.bubble')).toContainText('잘 봐!');
  await expect(page.locator('.cover')).toBeHidden();
  await expect(page.locator('.cover')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('.bubble')).toContainText('몇 개였을까?');

  await page.getByRole('button', { name: '다시 보기' }).click();
  await expect(page.locator('.cover')).toBeHidden();
  await expect(page.locator('.cover')).toBeVisible({ timeout: 4000 });
});

test('반짝 무늬 보기: 5문제를 맞히면 별이 붙는다', async ({ page }) => {
  await openGame(page, '반짝 무늬 보기');
  for (let q = 1; q <= 5; q++) {
    const n = Number(await page.locator('.card').getAttribute('data-count'));
    expect(await page.locator('.card .spot').count()).toBe(n);
    await page.locator(`.opts .opt[aria-label="${n}"]`).click();
    await waitNext(page, q);
  }
  await expectStarOnCard(page, 'spots');
});

test('물웅덩이 채우기: 하마를 톡 눌러 목표만큼 넣고 ✓를 누르면 맞는다 (5문제)', async ({ page }) => {
  await openGame(page, '물웅덩이 채우기');
  for (let q = 1; q <= 5; q++) {
    const n = Number(await page.locator('.sign').getAttribute('data-target'));
    const hippos = page.locator('.hip[aria-pressed="false"]');
    for (let i = 0; i < n; i++) await hippos.first().click();
    await expect(page.locator('.hip[aria-pressed="true"]')).toHaveCount(n);
    await page.getByRole('button', { name: '다 했어' }).click();
    await waitNext(page, q);
  }
  await expectStarOnCard(page, 'pond');
});

test('물웅덩이 채우기: 하마를 끌어서 물웅덩이에 넣을 수 있고, 수가 틀리면 맞지 않는다', async ({ page }) => {
  await openGame(page, '물웅덩이 채우기');
  const hippo = page.locator('.hip').first();
  const from = await hippo.boundingBox();
  const pond = await page.locator('.pond').boundingBox();

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(pond.x + pond.width / 2, pond.y + pond.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(hippo).toHaveAttribute('aria-pressed', 'true');

  // 목표가 1이면 하나 더 넣어 2마리로 (그 밖에는 1마리라 이미 틀림)
  const n = Number(await page.locator('.sign').getAttribute('data-target'));
  if (n === 1) await page.locator('.hip[aria-pressed="false"]').first().click();
  await page.getByRole('button', { name: '다 했어' }).click();
  await expect(page.locator('.bubble')).toContainText('다시 해 볼까?');
  await expect(page.locator('.qdots i.on')).toHaveCount(0);
});

test('게임 중 집 버튼을 누르면 마을로 돌아가고 문제 점이 사라진다', async ({ page }) => {
  await openGame(page, '과일 세기');
  await page.getByRole('button', { name: '마을로 돌아가기' }).click();
  await expect(page.locator('.gcard')).toHaveCount(3);
  await expect(page.locator('.qdots i')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '마을로 돌아가기' })).toBeHidden();
});

test('게임 그림이 모두 불러와진다', async ({ page }) => {
  for (const name of ['과일 세기', '물웅덩이 채우기', '반짝 무늬 보기']) {
    await openGame(page, name);
    await page.waitForLoadState('networkidle');
    const broken = await page.locator('img').evaluateAll((imgs) =>
      imgs.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.getAttribute('src')),
    );
    expect(broken, name).toEqual([]);
  }
});
