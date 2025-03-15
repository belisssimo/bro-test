document.addEventListener('DOMContentLoaded', () => {
    // Елементи DOM
    const fileInput = document.getElementById('html-file');
    const fileName = document.getElementById('file-name');
    const contentPlaceholder = document.getElementById('content-placeholder');
    const contentViewer = document.getElementById('content-viewer');
    const loadingIndicator = document.getElementById('loading-indicator');

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

    // Функція обробки завантаження файлу
    function handleFileUpload(event) {
        const file = event.target.files[0];
        
        if (!file) return;
        
        // Відображення імені файлу
        fileName.textContent = file.name;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const htmlContent = e.target.result;
            displayContent(htmlContent);
        };
        
        reader.onerror = function() {
            alert('Помилка при читанні файлу');
        };
        
        reader.readAsText(file);
    }

    // Функція відображення HTML-вмісту
    function displayContent(htmlContent) {
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
        
        // Отримуємо контекст (сусідні слова)
        let beforeContext = '';
        let afterContext = '';
        let prevSibling = element.previousSibling;
        let nextSibling = element.nextSibling;
        
        // Додаємо до 3 слів з кожного боку для контексту
        for (let i = 0; i < 3; i++) {
            if (prevSibling && prevSibling.textContent) {
                beforeContext = prevSibling.textContent.trim() + ' ' + beforeContext;
                prevSibling = prevSibling.previousSibling;
            }
        }
        
        for (let i = 0; i < 3; i++) {
            if (nextSibling && nextSibling.textContent) {
                afterContext += ' ' + nextSibling.textContent.trim();
                nextSibling = nextSibling.nextSibling;
            }
        }
        
        // Перевіряємо кеш перекладів
        if (translationsCache[textToTranslate]) {
            applyTranslation(element, textToTranslate, translationsCache[textToTranslate]);
            return;
        }
        
        // Показуємо індикатор завантаження
        loadingIndicator.style.display = 'flex';
        
        try {
            // Спочатку перекладаємо саме слово/фразу окремо для точності
            const wordResponse = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: textToTranslate })
            });
            
            if (!wordResponse.ok) {
                throw new Error('Помилка при перекладі');
            }
            
            const wordData = await wordResponse.json();
            const translation = wordData.translation;
            
            // Зберігаємо переклад у кеш
            translationsCache[textToTranslate] = translation;
            localStorage.setItem('translationsCache', JSON.stringify(translationsCache));
            
            // Застосовуємо переклад
            applyTranslation(element, textToTranslate, translation);
            
            // Додатково перекладаємо контекст для кешування сусідніх слів
            if (beforeContext || afterContext) {
                const fullContext = (beforeContext + ' ' + textToTranslate + ' ' + afterContext).trim();
                
                fetch('/api/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ text: fullContext })
                })
                .then(response => response.json())
                .then(data => {
                    // Тут можна додатково обробити контекстний переклад,
                    // наприклад, для кешування сусідніх слів
                    console.log('Контекстний переклад завершено');
                })
                .catch(error => {
                    console.error('Помилка при контекстному перекладі:', error);
                });
            }
        } catch (error) {
            console.error('Помилка при перекладі:', error);
            alert('Помилка при перекладі: ' + error.message);
        } finally {
            // Ховаємо індикатор завантаження
            loadingIndicator.style.display = 'none';
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