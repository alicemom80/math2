// 잠금 화면: 놀이 시간이 다 되면. 잠든 코끼리 + 화면 밖 미션. 부모님이 1초 누르면 다시 논다.
import { h, art } from '@공통/widgets/dom.js';
import { holdable, PARENT_HOLD_MS } from '../widgets/hold.js';
import { pickMission, unlockChange } from '../app/playtime.js';
import { stopVoice } from '../audio/voice.js';
import { LOCK_TEXT, lockLine, UNLOCK_TEXT } from '../audio/script.js';

export const lockScreen = {
  showBar: false,

  render(root, app, { resume = { name: 'map', params: {} } } = {}) {
    const mission = pickMission();
    const hold = h('button', { class: 'hold', 'aria-label': '부모님: 1초 동안 누르면 다시 놀 수 있어요' }, '🔒 부모님: 1초 동안 누르기');
    holdable(hold, PARENT_HOLD_MS, () => {
      app.update((p) => unlockChange(p));
      app.sfx.yes();
      app.go(resume.name, resume.params);
      app.say(UNLOCK_TEXT);
    });

    root.append(
      art('background', 'night-base', { class: 'lockbg', 'aria-hidden': 'true' }), // 밤하늘 그림 (별·달이 그려져 있다)
      h('div', { class: 'zzz', 'aria-hidden': 'true' }, 'Z z z'),
      art('character', 'elephant', { class: 'sleepy', alt: '잠든 코끼리' }),
      h('p', {}, LOCK_TEXT),
      h('p', { class: 'mission' }, mission),
      hold,
    );
    app.say(lockLine(mission));
  },

  leave: stopVoice,
};
