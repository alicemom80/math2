// 그림 목록: 이름 → 파일 위치. 그림을 바꿀 때는 public/images 안의 파일만 같은 이름으로 바꾸면 된다.

const BASE = `${import.meta.env.BASE_URL}images/`;

// 그려 둔 캐릭터 (webp)
const DRAWN_CHARACTERS = [
  'elephant', 'giraffe', 'hippo', 'rhino', 'lion', 'tiger', 'zebra', 'lemur', 'capybara',
  'rabbit', 'penguin', 'trex',
  'squirrel', 'crab', 'chick', 'pig',
  'panda', 'fox', 'owl', 'hedgehog',
  'polarbear', 'walrus', 'whale', 'turtle', 'dolphin', 'starfish', 'seaotter',
  'octopus', 'brachio', 'stego', 'ptera', 'dog', 'cat',
];
// 아직 그림이 없어 자리 표시용 그림(svg)을 쓰는 캐릭터. 그림을 그리면 webp로 넣고 위 목록으로 옮긴다.
// (npm run art:villages 로 다시 만든다)
export const PLACEHOLDER_CHARACTERS = Object.freeze([]); // 지금은 모두 그림이 있다
const ICONS = [
  'play', 'check', 'home', 'close', 'map', 'star', 'lock', 'settings', 'back', 'speaker', 'cake',
  'game-fruit', 'game-pond', 'game-spots',
];
const BACKGROUNDS = [
  'savanna-base', 'forest-base', 'sea-base', 'dino-base', 'farm-base',
  'savanna-numbers', // 시작·지도 화면 (사바나 배경에 숫자를 흩뿌린 그림)
  'night-base', // 잠금 화면
];
const PROPS = [
  'fruit-apple', 'fruit-strawberry', 'fruit-orange', 'fruit-banana', 'fruit-grape', 'fruit-peach',
  'giraffe-spot', 'bush', 'pond',
  'balloon-red', 'balloon-blue', 'balloon-yellow', 'balloon-green', 'tree', 'acorn',
  'fish', 'shell', 'star', 'net',
  'board', 'footprint', 'egg', 'dino-egg', 'nest',
  'basket', 'corn',
];
// 그려 둔 소품 (webp). 나머지 소품은 svg를 쓴다.
const DRAWN_PROPS = ['bush', 'fish', 'shell', 'footprint', 'dino-egg'];
// 그려 둔 아이콘·배경 (webp)
const DRAWN_ICONS = ['settings', 'speaker', 'star'];
const DRAWN_BACKGROUNDS = BACKGROUNDS; // 배경은 모두 그림

const KINDS = {
  character: { dir: 'characters', names: [...DRAWN_CHARACTERS, ...PLACEHOLDER_CHARACTERS] },
  icon: { dir: 'icons', names: ICONS },
  background: { dir: 'backgrounds', names: BACKGROUNDS },
  prop: { dir: 'props', names: PROPS },
};

const DRAWN = { character: DRAWN_CHARACTERS, prop: DRAWN_PROPS, icon: DRAWN_ICONS, background: DRAWN_BACKGROUNDS };
const extOf = (kind, name) => (DRAWN[kind]?.includes(name) ? 'webp' : 'svg');

/** 그림 파일 주소. 목록에 없는 이름이면 바로 오류를 내서 오타를 빨리 찾는다. */
export function artUrl(kind, name) {
  const group = KINDS[kind];
  if (!group) throw new Error(`[art] 없는 그림 종류입니다: ${kind}`);
  if (!group.names.includes(name)) throw new Error(`[art] 없는 그림입니다: ${kind}/${name}`);
  return `${BASE}${group.dir}/${name}.${extOf(kind, name)}`;
}

/** 모든 그림 주소 */
export const allArtUrls = () =>
  Object.keys(KINDS).flatMap((kind) => KINDS[kind].names.map((name) => artUrl(kind, name)));
