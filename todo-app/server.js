const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'todos.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- sql.js setup (pure JS SQLite — no native build needed) ---

let db; // sql.js Database instance

function saveToDisk() {
  // Persist in-memory SQLite back to the .db file after every write
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function run(sql, params = []) {
  db.run(sql, params);
  saveToDisk();
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

// Helper: sql.js returns completed as 0/1 — convert to boolean
function toTodo(r) {
  return r ? { ...r, completed: r.completed === 1 } : null;
}

async function startServer() {
  const SQL = await initSqlJs();

  // Load existing DB from disk, or create fresh
  db = fs.existsSync(DB_FILE)
    ? new SQL.Database(fs.readFileSync(DB_FILE))
    : new SQL.Database();

  // Create table
  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      text      TEXT    NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT    NOT NULL
    )
  `);

  // Seed on first run
  const count = get('SELECT COUNT(*) AS n FROM todos').n;
  if (count === 0) {
    const now = new Date().toISOString();
    db.run('INSERT INTO todos (text, completed, createdAt) VALUES (?,?,?)', ['Welcome to your Todo App!', 0, now]);
    db.run('INSERT INTO todos (text, completed, createdAt) VALUES (?,?,?)', ['Add your first task below',  0, now]);
    db.run('INSERT INTO todos (text, completed, createdAt) VALUES (?,?,?)', ['Click a task to mark it done', 1, now]);
    saveToDisk();
  }

  // --- Routes ---

  // GET all todos
  app.get('/api/todos', (req, res) => {
    res.json(all('SELECT * FROM todos ORDER BY id ASC').map(toTodo));
  });

  // POST new todo
  app.post('/api/todos', (req, res) => {
    const { text } = req.body;
    if (!text || text.trim() === '') return res.status(400).json({ error: 'Text is required' });
    run('INSERT INTO todos (text, completed, createdAt) VALUES (?,0,?)', [text.trim(), new Date().toISOString()]);
    const todo = toTodo(get('SELECT * FROM todos WHERE id = last_insert_rowid()'));
    res.status(201).json(todo);
  });

  // PATCH toggle
  app.patch('/api/todos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (!get('SELECT id FROM todos WHERE id=?', [id])) return res.status(404).json({ error: 'Todo not found' });
    run('UPDATE todos SET completed = CASE WHEN completed=1 THEN 0 ELSE 1 END WHERE id=?', [id]);
    res.json(toTodo(get('SELECT * FROM todos WHERE id=?', [id])));
  });

  // PUT update text
  app.put('/api/todos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { text } = req.body;
    if (!get('SELECT id FROM todos WHERE id=?', [id])) return res.status(404).json({ error: 'Todo not found' });
    if (!text || text.trim() === '') return res.status(400).json({ error: 'Text is required' });
    run('UPDATE todos SET text=? WHERE id=?', [text.trim(), id]);
    res.json(toTodo(get('SELECT * FROM todos WHERE id=?', [id])));
  });

  // DELETE one
  app.delete('/api/todos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (!get('SELECT id FROM todos WHERE id=?', [id])) return res.status(404).json({ error: 'Todo not found' });
    run('DELETE FROM todos WHERE id=?', [id]);
    res.status(204).send();
  });

  // DELETE all completed
  app.delete('/api/todos/completed/all', (req, res) => {
    run('DELETE FROM todos WHERE completed=1');
    res.json({ message: 'Cleared completed todos' });
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 Todo App running at http://localhost:${PORT}`);
    console.log(`🗄️  SQLite database: ${DB_FILE}\n`);
  });
}

startServer();