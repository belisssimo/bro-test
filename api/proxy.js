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

  try {
    // Отримуємо URL з параметрів запиту
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).send('URL параметр обов\'язковий');
    }

    // Перевірка, чи URL є валідним
    try {
      new URL(targetUrl);
    } catch (e) {
      return res.status(400).send('Невалідний URL');
    }

    // Завантаження вмісту з URL
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      responseType: 'arraybuffer'
    });

    // Визначення типу контенту
    const contentType = response.headers['content-type'] || 'text/html';
    res.setHeader('Content-Type', contentType);

    // Додаємо скрипт для перекладу, якщо це HTML
    if (contentType.includes('text/html')) {
      let html = response.data.toString('utf-8');
      
      // Додаємо базовий тег для правильного відображення відносних URL
      const baseUrl = new URL(targetUrl);
      const baseTag = `<base href="${baseUrl.origin}${baseUrl.pathname.replace(/\/[^\/]*$/, '/')}">`;
      
      // Додаємо скрипт для перекладу
      const translationScript = `
        <script>
          // Функція для перекладу тексту
          function translateText(text) {
            return fetch('/api/translate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ text })
            })
            .then(response => response.json())
            .then(data => data.translations[0].text)
            .catch(error => {
              console.error('Помилка при перекладі:', error);
              return 'Помилка перекладу';
            });
          }

          // Функція для обробки кліку на текст
          function handleTextClick(event) {
            // Перевіряємо, чи клікнуто на текстовий вузол або елемент, який не є інтерактивним
            if (event.target.nodeType === Node.TEXT_NODE || 
                (event.target.nodeType === Node.ELEMENT_NODE && 
                 !['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) {
              
              // Отримуємо виділений текст
              const selection = window.getSelection();
              let text = '';
              
              if (selection.rangeCount > 0 && !selection.isCollapsed) {
                // Якщо є виділений текст, використовуємо його
                text = selection.toString().trim();
              } else {
                // Якщо немає виділеного тексту, використовуємо текст елемента
                // Але розбиваємо його на окремі слова
                const fullText = event.target.textContent.trim();
                const words = fullText.split(/\\s+/);
                
                // Знаходимо слово, на яке клікнули
                const range = document.createRange();
                range.selectNodeContents(event.target);
                const rects = range.getClientRects();
                
                for (let i = 0; i < rects.length; i++) {
                  const rect = rects[i];
                  if (event.clientX >= rect.left && event.clientX <= rect.right &&
                      event.clientY >= rect.top && event.clientY <= rect.bottom) {
                    // Приблизно визначаємо слово за позицією кліку
                    const clickPosition = (event.clientX - rect.left) / rect.width;
                    const wordIndex = Math.floor(clickPosition * words.length);
                    text = words[Math.min(wordIndex, words.length - 1)];
                    break;
                  }
                }
                
                // Якщо не вдалося визначити слово, беремо перше
                if (!text && words.length > 0) {
                  text = words[0];
                }
              }
              
              // Перевіряємо, чи є текст для перекладу
              if (text) {
                // Видаляємо знаки пунктуації з початку і кінця слова
                const cleanText = text.replace(/^[^\\wа-яА-ЯіІїЇєЄґҐ']+|[^\\wа-яА-ЯіІїЇєЄґҐ']+$/g, '');
                
                if (cleanText) {
                  // Відправляємо повідомлення батьківському вікну
                  window.parent.postMessage({
                    type: 'translate',
                    text: cleanText
                  }, '*');
                }
              }
            }
          }

          // Додаємо обробник подій для кліку
          document.addEventListener('click', handleTextClick);
        </script>
      `;
      
      // Вставляємо базовий тег і скрипт перед закриваючим тегом head
      html = html.replace('</head>', `${baseTag}${translationScript}</head>`);
      
      res.send(html);
    } else {
      // Для не-HTML контенту просто повертаємо як є
      res.send(response.data);
    }
  } catch (error) {
    console.error('Помилка проксі-сервера:', error.message);
    res.status(500).send(`Помилка проксі-сервера: ${error.message}`);
  }
}; 