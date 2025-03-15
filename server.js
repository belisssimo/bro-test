const express = require('express');
const cors = require('cors');
const path = require('path');
const translateHandler = require('./api/translate');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Використовуємо той самий обробник, що і для Vercel
app.post('/api/translate', (req, res) => translateHandler(req, res));

// Маршрут для головної сторінки
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущено на порту ${PORT}`);
  console.log(`Відкрийте додаток у браузері за адресою: http://localhost:${PORT}`);
}); 