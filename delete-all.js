function confirmDeleteAll() {
    if (confirm('Вы уверены, что хотите удалить все заметки? Это действие нельзя отменить!')) {
        deleteAllNotes();
    }
}

function deleteAllNotes() {
    try {
        // Очищаем массив заметок
        notes = [];
        
        // Очищаем все цвета
        noteColors.clear();
        tagColors.clear();
        colorIndex = 0;
        
        // Очищаем localStorage
        localStorage.removeItem('notesData');
        
        // Очищаем пространство от заметок
        const spaceContent = document.getElementById('spaceContent');
        while (spaceContent.firstChild) {
            spaceContent.removeChild(spaceContent.firstChild);
        }
        
        // Показываем сообщение об успехе
        showMessage('Все заметки успешно удалены');
        
    } catch (error) {
        console.error('Ошибка при удалении заметок:', error);
        showMessage('Ошибка при удалении заметок', true);
    }
}