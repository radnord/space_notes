// Проверка работы localStorage
try {
   localStorage.setItem('test', 'test');
   const test = localStorage.getItem('test');
   console.log('localStorage работает:', test === 'test');
   localStorage.removeItem('test');
} catch (error) {
   console.error('localStorage не работает:', error);
}

let notes = [];
let isDragging = false;
let parentId = null;
let scale = 1;
let spaceContent = null;
let isDraggingSpace = false;
let startX = 0;
let startY = 0;
let scrollLeft = 0;
let scrollTop = 0;
let currentEditingNoteId = null;
let tagColors = new Map();
let colorIndex = 0;
let currentStyle = 1; // 1 - теги, 2 - случайные, 3 - наследование

const defaultColor = '#2a2a35';

function getNoteLevel(note) {
    let level = 0;
    let currentNote = note;
    
    while (currentNote.parentId) {
        level++;
        currentNote = notes.find(n => n.id === currentNote.parentId);
        if (!currentNote) break;
    }
    
    return level;
}

function generateColor(seed) {
   const hue = (seed * 137.508) % 360; // золотое сечение для равномерного распределения
   return `hsl(${hue}, 70%, 60%)`;
}

// Сохраняем случайные цвета для заметок
const noteColors = new Map();

window.onload = function() {
   console.log('Window loaded');
   spaceContent = document.getElementById('spaceContent');
   console.log('Space content:', spaceContent);
   
   loadState();
   console.log('State loaded');
   
   loadNotes();
   console.log('Notes loaded:', notes);
   
   initializeSpaceControls();
   console.log('Space controls initialized');
   
   initializeTagColors();
   console.log('Tag colors initialized');
   
   document.body.dataset.style = currentStyle;

   // Добавляем обработчик правого клика для создания заметок
   spaceContent.addEventListener('contextmenu', function(e) {
       e.preventDefault();
       if (e.target === spaceContent) {
           const space = document.getElementById('space');
           const rect = space.getBoundingClientRect();
           const x = (e.clientX + space.scrollLeft - rect.left) / scale;
           const y = (e.clientY + space.scrollTop - rect.top) / scale;
           
           showCreationModal(null, x, y);
       }
   });
   
   // Восстанавливаем позицию прокрутки
   const space = document.getElementById('space');
   if (!localStorage.getItem('scrollPosition')) {
       // Только при первом посещении устанавливаем начальную позицию в центр
       space.scrollLeft = 2000 - window.innerWidth / 2;
       space.scrollTop = 2000 - window.innerHeight / 2;
       saveScrollPosition();
   } else {
       const savedScrollPosition = localStorage.getItem('scrollPosition');
       const position = JSON.parse(savedScrollPosition);
       space.scrollLeft = position.x;
       space.scrollTop = position.y;
   }
};

function switchStyle() {
   currentStyle = (currentStyle % 3) + 1;
   document.body.dataset.style = currentStyle;
   
   notes.forEach(note => {
       const noteEl = document.querySelector(`[data-id="${note.id}"]`);
       if (noteEl) {
           const color = getNoteColor(note);
           noteEl.style.backgroundColor = color;
           noteEl.style.boxShadow = `0 0 20px ${color}40`;
       }
   });

   saveState();
}

function getNoteColor(note) {
   switch(currentStyle) {
       case 1: // Стиль по тегам
           return getColorForTag(note.tag);
       
       case 2: // Случайные цвета
           if (!noteColors.has(note.id)) {
               noteColors.set(note.id, generateColor(note.id));
           }
           return noteColors.get(note.id);
       
       case 3: // Наследование цветов
           if (note.parentId) {
               const parentNote = notes.find(n => n.id === note.parentId);
               if (parentNote) {
                   return getNoteColor(parentNote);
               }
           }
           if (!noteColors.has(note.id)) {
               noteColors.set(note.id, generateColor(note.id));
           }
           return noteColors.get(note.id);
   }
}

function saveScrollPosition() {
   const space = document.getElementById('space');
   const position = {
       x: space.scrollLeft,
       y: space.scrollTop
   };
   try {
       localStorage.setItem('scrollPosition', JSON.stringify(position));
       console.log('Позиция прокрутки сохранена');
   } catch (error) {
       console.error('Ошибка при сохранении позиции прокрутки:', error);
   }
}

