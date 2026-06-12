const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const generateId = () => crypto.randomUUID();

const STORAGE_KEYS = {
    boards: 'priora_boards',
    cards: 'priora_cards',
};

const Storage = {
    getBoards() {
        const raw = localStorage.getItem(STORAGE_KEYS.boards);
        return raw ? JSON.parse(raw) : [];
    },
    saveBoards(boards) {
        localStorage.setItem(STORAGE_KEYS.boards, JSON.stringify(boards));
    },
    getCards() {
        const raw = localStorage.getItem(STORAGE_KEYS.cards);
        return raw ? JSON.parse(raw) : [];
    },
    saveCards(cards) {
        localStorage.setItem(STORAGE_KEYS.cards, JSON.stringify(cards));
    },
    addBoard(title, color) {
        const boards = Storage.getBoards();
        const newBoard = { id: generateId(), title: title, color: color, order: boards.length };
        boards.push(newBoard);
        Storage.saveBoards(boards);
        return newBoard;
    },
    deleteBoard(boardId) {
        const boards = Storage.getBoards().filter(function (board) { return board.id !== boardId; });
        const cards = Storage.getCards().filter(function (card) { return card.boardId !== boardId; });
        Storage.saveBoards(boards);
        Storage.saveCards(cards);
    },
    updateBoard(id, newTitle, color) {
        const boards = Storage.getBoards();
        for (let i = 0; i < boards.length; i++) {
            if (boards[i].id === id) {
                boards[i].title = newTitle;
                boards[i].color = color;
                Storage.saveBoards(boards);
                return;
            }
        }
    },
    addCard(boardId, column, priority, title, description, annotation) {
        const cards = Storage.getCards();
        const columnCards = cards.filter(function (card) { return card.boardId === boardId && card.column === column; });
        const newCard = {
            id: generateId(),
            boardId: boardId,
            column: column,
            pColor: priority.getAttribute('data-color'),
            title: title,
            description: description,
            annotations: annotation ? [annotation] : [],
            order: columnCards.length,
        };
        cards.push(newCard);
        Storage.saveCards(cards);
        return newCard;
    },
    deleteCard(cardId) {
        const cards = Storage.getCards().filter(function (card) { return card.id !== cardId; });
        Storage.saveCards(cards);
    },
    getCardsByBoard(boardId) {
        return Storage.getCards().filter(function (card) { return card.boardId === boardId; });
    },
};

const initSettings = () => {
    const btnSettings = $('#btnSettings');
    const popover = $('#settingsPopover');
    const gear = btnSettings ? btnSettings.querySelector('.gear') : null;

    if (!btnSettings || !popover) return;

    let isOpen = false;
    let isEditMode = false;

    const rotateOpen = () => { gear.classList.remove('gear--close'); gear.classList.add('gear--open'); };
    const rotateClose = () => { gear.classList.remove('gear--open'); gear.classList.add('gear--close'); };

    const openPopover = () => { isOpen = true; popover.classList.add('visible'); rotateOpen(); };
    const closePopover = () => {
        isOpen = false;
        popover.classList.remove('visible');
        if (isEditMode) { deactivateEditMode(); } else { rotateClose(); }
    };

    const body = $('.page-home');

    const activateEditMode = () => { isEditMode = true; isOpen = false; popover.classList.remove('visible'); body.classList.add('edit-mode'); showDeleteButtons(); };
    const deactivateEditMode = () => { isEditMode = false; hideDeleteButtons(); body.classList.remove('edit-mode'); rotateClose(); };

    btnSettings.addEventListener('click', function (event) {
        event.stopPropagation();
        if (isEditMode) { deactivateEditMode(); return; }
        if (isOpen) { closePopover(); } else { openPopover(); }
    });

    document.addEventListener('click', function (event) {
        const clickedOutside = !btnSettings.contains(event.target) && !popover.contains(event.target);
        if (clickedOutside) {
            if (isOpen) closePopover();
            if (isEditMode) deactivateEditMode();
        }
    });

    const btnEdit = $('#btnEdit');
    if (btnEdit) { btnEdit.addEventListener('click', function (event) { event.stopPropagation(); activateEditMode(); }); }

    const btnExport = $('#btnExport');
    if (btnExport) { btnExport.addEventListener('click', function () { exportData(); closePopover(); }); }

    const btnImport = $('#btnImport');
    const fileInput = $('#importFileInput');
    if (btnImport && fileInput) {
        btnImport.addEventListener('click', function () { fileInput.click(); });
        fileInput.addEventListener('change', function (event) { importData(event); fileInput.value = ''; });
    }
};

const showDeleteButtons = () => {
    var boardWrappers = $$('.board-card-wrapper');
    boardWrappers.forEach(function (wrapper) {
        if (wrapper.querySelector('.btn-delete')) return;
        var btn = document.createElement('button');
        btn.className = 'btn-delete';
        btn.innerHTML = '&times;';
        btn.setAttribute('aria-label', 'Delete this board');
        btn.addEventListener('click', function (event) {
            event.stopPropagation();
            var boardId = wrapper.dataset.id;
            if (boardId) { Storage.deleteBoard(boardId); renderBoardCards(); showDeleteButtons(); }
        });
        wrapper.appendChild(btn);
    });

    var kanbanCards = $$('.card');
    kanbanCards.forEach(function (card) {
        if (card.querySelector('.btn-delete')) return;
        var btn = document.createElement('button');
        btn.className = 'btn-delete';
        btn.innerHTML = '&times;';
        btn.setAttribute('aria-label', 'Delete this card');
        btn.addEventListener('click', function (event) {
            event.stopPropagation();
            var cardId = card.dataset.id;
            if (cardId) {
                Storage.deleteCard(cardId);
                var board = getCurrentBoard();
                if (board) { renderCards(board.id); showDeleteButtons(); }
            }
        });
        card.appendChild(btn);
    });
};

const hideDeleteButtons = () => {
    var buttons = $$('.btn-delete');
    buttons.forEach(function (btn) { btn.remove(); });
};

const exportData = () => {
    var data = { boards: Storage.getBoards(), cards: Storage.getCards() };
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var today = new Date().toISOString().slice(0, 10);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'priora-export-' + today + '.json';
    link.click();
    URL.revokeObjectURL(url);
};

const importData = (event) => {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (loadEvent) {
        try {
            var data = JSON.parse(loadEvent.target.result);
            if (data.boards) Storage.saveBoards(data.boards);
            if (data.cards) Storage.saveCards(data.cards);
            location.reload();
        } catch (error) {
            alert('Invalid file. Please use a valid Priora export.');
        }
    };
    reader.readAsText(file);
};