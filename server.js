const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const os = require('os');

// Завантаження змінних середовища з файлу .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для перекладу тексту
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetWord } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Текст для перекладу не надано' });
    }

    // Створюємо об'єкт для запиту до DeepL API
    const requestData = {
      text: [text],
      target_lang: 'UK'
    };
    
    // Додаємо source_lang тільки якщо це не 'auto'
    // DeepL автоматично визначає мову, якщо source_lang не вказано
    if (sourceLang !== 'auto') {
      requestData.source_lang = sourceLang.toUpperCase();
    }

    const response = await axios.post(
      'https://api-free.deepl.com/v2/translate',
      requestData,
      {
        headers: {
          'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Якщо це запит з контекстом і цільовим словом
    if (targetWord && text.includes(targetWord)) {
      // Отримуємо переклад всього контексту
      const translatedText = response.data.translations[0].text;
      
      // Повертаємо переклад з додатковою інформацією для контексту
      return res.json({ 
        translation: translatedText,
        contextTranslations: {} // Тут можна додати логіку для витягування перекладів окремих слів з контексту
      });
    }

    // Звичайний переклад без контексту
    res.json({ translation: response.data.translations[0].text });
  } catch (error) {
    console.error('Помилка при перекладі:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Помилка при перекладі', 
      details: error.response?.data || error.message 
    });
  }
});

// Маршрут для головної сторінки
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
  console.log(`Відкрийте додаток у браузері за адресою: http://localhost:${PORT}`);
  
  // Якщо це локальне середовище, виводимо додаткову інформацію
  if (process.env.NODE_ENV !== 'production') {
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          // Шукаємо IPv4 адресу, яка не є localhost
          if (iface.family === 'IPv4' && !iface.internal) {
            console.log(`Мережева адреса: http://${iface.address}:${PORT}`);
          }
        }
      }
    } catch (e) {
      console.log('Не вдалося визначити мережеву адресу');
    }
  }
}); 