function saveState() {
   const state = {
       scale: scale,
       colorIndex: colorIndex,
       currentStyle: currentStyle,
       noteColors: Array.from(noteColors.entries())
   };
   try {
       localStorage.setItem('appState', JSON.stringify(state));
       console.log('Состояние приложения сохранено');
   } catch (error) {
       console.error('Ошибка при сохранении состояния:', error);
   }
}

function loadState() {
   try {
       const savedState = localStorage.getItem('appState');
       console.log('Загруженное состояние:', savedState);
       if (savedState) {
           const state = JSON.parse(savedState);
           scale = state.scale;
           colorIndex = state.colorIndex;
           currentStyle = state.currentStyle || 1;
           noteColors = new Map(state.noteColors || []);
           spaceContent.style.transform = `scale(${scale})`;
       }
   } catch (error) {
       console.error('Ошибка при загрузке состояния:', error);
   }
}

function initializeTagColors() {
   const uniqueTags = new Set();
   notes.forEach(note => {
       if (note.tag) uniqueTags.add(note.tag);
   });
   
   uniqueTags.forEach(tag => {
       if (!tagColors.has(tag)) {
           const seed = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0);
           tagColors.set(tag, generateColor(seed));
           colorIndex++;
       }
   });
}

function getColorForTag(tag) {
   if (!tag) return defaultColor;
   if (!tagColors.has(tag)) {
       const seed = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0);
       tagColors.set(tag, generateColor(seed));
       colorIndex++;
       saveState();
   }
   return tagColors.get(tag);
}

function initializeSpaceControls() {
    const space = document.getElementById('space');
    
    space.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const rect = space.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const contentX = (mouseX + space.scrollLeft) / scale;
        const contentY = (mouseY + space.scrollTop) / scale;
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(0.2, scale * delta), 2);
        
        if (newScale !== scale) {
            const newScrollX = (contentX * newScale) - mouseX;
            const newScrollY = (contentY * newScale) - mouseY;
            
            scale = newScale;
            spaceContent.style.transform = `scale(${scale})`;
            
            space.scrollTo(newScrollX, newScrollY);
            
            updateAllConnections();
            saveState();
        }
    });

    space.addEventListener('mousedown', (e) => {
        if (e.target === space || e.target === spaceContent) {
            isDraggingSpace = true;
            startX = e.pageX - space.offsetLeft;
            startY = e.pageY - space.offsetTop;
            scrollLeft = space.scrollLeft;
            scrollTop = space.scrollTop;
        }
    });

    space.addEventListener('mousemove', (e) => {
        if (!isDraggingSpace) return;
        e.preventDefault();
        const x = e.pageX - space.offsetLeft;
        const y = e.pageY - space.offsetTop;
        const moveX = (x - startX);
        const moveY = (y - startY);
        space.scrollLeft = scrollLeft - moveX;
        space.scrollTop = scrollTop - moveY;
        updateAllConnections();
        saveScrollPosition();
    });

    space.addEventListener('mouseup', () => {
        isDraggingSpace = false;
    });
    
    space.addEventListener('mouseleave', () => {
        isDraggingSpace = false;
    });

    space.addEventListener('scroll', () => {
        saveScrollPosition();
    });
}

function showCreationModal(pId = null, x = null, y = null) {
    parentId = pId;
    if (x !== null && y !== null) {
        sessionStorage.setItem('newNoteX', x);
        sessionStorage.setItem('newNoteY', y);
    }
    document.getElementById('creationModal').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('noteTitle').focus();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    if (modalId === 'creationModal') {
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('noteTag').value = '';
        parentId = null;
    }
    if (modalId === 'editModal') {
        currentEditingNoteId = null;
    }
}

function createNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    const tag = document.getElementById('noteTag').value.trim();
    
    if (!title) return; // Проверяем только title

    const parentNote = parentId ? notes.find(n => n.id === parentId) : null;
    
    const note = {
        id: Date.now(),
        title,
        content,
        tag,
        parentId
    };

    if (parentId) {
        note.x = parentNote.x;
        note.y = parentNote.y;
    } else {
        const savedX = sessionStorage.getItem('newNoteX');
        const savedY = sessionStorage.getItem('newNoteY');
        if (savedX && savedY) {
            note.x = parseFloat(savedX);
            note.y = parseFloat(savedY);
            sessionStorage.removeItem('newNoteX');
            sessionStorage.removeItem('newNoteY');
        } else {
            const space = document.getElementById('space');
            note.x = (space.scrollLeft + space.clientWidth/2) / scale;
            note.y = (space.scrollTop + space.clientHeight/2) / scale;
        }
    }

    if (!parentId) {
        while (isNoteOverlapping(note)) {
            note.x += 50;
            note.y += 50;
        }
    }

    notes.push(note);
    renderNote(note);
    saveNotes();
    closeModal('creationModal');
}

function renderNote(note) {
    const noteEl = document.createElement('div');
    const level = getNoteLevel(note);
    
    noteEl.className = `note ${level === 1 ? 'satellite' : level === 2 ? 'satellite-2' : ''}`;
    noteEl.dataset.id = note.id;
    noteEl.dataset.title = note.title;
    
    const noteColor = getNoteColor(note);
    noteEl.style.backgroundColor = noteColor;
    noteEl.style.left = note.x + 'px';
    noteEl.style.top = note.y + 'px';
    noteEl.style.boxShadow = `0 0 20px ${noteColor}40`;

    const controls = document.createElement('div');
    controls.className = 'note-controls';

    const editBtn = document.createElement('button');
    editBtn.className = 'note-btn';
    editBtn.innerHTML = '✎';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        showEditModal(note.id);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteNote(note.id);
    };

    if (level < 2) {
        const addBtn = document.createElement('button');
        addBtn.className = 'note-btn';
        addBtn.innerHTML = '+';
        addBtn.onclick = (e) => {
            e.stopPropagation();
            showCreationModal(note.id);
        };
        controls.appendChild(addBtn);
    }

    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    noteEl.appendChild(controls);

    noteEl.addEventListener('click', () => {
        if (!isDragging) openModal(note);
    });
    
    makeDraggable(noteEl, note);
    spaceContent.appendChild(noteEl);

    if (note.parentId) {
        updateConnection(noteEl, note.parentId);
    }
}

function showEditModal(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    currentEditingNoteId = noteId;
    document.getElementById('editNoteTitle').value = note.title;
    document.getElementById('editNoteContent').value = note.content;
    document.getElementById('editNoteTag').value = note.tag || '';
    document.getElementById('editModal').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('editNoteTitle').focus();
}

function saveEditedNote() {
    if (!currentEditingNoteId) return;

    const title = document.getElementById('editNoteTitle').value;
    const content = document.getElementById('editNoteContent').value;
    const tag = document.getElementById('editNoteTag').value.trim();
    
    if (!title) return; // Проверяем только title

    const noteIndex = notes.findIndex(n => n.id === currentEditingNoteId);
    if (noteIndex === -1) return;

    notes[noteIndex].title = title;
    notes[noteIndex].content = content;
    notes[noteIndex].tag = tag;

    const noteEl = document.querySelector(`[data-id="${currentEditingNoteId}"]`);
    if (noteEl) {
        noteEl.dataset.title = title;
        const color = getNoteColor(notes[noteIndex]);
        noteEl.style.backgroundColor = color;
        noteEl.style.boxShadow = `0 0 20px ${color}40`;
    }

    if (currentStyle === 3) {
        const children = notes.filter(n => n.parentId === currentEditingNoteId);
        children.forEach(child => {
            const childEl = document.querySelector(`[data-id="${child.id}"]`);
            if (childEl) {
                const color = getNoteColor(child);
                childEl.style.backgroundColor = color;
                childEl.style.boxShadow = `0 0 20px ${color}40`;
            }
        });
    }

    saveNotes();
    closeModal('editModal');
    showMessage('Заметка успешно обновлена');
}

