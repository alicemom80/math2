// 발자국 빈칸 (공룡 나라, 이어지는 수): 공룡 발자국 5개에 1씩 커지는 수가 있고, 하나가 비어 있다.
// 쉬운 단계는 "다음 수"(마지막 칸), 어려운 단계는 가운데 칸도 빈다. 힌트: 발자국을 하나씩 읽어 준다.
import { h, art } from '@공통/widgets/dom.js';
import { wait } from '@공통/games/logic.js';
import { numberOptions, pickHandler } from '@공통/games/widgets.js';
import { sinoWord } from '@공통/games/numbers.js';
import { stepsQuestion } from '@공통/games/questions.js';
import { HINT_START_MS, HINT_STEP_MS } from '@공통/games/shared/counting.js';
import { STEPS_PROMPT, STEPS_PROMPT_MID, STEPS_HINT_END } from '../../audio/villageScript.js';
import { PICK_PRAISE } from '@공통/games/logic.js';

export const stepsGame = {
  praise: PICK_PRAISE,
  key: 'steps',
  background: 'dino-base',
  // [작은 수, 큰 수, 빈칸 자리('end': 늘 마지막)]
  levels: [
    [1, 10, 'end'],
    [1, 20, 'any'],
    [10, 50, 'any'],
  ],

  ask(play, { run, say, bubble }, { range, last }) {
    let q = stepsQuestion(range);
    if (q.answer === last) q = stepsQuestion(range); // 바로 앞 문제와 같으면 한 번 더 고른다

    const steps = q.numbers.map((v, i) =>
      h('span', { class: `step${i === q.blank ? ' blank' : ''}`, style: `--i:${i}` }, art('prop', 'footprint'), h('b', {}, i === q.blank ? '?' : String(v))));
    const fill = () => steps[q.blank].querySelector('b').replaceChildren(String(q.answer));

    play.replaceChildren(
      h('div', { class: 'stepsq' }, h('div', { class: 'steprow' }, steps),
        numberOptions(q.answer, range[0], range[1], pickHandler(run, q.answer, fill))),
    );

    async function hint() {
      await wait(HINT_START_MS / 2);
      for (let i = 0; i < steps.length; i += 1) {
        if (run.state.stopped) return;
        steps[i].classList.add('hl');
        if (i !== q.blank) say(sinoWord(q.numbers[i]));
        await wait(HINT_STEP_MS);
        if (i !== q.blank) steps[i].classList.remove('hl');
      }
      if (run.state.stopped) return;
      bubble(STEPS_HINT_END, true);
    }

    return { n: q.answer, prompt: q.blank === q.numbers.length - 1 ? STEPS_PROMPT : STEPS_PROMPT_MID, hint };
  },
};
