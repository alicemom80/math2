// 보상 화면: 받은 동물 스티커 (+ 마을 열림 표시). ▶를 누르면 마을로.
// 동물을 다 모았으면 ▶ 한 번 더 전에 특별 친구(부엉이)가 나온다.
import { h, art, roundButton } from '@공통/widgets/dom.js';
import { cheer } from '../widgets/cheer.js';
import { artUrl } from '../art/registry.js';
import { findVillage } from '../villages/index.js';
import { withSubject } from '@공통/app/korean.js';
import { stickerLine, specialLine } from '../audio/script.js';
import { stopVoice } from '../audio/voice.js';

/** 특별 친구가 나온 뒤 ▶를 막는 시간 (연타로 바로 지나가지 않게) */
const SPECIAL_HOLD_MS = 1000;

/** 새 마을이 열렸다는 표시: 마을 대표 동물 + "○○ 마을이 열렸어!" 글자 + 별 */
function openedBadge(v) {
  const label = `${withSubject(v.name)} 열렸어!`;
  return h(
    'div',
    { class: 'open', role: 'img', 'aria-label': label },
    art('character', v.character, { alt: '' }),
    h('b', { 'aria-hidden': 'true' }, label),
    art('icon', 'star', { class: 'ico', alt: '' }),
  );
}

export const rewardScreen = {
  showBook: false,

  render(root, app, { village = 'savanna', sticker, isNew, opened = null, special = false }) {
    const openedVillage = opened ? findVillage(opened) : null;
    const friend = findVillage(village).detail.special; // 특별 친구 (없는 마을도 있다)
    const img = art('character', sticker.key, { class: 'sticker', alt: sticker.name });
    // aria-live: 글자가 바뀌면 화면 읽기 기능이 읽어 준다
    const text = h('p', { 'aria-live': 'polite' }, isNew ? `${sticker.name} 스티커!` : `${sticker.name} 스티커 하나 더!`);
    const badge = openedVillage ? openedBadge(openedVillage) : null;
    let specialShown = false;
    let holdUntil = 0;

    const celebrate = () => {
      app.sfx.yes();
      cheer(root.closest('.stage'));
    };

    const showSpecial = () => {
      specialShown = true;
      holdUntil = Date.now() + SPECIAL_HOLD_MS;
      app.update(() => ({ specialSeen: true })); // 실제로 보여 준 뒤에 저장
      img.src = artUrl('character', friend.key);
      img.alt = friend.name;
      img.classList.add('sp');
      // 같은 그림 요소라 튀어나오는 효과를 다시 틀어 준다
      img.style.animation = 'none';
      void img.offsetWidth;
      img.style.animation = '';
      text.textContent = `특별 친구 ${friend.name}!`;
      badge?.remove();
      celebrate();
      app.say(specialLine(friend.from, friend.name));
    };

    const next = () => {
      if (Date.now() < holdUntil) return;
      app.sfx.pop();
      if (special && friend && !specialShown) showSpecial();
      else app.go('village', { village });
    };

    // badge가 없을 때(null) append에 넣으면 "null" 글자가 찍히므로 빼고 넣는다
    root.append(...[h('div', { class: 'glowbg' }), img, text, badge, roundButton('play', '다음', next)].filter(Boolean));
    celebrate();
    app.say(stickerLine(sticker.name, isNew, openedVillage?.name));
  },

  // 하던 말이 다음 화면까지 이어지지 않게
  leave: stopVoice,
};
