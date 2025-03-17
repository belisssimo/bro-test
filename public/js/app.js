document.addEventListener('DOMContentLoaded', () => {
    // Елементи DOM
    const fileInput = document.getElementById('html-file');
    const fileName = document.getElementById('file-name');
    const contentPlaceholder = document.getElementById('content-placeholder');
    const contentViewer = document.getElementById('content-viewer');
    const contentIframe = document.getElementById('content-iframe');
    const loadingIndicator = document.getElementById('loading-indicator');
    const pageUrlInput = document.getElementById('page-url');
    const loadUrlBtn = document.getElementById('load-url-btn');
    const useIframeCheckbox = document.getElementById('use-iframe');
    const translationOverlay = document.getElementById('translation-overlay');
    const translationContent = document.getElementById('translation-content');
    const closeTranslationBtn = document.getElementById('close-translation-btn');

    // Кеш перекладів
    let translationsCache = {};
    
    // Завантаження кешу з localStorage
    try {
        const savedTranslations = localStorage.getItem('translationsCache');
        if (savedTranslations) {
            translationsCache = JSON.parse(savedTranslations);
        }
    } catch (error) {
        console.error('Помилка при завантаженні кешу перекладів:', error);
    }

    // Обробник події завантаження файлу
    fileInput.addEventListener('change', handleFileUpload);
    
    // Обробник події завантаження URL
    loadUrlBtn.addEventListener('click', handleUrlLoad);
    
    // Обробник події закриття оверлею перекладу
    closeTranslationBtn.addEventListener('click', () => {
        translationOverlay.style.display = 'none';
    });
    
    // Обробник повідомлень від iframe
    window.addEventListener('message', handleIframeMessage);

    // Функція обробки завантаження файлу
    function handleFileUpload(event) {
        const file = event.target.files[0];
        
        if (!file) return;
        
        // Відображення імені файлу
        fileName.textContent = file.name;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const htmlContent = e.target.result;
            displayContent(htmlContent, false); // Не використовуємо iframe для локальних файлів
        };
        
        reader.onerror = function() {
            alert('Помилка при читанні файлу');
        };
        
        reader.readAsText(file);
    }
    
    // Функція обробки завантаження URL
    async function handleUrlLoad() {
        const url = pageUrlInput.value.trim();
        
        if (!url) {
            alert('Будь ласка, введіть URL');
            return;
        }
        
        // Перевірка, чи URL є валідним
        try {
            new URL(url);
        } catch (e) {
            alert('Будь ласка, введіть валідний URL');
            return;
        }
        
        // Показуємо індикатор завантаження
        loadingIndicator.style.display = 'flex';
        
        // Перевіряємо, чи використовувати iframe
        const useIframe = useIframeCheckbox.checked;
        
        if (useIframe) {
            // Використовуємо iframe через проксі
            try {
                // Приховуємо контейнер вмісту і показуємо iframe
                contentPlaceholder.style.display = 'none';
                contentViewer.style.display = 'none';
                contentIframe.style.display = 'block';
                
                // Завантажуємо URL через проксі
                const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
                contentIframe.src = proxyUrl;
                
                // Відображення URL як імені файлу
                fileName.textContent = url;
                
                // Обробник завантаження iframe
                contentIframe.onload = function() {
                    loadingIndicator.style.display = 'none';
                };
                
                // Обробник помилки iframe
                contentIframe.onerror = function() {
                    loadingIndicator.style.display = 'none';
                    alert('Помилка при завантаженні URL в iframe. Спробуйте вимкнути опцію iframe.');
                    contentPlaceholder.style.display = 'flex';
                    contentIframe.style.display = 'none';
                };
            } catch (error) {
                console.error('Помилка при завантаженні URL в iframe:', error);
                alert('Помилка при завантаженні URL в iframe: ' + error.message);
                loadingIndicator.style.display = 'none';
            }
        } else {
            // Використовуємо звичайний метод завантаження
            try {
                const response = await fetch('/api/fetch-url', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ url })
                });
                
                if (!response.ok) {
                    throw new Error('Помилка при завантаженні URL');
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Відображення HTML-вмісту
                displayContent(data.html, false);
                
                // Відображення URL як імені файлу
                fileName.textContent = url;
            } catch (error) {
                console.error('Помилка при завантаженні URL:', error);
                alert('Помилка при завантаженні URL: ' + error.message);
                loadingIndicator.style.display = 'none';
            }
        }
    }
    
    // Функція обробки повідомлень від iframe
    async function handleIframeMessage(event) {
        // Перевіряємо, чи повідомлення від нашого iframe
        if (event.source !== contentIframe.contentWindow) {
            return;
        }
        
        // Перевіряємо тип повідомлення
        if (event.data && event.data.type === 'translate') {
            const textToTranslate = event.data.text;
            
            if (!textToTranslate) return;
            
            // Перевіряємо кеш перекладів
            if (translationsCache[textToTranslate]) {
                showTranslation(textToTranslate, translationsCache[textToTranslate]);
                return;
            }
            
            // Показуємо індикатор завантаження
            loadingIndicator.style.display = 'flex';
            loadingIndicator.querySelector('p').textContent = 'Перекладаємо...';
            
            try {
                // Використовуємо наш проксі-сервер для перекладу
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: textToTranslate
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Помилка при перекладі');
                }
                
                const data = await response.json();
                const translation = data.translations[0].text;
                
                // Зберігаємо переклад у кеш
                translationsCache[textToTranslate] = translation;
                localStorage.setItem('translationsCache', JSON.stringify(translationsCache));
                
                // Показуємо переклад
                showTranslation(textToTranslate, translation);
            } catch (error) {
                console.error('Помилка при перекладі:', error);
                alert('Помилка при перекладі: ' + error.message);
            } finally {
                // Ховаємо індикатор завантаження
                loadingIndicator.style.display = 'none';
                loadingIndicator.querySelector('p').textContent = 'Завантажуємо сторінку...';
            }
        }
    }
    
    // Функція відображення перекладу в оверлеї
    function showTranslation(originalText, translation) {
        translationContent.innerHTML = `
            <div class="original-text">
                <h4>Оригінальний текст:</h4>
                <p>${originalText}</p>
            </div>
            <div class="translated-text">
                <h4>Переклад:</h4>
                <p>${translation}</p>
            </div>
        `;
        
        translationOverlay.style.display = 'flex';
    }

    // Функція відображення HTML-вмісту
    function displayContent(htmlContent, useIframe = false) {
        if (useIframe) {
            // Використовуємо iframe
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            contentPlaceholder.style.display = 'none';
            contentViewer.style.display = 'none';
            contentIframe.style.display = 'block';
            contentIframe.src = url;
        } else {
            // Використовуємо звичайний метод відображення
            // Створення безпечного HTML-вмісту
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // Видалення скриптів для безпеки
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            
            // Відображення вмісту
            contentViewer.innerHTML = '';
            contentViewer.appendChild(doc.body.cloneNode(true));
            
            // Додавання обробників подій для тексту безпосередньо до відображеного вмісту
            addTextHandlers(contentViewer);
            
            // Показ контейнера вмісту
            contentPlaceholder.style.display = 'none';
            contentViewer.style.display = 'block';
            contentIframe.style.display = 'none';
        }
        
        // Ховаємо індикатор завантаження
        loadingIndicator.style.display = 'none';
    }

    // Функція додавання обробників подій для тексту
    function addTextHandlers(element) {
        // Рекурсивно проходимо по всіх текстових вузлах
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Пропускаємо порожні текстові вузли або вузли в скриптах/стилях
                    if (node.nodeValue.trim() === '' || 
                        node.parentNode.nodeName === 'SCRIPT' || 
                        node.parentNode.nodeName === 'STYLE') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let currentNode;
        
        // Збираємо всі текстові вузли
        while (currentNode = walker.nextNode()) {
            textNodes.push(currentNode);
        }
        
        // Додаємо обробники для кожного текстового вузла
        textNodes.forEach(textNode => {
            const parentNode = textNode.parentNode;
            
            // Розбиваємо текст на слова
            const text = textNode.nodeValue;
            const words = text.split(/(\s+)/);
            
            // Створюємо новий фрагмент з обробниками для кожного слова
            const fragment = document.createDocumentFragment();
            
            words.forEach(word => {
                if (word.trim() === '') {
                    // Додаємо пробіли як текстові вузли
                    fragment.appendChild(document.createTextNode(word));
                } else {
                    // Створюємо span для кожного слова
                    const span = document.createElement('span');
                    span.textContent = word;
                    span.className = 'translatable';
                    span.addEventListener('click', function(e) {
                        handleTextClick(e, span);
                    });
                    fragment.appendChild(span);
                }
            });
            
            // Замінюємо оригінальний текстовий вузол
            parentNode.replaceChild(fragment, textNode);
        });
    }

    // Функція обробки кліку на текст
    async function handleTextClick(event, element) {
        // Перевіряємо, чи елемент вже перекладено
        if (element.classList.contains('translated')) {
            // Повертаємо оригінальний текст
            element.textContent = element.getAttribute('data-original');
            element.classList.remove('translated');
            return;
        }
        
        // Отримуємо текст для перекладу
        const textToTranslate = element.textContent;
        
        // Перевіряємо кеш перекладів
        if (translationsCache[textToTranslate]) {
            applyTranslation(element, textToTranslate, translationsCache[textToTranslate]);
            return;
        }
        
        // Показуємо індикатор завантаження
        loadingIndicator.style.display = 'flex';
        loadingIndicator.querySelector('p').textContent = 'Перекладаємо...';
        
        try {
            // Використовуємо наш проксі-сервер для перекладу
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: textToTranslate
                })
            });
            
            if (!response.ok) {
                throw new Error('Помилка при перекладі');
            }
            
            const data = await response.json();
            const translation = data.translations[0].text;
            
            // Зберігаємо переклад у кеш
            translationsCache[textToTranslate] = translation;
            localStorage.setItem('translationsCache', JSON.stringify(translationsCache));
            
            // Застосовуємо переклад
            applyTranslation(element, textToTranslate, translation);
        } catch (error) {
            console.error('Помилка при перекладі:', error);
            alert('Помилка при перекладі: ' + error.message);
        } finally {
            // Ховаємо індикатор завантаження
            loadingIndicator.style.display = 'none';
            loadingIndicator.querySelector('p').textContent = 'Завантажуємо сторінку...';
        }
    }

    // Функція застосування перекладу
    function applyTranslation(element, originalText, translation) {
        // Зберігаємо оригінальний текст
        element.setAttribute('data-original', originalText);
        
        // Застосовуємо переклад
        element.textContent = translation;
        element.classList.add('translated');
    }
}); 