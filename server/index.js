import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// POST /translate
// body: { text: string, direction: 'ja-en' | 'en-ja', kansaiBen?: boolean }
// -> { translation: string }
app.post('/translate', (req, res) => {
  const { text, direction = 'ja-en', kansaiBen = false } = req.body ?? {};

  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text is required' });
  }
  if (direction !== 'ja-en' && direction !== 'en-ja') {
    return res.status(400).json({ error: "direction must be 'ja-en' or 'en-ja'" });
  }

  // Stub: echoes the input back with the requested options applied as a label.
  // Replace this with a real translation call.
  const flavor = kansaiBen ? ' (関西弁)' : '';
  const translation = `[${direction}${flavor} stub] ${text}`;

  res.json({ translation });
});

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
