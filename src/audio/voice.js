// 음성 안내: 녹음 파일(public/audio/voice/<id>.mp3)이 있으면 그 파일을, 없으면 브라우저 기본 음성(Web Speech)으로 읽는다.
// 어떤 녹음이 있는지는 public/audio/voice/manifest.json (npm run voice:manifest 가 폴더를 보고 만든다).
// 녹음은 효과음과 같은 Web Audio로 튼다: 파일을 통째로 받아(fetch) 오프라인 저장본으로도 나오고,
// 아이패드 사파리의 부분 요청(Range) 문제가 없다.
import { voiceIdOf } from './voiceLines.js';
import { audioContext, waitUntilRunning } from './context.js';

const VOICE_BASE = `${import.meta.env.BASE_URL}audio/voice/`;
const RESUME_WAIT_MS = 300; // 소리 장치가 켜지기를 기다리는 시간

// ---------- 녹음 파일 ----------
let recorded = new Set();
let currentSource = null;
let playToken = 0; // stopVoice나 새 say가 오면 늘어나서, 늦게 도착한 녹음은 틀지 않는다
const clips = new Map(); // id → 받은 mp3(Promise<ArrayBuffer>). 한 번 받으면 다시 받지 않는다

async function loadManifest() {
  try {
    const res = await fetch(`${VOICE_BASE}manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    const list = await res.json();
    if (Array.isArray(list)) recorded = new Set(list.filter((id) => typeof id === 'string'));
  } catch (error) {
    console.warn('[voice] 녹음 목록을 읽지 못해 기본 음성을 씁니다.', error);
  }
}
if (typeof fetch === 'function' && typeof window !== 'undefined') loadManifest();

function loadClip(id) {
  if (!clips.has(id)) {
    const clip = fetch(`${VOICE_BASE}${id}.mp3`).then((res) => {
      if (!res.ok) throw new Error(`녹음 파일을 받지 못했어요 (${res.status})`);
      return res.arrayBuffer();
    });
    // 실패하면 다음에 다시 받아 본다 (그사이 새로 받기 시작한 것은 지우지 않게)
    clip.catch(() => clips.get(id) === clip && clips.delete(id));
    clips.set(id, clip);
  }
  return clips.get(id);
}

/** 녹음을 튼다. 틀 수 없으면 기본 음성으로 읽는다 */
async function playClip(id, text) {
  const token = playToken;
  try {
    const ctx = audioContext();
    if (!ctx) throw new Error('Web Audio를 쓸 수 없어요');
    const bytes = await loadClip(id);
    const buffer = await ctx.decodeAudioData(bytes.slice(0)); // 원본은 다음에 또 쓰므로 복사본을 푼다
    if (token !== playToken) return;
    // 소리 장치가 꺼져 있으면(아직 화면을 안 누름 등) 예약하지 않는다. 나중에 엉뚱한 때 나오지 않게.
    if (!(await waitUntilRunning(ctx, RESUME_WAIT_MS))) throw new Error('소리 장치가 켜지지 않았어요');
    if (token !== playToken) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      if (currentSource !== source) return; // 멈춘 소리 (끝 알림은 stopVoice가 이미 했다)
      currentSource = null;
      finishSpeech();
    };
    currentSource = source;
    source.start();
  } catch (error) {
    if (token !== playToken) return;
    console.warn('[voice] 녹음을 틀 수 없어 기본 음성으로 읽습니다.', error);
    speak(text);
  }
}

// ---------- 말이 끝났는지 알리기 ----------
// say()는 말이 끝나면(또는 멈추면) 풀리는 Promise를 돌려준다. 칭찬이 끝난 뒤 다음 문제로 넘어갈 때 쓴다.
let endSpeech = null;

function finishSpeech() {
  const end = endSpeech;
  endSpeech = null;
  end?.();
}

function stopAudio() {
  playToken += 1;
  if (!currentSource) return;
  try {
    currentSource.stop();
  } catch {
    // 이미 끝난 소리
  }
  currentSource = null;
}

// ---------- 브라우저 기본 음성 ----------
// 크롬은 처음에 목소리 목록이 비어 있다가 나중에 채워진다. 채워지면(voiceschanged) 다시 고른다.
let cachedVoice = null;

function pickKoreanVoice() {
  try {
    cachedVoice = globalThis.speechSynthesis?.getVoices().find((v) => /^ko/i.test(v.lang)) ?? null;
  } catch (error) {
    console.warn('[voice] 목소리 목록을 읽을 수 없습니다.', error);
    cachedVoice = null;
  }
}

if (globalThis.speechSynthesis) {
  pickKoreanVoice();
  globalThis.speechSynthesis.addEventListener?.('voiceschanged', pickKoreanVoice);
}

function koreanVoice() {
  if (!cachedVoice) pickKoreanVoice();
  return cachedVoice;
}

function speak(text) {
  const synth = globalThis.speechSynthesis;
  if (!synth || !globalThis.SpeechSynthesisUtterance) return finishSpeech();
  // 앞 문장을 멈출 때 그 문장의 끝 알림이 늦게 와도, 지금 문장의 끝으로 착각하지 않게
  const mine = endSpeech;
  const done = () => mine && mine === endSpeech && finishSpeech();
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.92;
    utterance.pitch = 1.15;
    const voice = koreanVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = done;
    utterance.onerror = done;
    synth.speak(utterance);
  } catch (error) {
    console.warn('[voice] 음성을 읽을 수 없습니다.', error);
    done();
  }
}

// ---------- 밖에서 쓰는 기능 ----------
export function stopVoice() {
  stopAudio();
  finishSpeech(); // 기다리던 쪽은 "끝났다"로 받는다
  try {
    globalThis.speechSynthesis?.cancel();
  } catch (error) {
    console.warn('[voice] 음성을 멈출 수 없습니다.', error);
  }
}

/** 말한다. 말이 끝나거나 멈추면 풀리는 Promise를 돌려준다 */
export function say(text) {
  stopVoice();
  const ended = new Promise((resolve) => {
    endSpeech = resolve;
  });
  const id = voiceIdOf(text);
  if (!id && import.meta.env.DEV) console.warn('[voice] 목록에 없는 문장:', text);

  if (id && recorded.has(id)) playClip(id, text);
  else speak(text);
  return ended;
}
