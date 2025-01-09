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

const colors = [
    '#ff4757', '#2ed573', '#1e90ff', '#ffa502', 
    '#5352ed', '#ff6b81', '#7bed9f', '#70a1ff'
];

window.onload = function() {
    spaceContent = document.getElementById('spaceContent');
    spaceContent.style.transform = `scale(${scale})`;
    loadNotes();
    initializeSpaceControls();
};

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
    });

    space.addEventListener('mouseup', () => {
        isDraggingSpace = false;
    });
    
    space.addEventListener('mouseleave', () => {
        isDraggingSpace = false;
    });
}

function showCreationModal(pId = null) {
    parentId = pId;
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
        parentId = null;
    }
}

function createNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;
    
    if (!title || !content) return;

    const parentNote = parentId ? notes.find(n => n.id === parentId) : null;
    
    const note = {
        id: Date.now(),
        title,
        content,
        parentId,
        x: parentId ? parentNote.x : 2000 + Math.random() * 100 - 50,
        y: parentId ? parentNote.y : 2000 + Math.random() * 100 - 50,
        color: colors[Math.floor(Math.random() * colors.length)]
    };

    // Проверяем пересечения только для основных планет
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

    // Прокручиваем к новой заметке только если это основная планета
    if (!parentId) {
        const space = document.getElementById('space');
        space.scrollTo(
            note.x * scale - window.innerWidth / 2, 
            note.y * scale - window.innerHeight / 2
        );
    }
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

function renderNote(note) {
    const noteEl = document.createElement('div');
    noteEl.className = `note ${note.parentId ? 'satellite' : ''}`;
    noteEl.dataset.id = note.id;
    noteEl.dataset.title = note.title;
    noteEl.style.backgroundColor = note.color;
    noteEl.style.left = note.x + 'px';
    noteEl.style.top = note.y + 'px';
    noteEl.style.boxShadow = `0 0 20px ${note.color}40`;

    const controls = document.createElement('div');
    controls.className = 'note-controls';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteNote(note.id);
    };

    if (!note.parentId) {
        const addBtn = document.createElement('button');
        addBtn.className = 'note-btn';
        addBtn.innerHTML = '+';
        addBtn.onclick = (e) => {
            e.stopPropagation();
            showCreationModal(note.id);
        };
        controls.appendChild(addBtn);
    }

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

        // Ограничиваем движение в пределах пространства
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

    // Удаляем все дочерние заметки
    const children = notes.filter(n => n.parentId === id);
    children.forEach(child => deleteNote(child.id));

    // Удаляем саму заметку
    notes = notes.filter(n => n.id !== id);
    
    // Удаляем элементы из DOM
    document.querySelectorAll(`[data-id="${id}"]`).forEach(el => el.remove());
    document.querySelectorAll(`[data-connection="${id}"]`).forEach(el => el.remove());
    saveNotes();
}

function openModal(note) {
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('overlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');

    modalTitle.textContent = note.title;
    modalContent.textContent = note.content;
    
    modal.style.display = 'block';
    overlay.style.display = 'block';
}

function saveNotes() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

function loadNotes() {
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
        notes.forEach(note => renderNote(note));
    }
}