function isNoteOverlapping(newNote) {
    return notes.some(note => {
        if (note.id === newNote.id) return false;
        const distance = Math.sqrt(
            Math.pow(newNote.x - note.x, 2) + 
            Math.pow(newNote.y - note.y, 2)
        );
        const minDistance = newNote.parentId ? 60 : 100;
        return distance < minDistance;
    });
}

function makeDraggable(element, note) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (isDraggingSpace) return;
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        element.style.zIndex = 1000;
    }

    function elementDrag(e) {
        e.preventDefault();
        isDragging = true;
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        newTop = Math.max(0, Math.min(newTop, 4000 - element.offsetHeight));
        newLeft = Math.max(0, Math.min(newLeft, 4000 - element.offsetWidth));

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
        note.x = newLeft;
        note.y = newTop;

        updateAllConnections();
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        element.style.zIndex = 1;
        setTimeout(() => {
            isDragging = false;
        }, 100);
        saveNotes();
    }
}

function updateAllConnections() {
    notes.forEach(note => {
        if (note.parentId) {
            const noteEl = document.querySelector(`[data-id="${note.id}"]`);
            if (noteEl) {
                updateConnection(noteEl, note.parentId);
            }
        }
    });
}

function updateConnection(noteEl, parentId) {
    const parent = notes.find(n => n.id === parentId);
    if (!parent) return;

    let connectionEl = document.querySelector(`[data-connection="${noteEl.dataset.id}"]`);
    if (!connectionEl) {
        connectionEl = document.createElement('div');
        connectionEl.className = 'note-connection';
        connectionEl.dataset.connection = noteEl.dataset.id;
        spaceContent.appendChild(connectionEl);
    }

    const parentEl = document.querySelector(`[data-id="${parentId}"]`);
    if (!parentEl) return;

    const noteRect = {
        x: parseInt(noteEl.style.left) + noteEl.offsetWidth / 2,
        y: parseInt(noteEl.style.top) + noteEl.offsetHeight / 2
    };

    const parentRect = {
        x: parseInt(parentEl.style.left) + parentEl.offsetWidth / 2,
        y: parseInt(parentEl.style.top) + parentEl.offsetHeight / 2
    };

    const dx = noteRect.x - parentRect.x;
    const dy = noteRect.y - parentRect.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    connectionEl.style.width = `${distance}px`;
    connectionEl.style.left = `${parentRect.x}px`;
    connectionEl.style.top = `${parentRect.y}px`;
    connectionEl.style.transform = `rotate(${angle}deg)`;
}

function deleteNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    const children = notes.filter(n => n.parentId === id);
    children.forEach(child => deleteNote(child.id));

    notes = notes.filter(n => n.id !== id);
    noteColors.delete(id);
    
    document.querySelectorAll(`[data-id="${id}"]`).forEach(el => el.remove());
    document.querySelectorAll(`[data-connection="${id}"]`).forEach(el => el.remove());
    saveNotes();
}

function openModal(note) {
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('overlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalTag = document.getElementById('modalTag');

    modalTitle.textContent = note.title;
    modalContent.textContent = note.content;
    modalTag.textContent = note.tag ? `Тег: ${note.tag}` : '';
    
    modal.style.display = 'block';
    overlay.style.display = 'block';
}

function saveNotes() {
    try {
        const saveData = {
            notes: notes,
            tagColors: Array.from(tagColors.entries()),
            colorIndex: colorIndex
        };
        localStorage.setItem('notesData', JSON.stringify(saveData));
        console.log('Заметки сохранены:', saveData);
    } catch (error) {
        console.error('Ошибка при сохранении заметок:', error);
        showMessage('Ошибка при сохранении заметок', true);
    }
}

function loadNotes() {
    try {
        const savedData = localStorage.getItem('notesData');
        console.log('Загруженные заметки:', savedData);
        if (savedData) {
            const data = JSON.parse(savedData);
            notes = data.notes;
            tagColors = new Map(data.tagColors);
            colorIndex = data.colorIndex;
            notes.forEach(note => renderNote(note));
        }
    } catch (error) {
        console.error('Ошибка при загрузке заметок:', error);
        showMessage('Ошибка при загрузке заметок', true);
    }
}

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