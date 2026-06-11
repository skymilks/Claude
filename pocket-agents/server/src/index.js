import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routes } from './routes.js';
import { startWorker } from './queue.js';
import { demoMode, MODELS } from './claude.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

// Log method/path/status only — task inputs and outputs are sensitive
// business data and must never land in plaintext logs.
app.use((req, res, next) => {
  res.on('finish', () => console.log(`${req.method} ${req.path} ${res.statusCode}`));
  next();
});

app.use(routes);

const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.join(here, '..', '..', 'web', 'dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Pocket Agents server on http://localhost:${port}`);
  console.log(
    demoMode
      ? 'No ANTHROPIC_API_KEY set — running in DEMO mode (placeholder outputs).'
      : `Models — workers: ${MODELS.standard}, CEO/Boardroom: ${MODELS.premium}`
  );
  startWorker();
});
