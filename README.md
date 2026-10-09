# FastHack Translator

英語・日本語の音声翻訳アプリ。関西弁モードでは、翻訳文も自然な関西弁にします。

## 起動

1. `server/.env.example` を `server/.env` にコピーし、`ANTHROPIC_API_KEY` を設定します。`server/.env` は `.gitignore` 対象です。
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

Chromeで http://localhost:5173 を開きます。Viteが `/api/translate` をExpressの `/translate` に転送します。

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
curl -s http://localhost:3000/translate \
  -H 'Content-Type: application/json' \
  -d '{"text":"めっちゃええ天気やな","direction":"ja-en","kansaiBen":true}'
```
