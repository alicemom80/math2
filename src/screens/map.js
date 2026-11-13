// 마을 지도: 마을 5개. 열린 마을은 들어가고, 잠긴 마을은 "뽀잉" + 안내
import { h, art } from '@공통/widgets/dom.js';
import { VILLAGES, isVillageOpen, previousVillage } from '../villages/index.js';
import { lockedVillage, soonVillage } from '../audio/script.js';

function villageCard(village, app) {
  const open = isVillageOpen(village.key, app.progress);

  const enter = () => {
    if (!open) {
      app.sfx.boing();
      app.say(lockedVillage(village.name, previousVillage(village.key)?.name));
      return;
    }
    app.sfx.pop();
    if (village.detail) {
      app.go('village', { village: village.key });
      app.say(village.detail.story.enterVoice);
    } else {
      app.go('soon', { village: village.key });
      app.say(soonVillage(village.name));
    }
  };

  return h(
    'button',
    {
      class: `vcard press${open ? '' : ' locked'}`,
      'data-village': village.key,
      'aria-label': open ? village.name : `${village.name}, 잠김`,
      onclick: enter,
    },
    // 그림 칸: 둥근 네모 안에 마을 배경을 깔고 그 위에 마을 동물
    h(
      'span',
      { class: 'vpic' },
      art('background', `${village.key}-base`, { class: 'vbg' }),
      art('character', village.character, { class: village.round ? 'round' : '' }),
    ),
    open ? null : h('span', { class: 'lk' }, art('icon', 'lock', { class: 'ico' })),
    h('span', {}, village.name),
  );
}

export const mapScreen = {
  background: 'savanna-numbers',
  render(root, app) {
    root.append(
      h('div', { class: 'stage-tag' }, '코끼리와 숫자 친구들 (2단계)'),
      h('div', { class: 'path' }, VILLAGES.map((v) => villageCard(v, app))),
      h('div', { class: 'credit small', 'aria-hidden': 'true' }, h('i', { class: 'igicon' }), 'instagram ', h('b', {}, '@alicemom80')),
    );
  },
};
