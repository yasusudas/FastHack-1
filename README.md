# FastHack Translator

英語・日本語の音声翻訳アプリ。関西弁モードでは、翻訳文も自然な関西弁にします。

## 起動

1. `server/.env.example` を `server/.env` にコピーし、`ANTHROPIC_API_KEY`、`ELEVENLABS_API_KEY`、`ELEVENLABS_VOICE_ID` を設定します。`server/.env` は `.gitignore` 対象です。
2. APIサーバーを起動します。

   ```bash
   cd server
   npm install
   npm start
   ```

3. 別ターミナルでWebアプリを起動します。

   ```bash
   cd web
   npm install
   npm run dev
   ```

Chromeで http://localhost:5173 を開きます。Viteは `/api/translate` をExpressへパスを保って転送します。Vercelでは同じパスをサービスrewriteがExpressへ渡します。

VercelのProject Settingsにも `ANTHROPIC_API_KEY`、`ELEVENLABS_API_KEY`、`ELEVENLABS_VOICE_ID` を設定してください。ローカルの `server/.env` はデプロイには含まれません。

音声再生は `/api/speech` を経由してElevenLabs APIで生成します。音声IDはElevenLabsの「声のIDをコピー」から取得してください。APIキーをブラウザへ公開しないよう、必ずサーバー環境変数に設定します。モデルは既定で `eleven_multilingual_v2` です。

## 翻訳API

`POST /translate`

```json
{ "text": "おはよう", "direction": "ja-en", "kansaiBen": false }
```

- `direction`: `ja-en` または `en-ja`
- `kansaiBen`: 省略可能な boolean
- 応答: `{ "translation": "Good morning." }`
- 入力上限: 4,000文字

## 動作確認

```bash
curl -s http://localhost:3000/api/translate \
  -H 'Content-Type: application/json' \
  -d '{"text":"めっちゃええ天気やな","direction":"ja-en","kansaiBen":true}'
```
