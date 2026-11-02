// 게임 화면: 왼쪽 아래 코끼리 + 말풍선, 오른쪽에 게임판. 5문제를 끝내면 보상 화면(스티커)으로 간다.
import { h, art } from '@공통/widgets/dom.js';
import { cheer } from '../widgets/cheer.js';
import { stopVoice } from '../audio/voice.js';
import { createGameRun } from '@공통/games/engine.js';
import { findGame } from '../games/index.js';
import { finishGame } from '../app/rewards.js';
import { findVillage } from '../villages/index.js';

// 브라우저 자동 검사가 정답을 알 수 있게 게임판에 정답을 적어 둔다.
// 개발 서버와 검사용 빌드(VITE_E2E=1)에만 넣고, 배포본에는 넣지 않는다.
const EXPOSE_ANSWER = import.meta.env.DEV || import.meta.env.VITE_E2E === '1';

let currentRun = null;
let currentStage = null;

function createBubble(app) {
  const text = h('span', {});
  const el = h('button', { class: 'bubble', 'aria-label': '다시 듣기' }, art('icon', 'speaker', { class: 'spk' }), text);
  return {
    el,
    set(message, speak = true) {
      text.textContent = message;
      return speak ? app.say(message) : undefined;
    },
  };
}

function createGuide() {
  const el = h('button', { class: 'guide', 'aria-label': '코끼리, 다시 듣기' }, art('character', 'elephant', { alt: '' }));
  return {
    el,
    hop() {
      el.classList.remove('happy');
      void el.offsetWidth; // 애니메이션을 처음부터 다시
      el.classList.add('happy');
    },
  };
}

export const gameScreen = {
  // 게임 중에 스티커북을 열면 문제 진행이 사라지므로 숨긴다
  showBook: false,
  background: ({ village = 'savanna', game }) => findGame(village, game).background,

  render(root, app, { village = 'savanna', game: key }) {
    const game = findGame(village, key);
    const play = h('div', { class: 'play' });
    const bubble = createBubble(app);
    const guide = createGuide();
    root.append(play, bubble.el, guide.el);

    const fx = {
      say: app.say,
      bubble: bubble.set,
      sfx: app.sfx,
      cheer: () => {
        cheer(root.closest('.stage'));
        guide.hop();
      },
    };

    const run = createGameRun({
      levels: game.levels,
      praise: game.praise, // 세기·고르기·그리기 중 게임에 맞는 칭찬
      fx,
      ask: (info) => {
        const question = game.ask(play, { run, say: app.say, bubble: bubble.set, sfx: app.sfx }, info);
        if (EXPOSE_ANSWER) play.dataset.answer = String(question.answer ?? question.n);
        return question;
      },
      onProgress: (done, total) => app.bar.setDots(done, total),
      // 놀이 시간이 다 되면 하던 문제까지 끝내고 잠근다 (풀면 마을로)
      shouldPause: app.isTimeOver,
      onPause: () => app.lock({ name: 'village', params: { village } }),
      onFinish: () => {
        const reward = finishGame(app.progress, findVillage(village).detail, key);
        app.update(() => reward.progress);
        const { sticker, isNew, opened, special } = reward;
        app.go('reward', { village, sticker, isNew, opened, special });
      },
    });
    currentRun = run;
    currentStage = root.closest('.stage');

    const replay = () => {
      run.poke();
      run.replay();
    };
    bubble.el.addEventListener('click', replay);
    guide.el.addEventListener('click', replay);
    app.bar.setDots(0, run.state.total);
    app.bar.setBack(() => app.go('village', { village }), '마을로 돌아가기');
    run.start();
  },

  leave() {
    currentRun?.stop();
    currentRun = null;
    stopVoice(); // 문제 안내·칭찬이 다음 화면까지 이어지지 않게
    currentStage?.querySelectorAll('.cheer').forEach((el) => el.remove());
    currentStage = null;
  },
};
