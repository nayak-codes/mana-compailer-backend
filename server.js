const express    = require('express')
const cors       = require('cors')
const { exec }   = require('child_process')
const fs         = require('fs')
const path       = require('path')
const { v4: uuid } = require('uuid')
const os         = require('os')

const app  = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ── Temp directory for code files ──────────────────────
const TMP = path.join(os.tmpdir(), 'mana-compiler')
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true })

// ── Language configs ───────────────────────────────────
const LANGS = {
  python3: {
    ext:     'py',
    compile: null,
    // Windows: 'python', Linux/Mac/Render: 'python3'
    run:     (f) => process.platform === 'win32' ? `python "${f}"` : `python3 "${f}"`,
  },
  nodejs: {
    ext:     'js',
    compile: null,
    run:     (f) => `node "${f}"`,
  },
  java: {
    ext:     'java',
    // Java filename must match class name — we use Main
    compile: (f, dir) => `javac "${f}"`,
    run:     (f, dir) => `java -cp "${dir}" Main`,
    filename: 'Main.java',
  },
  c: {
    ext:     'c',
    compile: (f, dir) => `gcc "${f}" -o "${path.join(dir, 'prog')}" -lm`,
    run:     (f, dir) => `"${path.join(dir, 'prog')}"`,
  },
  cpp17: {
    ext:     'cpp',
    compile: (f, dir) => `g++ "${f}" -o "${path.join(dir, 'prog')}" -std=c++17`,
    run:     (f, dir) => `"${path.join(dir, 'prog')}"`,
  },
  go: {
    ext:     'go',
    compile: null,
    run:     (f) => `go run "${f}"`,
  },
  rust: {
    ext:     'rs',
    compile: (f, dir) => `rustc "${f}" -o "${path.join(dir, 'prog')}"`,
    run:     (f, dir) => `"${path.join(dir, 'prog')}"`,
  },
  php: {
    ext:     'php',
    compile: null,
    run:     (f) => `php "${f}"`,
  },
  ruby: {
    ext:     'rb',
    compile: null,
    run:     (f) => `ruby "${f}"`,
  },
}

// ── Helper: run shell command with timeout + stdin ─────
function runCmd(cmd, stdin = '', timeoutMs = 10000) {
  return new Promise((resolve) => {
    const proc = exec(cmd, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err && err.killed) {
        resolve({ stdout: '', stderr: '', error: 'Time Limit Exceeded (10s)' })
      } else {
        resolve({ stdout: stdout || '', stderr: stderr || '', error: null })
      }
    })

    if (stdin) {
      proc.stdin.write(stdin)
      proc.stdin.end()
    } else {
      proc.stdin.end()
    }
  })
}

// ── Cleanup temp files ─────────────────────────────────
function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch (_) {}
}

// ── POST /api/run ──────────────────────────────────────
app.post('/api/run', async (req, res) => {
  const { language, code, stdin = '' } = req.body

  if (!language || !code) {
    return res.status(400).json({ error: 'language and code are required' })
  }

  const lang = LANGS[language]
  if (!lang) {
    return res.status(400).json({ error: `Unsupported language: ${language}` })
  }

  // Create unique temp dir for this run
  const runId  = uuid()
  const runDir = path.join(TMP, runId)
  fs.mkdirSync(runDir, { recursive: true })

  const filename = lang.filename || `main.${lang.ext}`
  const filepath = path.join(runDir, filename)

  try {
    // Write code to file
    fs.writeFileSync(filepath, code)

    // Compile (if needed)
    if (lang.compile) {
      const compileCmd = lang.compile(filepath, runDir)
      const { stdout, stderr, error } = await runCmd(compileCmd, '', 15000)

      if (error || stderr) {
        cleanup(runDir)
        return res.json({
          output: '',
          error:  stderr || error,
          type:   'compile_error'
        })
      }
    }

    // Run
    const runCmd2   = lang.run(filepath, runDir)
    const result    = await runCmd(runCmd2, stdin, 10000)

    cleanup(runDir)

    if (result.error) {
      return res.json({ output: result.stdout, error: result.error, type: 'runtime_error' })
    }

    if (result.stderr && !result.stdout) {
      return res.json({ output: '', error: result.stderr, type: 'runtime_error' })
    }

    return res.json({
      output: result.stdout || '(no output)',
      error:  result.stderr || null,
      type:   'success'
    })

  } catch (err) {
    cleanup(runDir)
    return res.status(500).json({ error: err.message, type: 'server_error' })
  }
})

// ── Health check ───────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mana Compiler Backend Running!' })
})

app.get('/', (req, res) => {
  res.json({
    name:      'Mana Compiler Backend',
    version:   '1.0.0',
    languages: Object.keys(LANGS),
    endpoint:  'POST /api/run'
  })
})

app.listen(PORT, () => {
  console.log(`✅ Mana Compiler Backend running at http://localhost:${PORT}`)
  console.log(`   Languages: ${Object.keys(LANGS).join(', ')}`)
})
