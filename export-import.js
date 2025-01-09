function showMessage(message, isError = false) {
    const messageModal = document.getElementById('messageModal');
    const messageText = document.getElementById('messageText');
    messageText.textContent = message;
    messageModal.style.backgroundColor = isError ? '#ff4757' : '#2ed573';
    messageModal.classList.add('visible');
    
    setTimeout(() => {
        messageModal.classList.remove('visible');
    }, 3000);
}

function exportNotes() {
    const notesData = localStorage.getItem('notes');
    if (!notesData) {
        showMessage('Нет заметок для экспорта', true);
        return;
    }

    try {
        // Создаем объект с метаданными
        const exportData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            notes: JSON.parse(notesData)
        };

        // Создаем и скачиваем файл
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `cosmic-notes-${new Date().toISOString().slice(0,10)}.json`;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        showMessage('Заметки успешно экспортированы');
    } catch (error) {
        showMessage('Ошибка при экспорте заметок', true);
        console.error('Export error:', error);
    }
}

function importNotes(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Проверка структуры данных
            if (!importData.notes || !Array.isArray(importData.notes)) {
                throw new Error('Неверный формат файла');
            }

            // Очищаем текущие заметки
            notes = importData.notes;
            localStorage.setItem('notes', JSON.stringify(notes));
            
            // Очищаем пространство
            const spaceContent = document.getElementById('spaceContent');
            while (spaceContent.firstChild) {
                spaceContent.removeChild(spaceContent.firstChild);
            }

            // Отрисовываем импортированные заметки
            notes.forEach(note => renderNote(note));
            showMessage('Заметки успешно импортированы');

        } catch (error) {
            showMessage('Ошибка при импорте файла', true);
            console.error('Import error:', error);
        }
    };

    reader.readAsText(file);
    // Очищаем input для возможности повторного импорта того же файла
    event.target.value = '';
}