# Mana Compiler Backend 🚀

Own backend — No API limits, No cost!

## Local Setup

```bash
npm install
npm start
# Runs at http://localhost:3002
```

## API Usage

```bash
POST /api/run
{
  "language": "python3",
  "code": "print('Hello!')",
  "stdin": ""
}
```

## Supported Languages
- python3, nodejs, java, c, cpp17, go, rust, php, ruby

## Deploy to Render.com (Free)

1. Push this folder to GitHub (separate repo)
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy! → Get your URL (e.g. https://mana-backend.onrender.com)

## Connect to Frontend

In mana-compiler-v3 project → `src/App.jsx`:
Change fetch URL to your Render URL:
```js
const res = await fetch('https://mana-backend.onrender.com/api/run', {
```
