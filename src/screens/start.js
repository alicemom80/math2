// 시작 화면: 코끼리 인사 + ▶
import { h, art, roundButton } from '@공통/widgets/dom.js';
import { GREETING } from '../audio/script.js';

/**
 * 휴대폰·태블릿 브라우저: ▶를 누르면 주소창 없는 전체 화면 + 가로 고정.
 * 아이폰처럼 지원하지 않거나, 컴퓨터(마우스)거나, 이미 홈 화면 앱으로 열었으면 그냥 넘어간다.
 * 전체 화면은 누르는 순간에만 요청할 수 있어서 ▶에서 한다.
 */
function enterFullscreen() {
  const page = document.documentElement;
  if (!page.requestFullscreen || document.fullscreenElement) return;
  if (!matchMedia('(pointer: coarse)').matches) return;
  if (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) return;
  page
    .requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {}); // 막혀도 앱은 그대로 쓸 수 있다
}

export const startScreen = {
  showBar: false,
  background: 'savanna-numbers',
  render(root, app) {
    const start = () => {
      enterFullscreen();
      app.startSound();
      app.go('map');
      app.say(GREETING);
    };
    // 링크를 열자마자는 브라우저가 막으므로, 시작 화면 어디든 처음 누르는 순간 전체 화면으로
    root.addEventListener('pointerdown', enterFullscreen, { once: true });
    root.append(
      art('character', 'elephant', { class: 'hero', alt: '코끼리' }),
      h('h1', {}, '코끼리와 숫자 친구들 (2단계)'),
      roundButton('play', '시작', start),
      h('div', { class: 'credit', 'aria-hidden': 'true' }, h('i', { class: 'igicon' }), 'instagram ', h('b', {}, '@alicemom80')),
    );
  },
};
