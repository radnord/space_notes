function initializeSearch() {
    // Создаем и добавляем элемент поиска
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = 'Поиск по заметкам...';
    
    const searchIcon = document.createElement('div');
    searchIcon.className = 'search-icon';
    searchIcon.innerHTML = '🔍';
    
    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(searchInput);
    document.body.appendChild(searchContainer);

    // Добавляем обработчик поиска
    let searchTimeout;
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const searchText = e.target.value.toLowerCase();
        
        // Добавляем небольшую задержку для производительности
        searchTimeout = setTimeout(() => {
            // Сначала убираем все подсветки
            document.querySelectorAll('.note').forEach(note => {
                note.classList.remove('note-highlighted');
                note.classList.remove('note-dimmed');
            });

            if (searchText.trim() === '') return;

            const foundNotes = new Set();
            
            // Поиск по всем параметрам заметок
            notes.forEach(note => {
                const noteElement = document.querySelector(`[data-id="${note.id}"]`);
                if (!noteElement) return;

                const searchableText = [
                    note.title,
                    note.content,
                    note.tag
                ].join(' ').toLowerCase();

                if (searchableText.includes(searchText)) {
                    foundNotes.add(noteElement);
                }
            });

            // Подсвечиваем найденные заметки и затемняем остальные
            document.querySelectorAll('.note').forEach(noteElement => {
                if (foundNotes.has(noteElement)) {
                    noteElement.classList.add('note-highlighted');
                } else {
                    noteElement.classList.add('note-dimmed');
                }
            });

            // Если найдена только одна заметка, прокручиваем к ней
            if (foundNotes.size === 1) {
                const foundNote = foundNotes.values().next().value;
                const space = document.getElementById('space');
                const noteRect = foundNote.getBoundingClientRect();
                const spaceRect = space.getBoundingClientRect();
                
                space.scrollTo({
                    left: foundNote.offsetLeft - (spaceRect.width / 2) + (noteRect.width / 2),
                    top: foundNote.offsetTop - (spaceRect.height / 2) + (noteRect.height / 2),
                    behavior: 'smooth'
                });
            }
        }, 150);
    });
}

// Инициализируем поиск при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeSearch);