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
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL не надано' });
    }

    // Перевірка, чи URL є валідним
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Невалідний URL' });
    }

    // Завантаження HTML-вмісту з URL
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Повертаємо HTML-вміст
    res.json({ html: response.data });
  } catch (error) {
    console.error('Помилка при завантаженні URL:', error.message);
    res.status(500).json({ 
      error: 'Помилка при завантаженні URL', 
      details: error.message
    });
  }
}; 