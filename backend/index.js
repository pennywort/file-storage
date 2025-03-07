require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();

app.use(cookieParser());

const PORT = 3001;
const SECRET_KEY = process.env.SECRET_KEY; // Используем SECRET_KEY из .env
const UPLOAD_DIR = path.join(__dirname, 'storage');

// Проверка и создание папки storage, если её нет
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Инициализация БД
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY, filename TEXT, path TEXT, upload_time DATETIME, user_id INTEGER)");
});

app.use(express.json());
app.use(fileUpload());

// Middleware авторизации
const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('Access denied');

  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch (err) {
    res.status(400).send('Invalid token');
  }
};


// Роуты авторизации
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
    if (err || !user) return res.status(401).send('Invalid credentials');

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);

    // Устанавливаем куку
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, //process.env.NODE_ENV === 'production', // Используем Secure в production
      maxAge: 30 * 24 * 60 * 60 * 1000, // Кука будет храниться 30 дней
      sameSite: 'None', // Указываем SameSite
      path: '/', // Указываем путь, чтобы кука была доступна для всех маршрутов
    });

    res.send('Login successful');
  });
});


// Загрузка файла
app.post('/api/upload', authenticate, (req, res) => {
  if (!req.files || !req.files.file) return res.status(400).send('No files uploaded');
  
  const file = req.files.file;
  const filename = `${Date.now()}_${file.name}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  file.mv(filePath, (err) => {
    if (err) return res.status(500).send(err);
    
    db.run("INSERT INTO files (filename, path, upload_time, user_id) VALUES (?, ?, datetime('now'), ?)",
      [filename, filePath, req.user.id]);
    
    res.send('File uploaded');
  });
});

// Получение списка файлов
app.get('/api/files', authenticate, (req, res) => {
  db.all("SELECT id, filename, upload_time FROM files WHERE user_id = ?", [req.user.id], (err, rows) => {
    if (err) return res.status(500).send(err);
    res.json(rows);
  });
});

app.get('/api/download/:id', authenticate, (req, res) => {
  db.get("SELECT filename, path FROM files WHERE id = ? AND user_id = ?", [req.params.id, req.user.id], (err, file) => {
    if (err || !file) return res.status(404).send('File not found');

    // Отправляем файл с оригинальным именем
    res.download(file.path, file.filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).send('Error downloading file');
      }
    });
  });
});

// Выход из системы (очистка куки)
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.send('Logged out');
});


app.use(cors({
  origin: 'http://92.118.10.144', // Укажите домен вашего фронтенда
  credentials: true, // Разрешаем передачу кук
}));

// Очистка старых файлов каждые 3 часа
setInterval(() => {
  db.all("SELECT path FROM files WHERE datetime(upload_time) < datetime('now', '-15 minutes')", (err, rows) => {
    rows.forEach(row => {
      fs.unlink(row.path, () => {});
    });
    db.run("DELETE FROM files WHERE datetime(upload_time) < datetime('now', '-15 minutes')");
  });
}, 15000);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

