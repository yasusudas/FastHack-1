/**
 * FastHack Translator — all behaviour lives here.
 *
 * The UI is driven entirely through hooks the stylesheet owns:
 *   body[data-state]  "idle" | "listening" | "translating" | "speaking"
 *   #mic[aria-pressed] "true" while listening
 *   #error[hidden]     absent when there is a message to show
 * No inline styles are set from JS, so style.css stays the single source of
 * truth for appearance.
 */

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

const DIRECTIONS = {
  'en-ja': { source: 'en-US', target: 'ja-JP' },
  'ja-en': { source: 'ja-JP', target: 'en-US' },
};

// Quick phrases, in the source language for each direction. Index i in one
// list is the same sentence as index i in the other.
const PHRASES = {
  'en-ja': [
    'Where is the station?',
    'This is delicious!',
    'How much is this?',
    'Thank you so much',
    'Can you speak slowly?',
  ],
  'ja-en': [
    '駅はどこですか？',
    'これ、おいしい！',
    'これはいくらですか？',
    '本当にありがとう',
    'ゆっくり話してもらえますか？',
  ],
};

const STATUS_TEXT = {
  idle: 'Tap the mic and speak',
  listening: 'Listening… tap again to stop',
  translating: 'Translating…',
  speaking: 'Speaking…',
};

const RECOGNITION_ERRORS = {
  'no-speech': 'No speech detected. Try again.',
  'audio-capture': 'No microphone found. Check your device input.',
  'not-allowed': 'Microphone access was blocked. Allow it in your browser settings.',
  'service-not-allowed': 'Speech recognition is unavailable in this browser.',
  network: 'Speech recognition needs a network connection.',
  'language-not-supported': 'This browser has no speech recognition for that language.',
};

const el = {
  mic: document.querySelector('#mic'),
  micLabel: document.querySelector('#mic-label'),
  status: document.querySelector('#status'),
  error: document.querySelector('#error'),
  transcript: document.querySelector('#transcript'),
  translation: document.querySelector('#translation'),
  replay: document.querySelector('#replay'),
  kansai: document.querySelector('#kansai-ben'),
  directions: document.querySelectorAll('input[name="direction"]'),
  phrases: [...document.querySelectorAll('.phrase')],
};

let state = 'idle';
let activeRecognition = null;
let lastResult = null;

/* ---------------------------------------------------------------- state */

function setState(next) {
  state = next;
  document.body.dataset.state = next;
  el.status.textContent = STATUS_TEXT[next] ?? '';
  el.mic.setAttribute('aria-pressed', String(next === 'listening'));
  el.mic.disabled = next === 'translating';
  const busy = next === 'listening' || next === 'translating';
  for (const button of el.phrases) button.disabled = busy;
  el.micLabel.textContent = next === 'listening' ? 'Stop listening' : 'Start listening';
}

function showError(message) {
  el.error.textContent = message;
  el.error.hidden = false;
}

function clearError() {
  el.error.textContent = '';
  el.error.hidden = true;
}

function currentDirection() {
  const picked = [...el.directions].find((input) => input.checked);
  return picked ? picked.value : 'en-ja';
}

/* --------------------------------------------------------------- listen */

/**
 * Capture a single utterance and resolve its final transcript.
 * @param {string} lang BCP-47 tag, e.g. "en-US" or "ja-JP"
 * @param {(partial: string) => void} [onPartial] called with interim text
 * @returns {Promise<string>}
 */
function listen(lang, onPartial) {
  return new Promise((resolve, reject) => {
    if (!SpeechRecognitionCtor) {
      reject(new Error('This browser has no Web Speech API. Try Chrome or Safari.'));
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.continuous = false; // single utterance
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let transcript = '';
    let settled = false;

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      activeRecognition = null;
      fn(value);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) transcript += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (onPartial) onPartial((transcript + interim).trim());
    };

    recognition.onerror = (event) => {
      // "aborted" means we stopped it ourselves — keep whatever we heard.
      if (event.error === 'aborted') {
        settle(resolve, transcript.trim());
        return;
      }
      const message = RECOGNITION_ERRORS[event.error] ?? `Speech recognition failed (${event.error}).`;
      settle(reject, new Error(message));
    };

    recognition.onend = () => settle(resolve, transcript.trim());

    try {
      recognition.start();
      activeRecognition = recognition;
    } catch (err) {
      settle(reject, new Error(`Could not start the microphone: ${err.message}`));
    }
  });
}

