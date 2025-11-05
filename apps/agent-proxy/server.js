const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const { exec } = require('child_process');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const log = require('../../lib/cli-logger.js');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'agent');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, UPLOAD_DIR), filename: (req, file, cb) => {
  const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  cb(null, safe);
}});
const upload = multer({ storage });

// serve uploaded files
app.use('/uploads/agent', express.static(UPLOAD_DIR));

// helper to determine if provider looks like OpenAI
function isOpenAIProvider(url){
  if(!url) return false;
  return url.includes('openai') || url.includes('api.openai.com');
}

// Simple health
app.get('/health', (req, res) => res.json({ ok: true }));

// /agent endpoint: forwards to provider if AGENT_PROVIDER and AGENT_API_KEY env vars are set
app.post('/agent', async (req, res) => {
  const { prompt, mode } = req.body || {};
  if(!prompt) return res.status(400).json({ error: 'missing prompt' });

  // If provider not configured, return a mock response
  const provider = process.env.AGENT_PROVIDER || '';
  const apiKey = process.env.AGENT_API_KEY || '';
  try {
    if(provider && apiKey){
      // If looks like OpenAI, build a chat completion request
      if(isOpenAIProvider(provider)){
        const model = process.env.AGENT_MODEL || 'gpt-4o-mini';
        const body = {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        };
        const response = await axios.post('https://api.openai.com/v1/chat/completions', body, {
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 60000
        });
        return res.json({ data: response.data });
      }

      // Generic forwarder for other provider endpoints
      const response = await axios.post(provider, { prompt, mode }, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 30000
      });
      return res.json({ data: response.data });
    }

    // Mock response
  const mock = `(${mode}) Mock agent reply for prompt: ${prompt}\n\nSuggested command:\n$ echo "Hello from 3ON Agent (mock)"`;
    return res.json({ data: { text: mock } });
  } catch(err){
    log.error('agent proxy error', err && err.message);
    return res.status(500).json({ error: 'agent proxy error', details: err.message });
  }
});

// Streaming endpoint (SSE) — forwards streaming responses from OpenAI-like providers
app.post('/agent/stream', async (req, res) => {
  const { prompt, mode } = req.body || {};
  if(!prompt) return res.status(400).json({ error: 'missing prompt' });
  const provider = process.env.AGENT_PROVIDER || '';
  const apiKey = process.env.AGENT_API_KEY || '';
  if(!provider || !apiKey || !isOpenAIProvider(provider)){
    return res.status(400).json({ error: 'streaming requires OpenAI-compatible provider configured via AGENT_PROVIDER & AGENT_API_KEY' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders && res.flushHeaders();

  try{
    const model = process.env.AGENT_MODEL || 'gpt-4o-mini';
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      stream: true
    }, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      responseType: 'stream',
      timeout: 0
    });

    const stream = response.data;
    stream.on('data', (chunk) => {
      // forward raw chunk as SSE data event
      res.write(`data: ${chunk.toString()}` + '\n\n');
    });
    stream.on('end', () => {
      res.write('event: done\ndata: [DONE]\n\n');
      res.end();
    });
    stream.on('error', (err)=>{
      log.error('stream error', err && err.message);
      res.write('event: error\ndata: stream error\n\n');
      res.end();
    });
  }catch(err){
    log.error('agent stream error', err && err.message);
    res.status(500).json({ error: 'agent stream error', details: err.message });
  }
});

// Guarded command execution endpoint (DISABLED by default)
// To enable execution set ALLOW_EXEC=true and provide COMMAND_WHITELIST (comma-separated list of allowed command prefixes)
app.post('/exec', async (req, res) => {
  const allow = process.env.ALLOW_EXEC === 'true';
  if(!allow) return res.status(403).json({ error: 'command execution disabled (enable ALLOW_EXEC=true to enable)' });
  const { cmd } = req.body || {};
  if(!cmd) return res.status(400).json({ error: 'missing cmd' });
  const whitelistRaw = process.env.COMMAND_WHITELIST || '';
  const whitelist = whitelistRaw.split(',').map(s=>s.trim()).filter(Boolean);
  const allowed = whitelist.some(w => cmd === w || cmd.startsWith(w + ' ') || cmd.startsWith(w + '/'));
  if(!allowed) return res.status(403).json({ error: 'command not allowed by whitelist' });

  // execute with a short timeout and limited buffer
  exec(cmd, { timeout: 5000, maxBuffer: 200 * 1024 }, (err, stdout, stderr) => {
    if(err){
      return res.status(500).json({ error: 'execution error', details: err.message, stdout: stdout && stdout.toString(), stderr: stderr && stderr.toString() });
    }
    return res.json({ ok: true, stdout: stdout && stdout.toString(), stderr: stderr && stderr.toString() });
  });
});

// file upload endpoint for agent attachments (accept all types)
app.post('/upload', upload.single('file'), (req, res) => {
  if(!req.file) return res.status(400).json({ error: 'no file' });
  const url = `/uploads/agent/${req.file.filename}`;
  return res.json({ ok: true, file: { original: req.file.originalname, size: req.file.size, url } });
});

const port = process.env.PORT || 3001;
app.listen(port, ()=>log.info('3ON agent proxy listening on', port));
