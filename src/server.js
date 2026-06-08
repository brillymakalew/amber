const path = require('path');
const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3111;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'tracker.db');

// --- DB setup ---
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    day     TEXT NOT NULL UNIQUE,
    calories INTEGER NOT NULL,
    weight  REAL NOT NULL,
    created TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Helper: baca target kalori harian (satu nilai global)
function getTarget() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'calorie_target'").get();
  return row ? parseInt(row.value, 10) : null;
}

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- API ---
// Get all entries (oldest -> newest)
app.get('/api/entries', (req, res) => {
  const rows = db.prepare('SELECT day, calories, weight FROM entries ORDER BY day ASC').all();
  res.json(rows);
});

// Upsert an entry for a given day
app.post('/api/entries', (req, res) => {
  const { day, calories, weight } = req.body || {};
  const d = (day || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const cal = parseInt(calories, 10);
  const w = parseFloat(weight);

  if (!Number.isFinite(cal) || cal < 0 || cal > 30000) {
    return res.status(400).json({ error: 'Invalid calories' });
  }
  if (!Number.isFinite(w) || w <= 0 || w > 700) {
    return res.status(400).json({ error: 'Invalid weight' });
  }

  db.prepare(`
    INSERT INTO entries (day, calories, weight) VALUES (?, ?, ?)
    ON CONFLICT(day) DO UPDATE SET calories = excluded.calories, weight = excluded.weight
  `).run(d, cal, w);

  const row = db.prepare('SELECT day, calories, weight FROM entries WHERE day = ?').get(d);
  res.json(row);
});

// Delete an entry
app.delete('/api/entries/:day', (req, res) => {
  db.prepare('DELETE FROM entries WHERE day = ?').run(req.params.day);
  res.json({ ok: true });
});

// Get / set target kalori harian
app.get('/api/target', (req, res) => {
  res.json({ target: getTarget() });
});

app.post('/api/target', (req, res) => {
  const t = parseInt((req.body || {}).target, 10);
  if (!Number.isFinite(t) || t < 500 || t > 15000) {
    return res.status(400).json({ error: 'Target harus antara 500 dan 15000 kcal' });
  }
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('calorie_target', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(t));
  res.json({ target: t });
});

// Aggregate stats
app.get('/api/stats', (req, res) => {
  const target = getTarget();
  const rows = db.prepare('SELECT day, calories, weight FROM entries ORDER BY day ASC').all();
  if (rows.length === 0) return res.json({ count: 0, target });
  const cals = rows.map(r => r.calories);
  const avg = Math.round(cals.reduce((a, b) => a + b, 0) / cals.length);
  const first = rows[0];
  const last = rows[rows.length - 1];
  res.json({
    count: rows.length,
    avgCalories: avg,
    latestCalories: last.calories,
    latestWeight: last.weight,
    weightDelta: +(last.weight - first.weight).toFixed(1),
    streak: rows.length,
    target
  });
});

app.listen(PORT, () => console.log(`Calorie tracker running on :${PORT}`));