/* ---------------------------------------------------------------- speak */

/**
 * Read text aloud through the server-side ElevenLabs proxy.
 * @param {string} text
 * @returns {Promise<void>}
 */
function speak(text) {
  return new Promise((resolve, reject) => {
    if (!text) {
      resolve();
      return;
    }

    fetch('/api/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Speech failed (${res.status}).`);
        }
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        const cleanup = () => URL.revokeObjectURL(url);
        audio.onended = () => { cleanup(); resolve(); };
        audio.onerror = () => { cleanup(); reject(new Error('Audio playback failed.')); };
        audio.play().catch((err) => { cleanup(); reject(new Error(`Audio playback failed: ${err.message}`)); });
      })
      .catch(reject);
  });
}

/* ------------------------------------------------------------ translate */

/**
 * Ask the server for a translation.
 * @param {string} text
 * @param {'en-ja'|'ja-en'} direction
 * @param {boolean} kansaiBen
 * @returns {Promise<string>}
 */
async function translate(text, direction, kansaiBen) {
  let res;
  try {
    res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, direction, kansaiBen }),
    });
  } catch {
    throw new Error('Could not reach the server. Is it running on port 3000?');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? `Translation failed (${res.status}).`);
  }
  if (!data || typeof data.translation !== 'string') {
    throw new Error('The server sent an unexpected response.');
  }
  return data.translation;
}

/* ----------------------------------------------------------------- flow */

async function runTranslation(transcript, direction) {
  setState('translating');
  const translation = await translate(transcript, direction, el.kansai.checked);

  el.translation.textContent = translation;
  lastResult = { text: translation };
  el.replay.hidden = false;

  try {
    setState('speaking');
    await speak(translation);
  } catch (err) {
    showError(err.message); // the translation is on screen; playback is a bonus
  }
}

async function handleMic() {
  if (state === 'listening') {
    activeRecognition?.stop();
    return;
  }
  if (state === 'translating') return;

  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  clearError();
  el.transcript.textContent = '';
  el.translation.textContent = '';
  el.replay.hidden = true;
  lastResult = null;

  const direction = currentDirection();
  const { source } = DIRECTIONS[direction];

  try {
    setState('listening');
    const transcript = await listen(source, (partial) => {
      el.transcript.textContent = partial;
    });

    if (!transcript) {
      showError('No speech detected. Try again.');
      return;
    }

    el.transcript.textContent = transcript;
    await runTranslation(transcript, direction);
  } catch (err) {
    showError(err.message);
  } finally {
    setState('idle');
  }
}

/** Relabel the quick phrases for whichever direction is selected. */
function renderPhrases() {
  const list = PHRASES[currentDirection()] ?? [];
  el.phrases.forEach((button, i) => {
    button.textContent = list[i] ?? '';
    button.hidden = !list[i];
  });
}

/** Same flow as the mic, but the text is already known. */
async function handlePhrase(event) {
  if (state === 'listening' || state === 'translating') return;

  const phrase = event.currentTarget.textContent.trim();
  if (!phrase) return;

  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  clearError();
  el.transcript.textContent = phrase;
  el.translation.textContent = '';
  el.replay.hidden = true;
  lastResult = null;

  try {
    await runTranslation(phrase, currentDirection());
  } catch (err) {
    showError(err.message);
  } finally {
    setState('idle');
  }
}

async function handleReplay() {
  if (!lastResult || state === 'listening' || state === 'translating') return;
  clearError();
  try {
    setState('speaking');
    await speak(lastResult.text);
  } catch (err) {
    showError(err.message);
  } finally {
    setState('idle');
  }
}

/* ----------------------------------------------------------------- init */

el.mic.addEventListener('click', handleMic);
el.replay.addEventListener('click', handleReplay);

for (const button of el.phrases) {
  button.addEventListener('click', handlePhrase);
}

for (const input of el.directions) {
  input.addEventListener('change', () => {
    clearError();
    renderPhrases();
  });
}

renderPhrases();
setState('idle');

if (!SpeechRecognitionCtor) {
  el.mic.disabled = true;
  el.status.textContent = 'Speech input unavailable';
  showError('This browser has no Web Speech API for speech input. Try Chrome or Safari.');
}
