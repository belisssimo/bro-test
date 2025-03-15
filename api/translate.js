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
    const { text, sourceLang = 'auto', targetWord } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Текст для перекладу не надано' });
    }

    // API ключ DeepL
    const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
    
    if (!DEEPL_API_KEY) {
      return res.status(500).json({ error: 'API ключ DeepL не налаштовано' });
    }

    // Створюємо об'єкт для запиту до DeepL API
    const requestData = {
      text: [text],
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
          'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
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
}; 