import { test, expect } from './fixtures.js';
import { startWith } from './helpers.js';

test.setTimeout(60_000);

const SAVANNA = ['elephant', 'giraffe', 'hippo', 'rhino', 'lion', 'tiger', 'zebra', 'lemur', 'capybara'];


/** 반짝 무늬 보기 5문제를 모두 맞힌다 */
async function clearSpots(page) {
  await page.getByRole('button', { name: '사바나 마을', exact: true }).click();
  await page.getByRole('button', { name: '반짝 무늬 보기' }).click();
  for (let q = 1; q <= 5; q++) {
    const n = Number(await page.locator('.card').getAttribute('data-count'));
    await page.locator(`.opts .opt[aria-label="${n}"]`).click();
    await expect(page.locator('.qdots i.on')).toHaveCount(q);
    if (q < 5) await expect(page.locator('.opt.right')).toHaveCount(0, { timeout: 5000 });
  }
}

test('마지막 게임과 마지막 동물: 스티커 → 숲속 마을 열림 → 부엉이 → 마을', async ({ page }) => {
  await startWith(page, { done: { fruit: true, pond: true }, stickers: SAVANNA.slice(0, 8) });
  await clearSpots(page);

  await expect(page.getByRole('img', { name: '카피바라' })).toBeVisible();
  await expect(page.locator('.reward p')).toHaveText('카피바라 스티커!');
  await expect(page.getByRole('img', { name: '숲속 마을이 열렸어!' })).toBeVisible();

  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByRole('img', { name: '부엉이' })).toBeVisible();
  await expect(page.locator('.reward p')).toHaveText('특별 친구 부엉이!');

  // 바로 또 누르면 무시하고 부엉이를 계속 보여 준다
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByRole('img', { name: '부엉이' })).toBeVisible();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.locator('.gcard .star')).toHaveCount(3);
  await expect(page.locator('.bookbtn b')).toHaveText('10');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('elephant-numbers')));
  expect(saved).toMatchObject({ forestOpen: true, special: true, specialSeen: true });
  expect(saved.stickers).toHaveLength(9);

  // 다시 열어도 숲속 마을은 열려 있다
  await page.reload();
  await page.getByRole('button', { name: '시작' }).click();
  await expect(page.getByRole('button', { name: '숲속 마을', exact: true })).toBeVisible();
});

test('게임이 남아 있으면 스티커만 받고 마을은 열리지 않는다', async ({ page }) => {
  await startWith(page, {});
  await clearSpots(page);
  await expect(page.locator('.reward .sticker')).toBeVisible();
  await expect(page.locator('.reward .open')).toHaveCount(0);
  await expect(page.locator('.bookbtn')).toBeHidden();

  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.locator('.gcard[data-game="spots"] .star')).toBeVisible();
  await expect(page.locator('.bookbtn b')).toHaveText('1');
});

test('스티커북: 10칸 중 모은 친구만 색깔로 보이고, 닫으면 열기 전 화면으로 돌아간다', async ({ page }) => {
  await startWith(page, { stickers: ['elephant', 'hippo'] });

  await page.getByRole('button', { name: '스티커북' }).click();
  await expect(page.locator('.slot')).toHaveCount(10);
  await expect(page.locator('.slot.has')).toHaveCount(2);
  await expect(page.getByRole('button', { name: '코끼리' })).toBeVisible();
  await expect(page.getByRole('button', { name: '아직 없음', exact: true })).toHaveCount(7);
  await expect(page.getByRole('button', { name: '특별 친구, 아직 없음' })).toBeVisible();

  await page.getByRole('button', { name: '스티커북 닫기' }).click();
  await expect(page.locator('.vcard')).toHaveCount(5);

  // 마을에서 열면 마을로 돌아간다
  await page.getByRole('button', { name: '사바나 마을', exact: true }).click();
  await page.getByRole('button', { name: '스티커북' }).click();
  await page.getByRole('button', { name: '스티커북 닫기' }).click();
  await expect(page.locator('.gcard')).toHaveCount(3);
});

test('게임 중에는 스티커북 버튼이 숨는다', async ({ page }) => {
  await startWith(page, {});
  await page.getByRole('button', { name: '사바나 마을', exact: true }).click();
  await page.getByRole('button', { name: '과일 세기' }).click();
  await expect(page.locator('.bookbtn')).toBeHidden();
  await page.getByRole('button', { name: '마을로 돌아가기' }).click();
  await expect(page.locator('.bookbtn')).toBeVisible();
});
