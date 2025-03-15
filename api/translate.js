const axios = require('axios');

module.exports = async (req, res) => {
  // Налаштування CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Обробка OPTIONS запитів (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Перевірка методу запиту
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не дозволено' });
  }

  try {
    // Жорстко закодований API ключ DeepL
    const API_KEY = 'd27873ef-f9fd-4536-9aaa-c64d3b497b08:fx';
    
    // Перевіряємо тіло запиту
    const { text, sourceLang = 'auto', targetWord } = req.body || {};
    
    if (!text) {
      return res.status(400).json({ error: 'Текст для перекладу не надано' });
    }

    // Створюємо об'єкт для запиту до DeepL API
    const requestData = {
      text: Array.isArray(text) ? text : [text],
      target_lang: 'UK'
    };
    
    // Додаємо source_lang тільки якщо це не 'auto'
    if (sourceLang !== 'auto') {
      requestData.source_lang = sourceLang.toUpperCase();
    }

    const response = await axios.post(
      'https://api-free.deepl.com/v2/translate',
      requestData,
      {
        headers: {
          'Authorization': `DeepL-Auth-Key ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Повертаємо відповідь від DeepL API
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Помилка при перекладі', 
      details: error.response?.data || error.message
    });
  }
}; 