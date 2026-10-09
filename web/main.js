const form = document.querySelector('#translate-form');
const textEl = document.querySelector('#text');
const directionEl = document.querySelector('#direction');
const kansaiEl = document.querySelector('#kansai-ben');
const outputEl = document.querySelector('#output');
const button = form.querySelector('button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  button.disabled = true;
  outputEl.textContent = 'Translating…';

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: textEl.value,
        direction: directionEl.value,
        kansaiBen: kansaiEl.checked,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `request failed (${res.status})`);

    outputEl.textContent = data.translation;
  } catch (err) {
    outputEl.textContent = `Error: ${err.message}`;
  } finally {
    button.disabled = false;
  }
});
