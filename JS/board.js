const getCurrentBoard = () => {
    var params = new URLSearchParams(window.location.search);
    var boardId = params.get('id');
    if (!boardId) return null;
    var boards = Storage.getBoards();
    for (var i = 0; i < boards.length; i++) {
        if (boards[i].id === boardId) return boards[i];
    }
    return null;
};

const getColumnLabel = (columnKey) => {
    if (columnKey === 'todo') return 'To-Do';
    if (columnKey === 'inprogress') return 'In Progress';
    if (columnKey === 'done') return 'Done';
    return 'To-Do';
};

const getColumnKey = (label) => {
    if (label === 'To-Do') return 'todo';
    if (label === 'In Progress') return 'inprogress';
    if (label === 'Done') return 'done';
    return 'todo';
};

const buildCardElement = (card) => {
    var article = document.createElement('article');
    article.className = 'card';
    article.dataset.id = card.id;

    var html = '<button class="btn-priority" style="background-color: ' + (card.pColor || '#5bb179') + ';" aria-label="medium"></button>'
    html += '<h4 class="card__title">' + card.title + '</h4>';

    if (card.description) html += '<p class="card__description">' + card.description + '</p>';

    var annotations = Array.isArray(card.annotations) ? card.annotations : (card.annotation ? [card.annotation] : []);
    annotations.forEach(function (note) {
        html += '<aside class="card__annotation">' + note + '</aside>';
    });

    article.innerHTML = html;

    article.addEventListener('click', function () {
        if (window.openEditCardModal) window.openEditCardModal(card.id);
    });

    return article;
};

const renderCards = (boardId) => {
    var columns = ['todo', 'inprogress', 'done'];
    var allCards = Storage.getCardsByBoard(boardId);

    $$('.column .card').forEach(function (el) { el.remove(); });

    columns.forEach(function (columnKey) {
        var label = getColumnLabel(columnKey);
        var section = $('[aria-label="' + label + '"]');
        var cardZone = section ? section.querySelector('.column__cards') : null;
        var counter = section ? section.querySelector('.column__count') : null;

        var columnCards = allCards.filter(function (card) { return card.column === columnKey; });

        if (counter) counter.textContent = columnCards.length;

        columnCards.sort(function (a, b) { return a.order - b.order; });
        columnCards.forEach(function (card) { if (cardZone) cardZone.appendChild(buildCardElement(card)); });
    });
};

const updateCounters = (boardId) => {
    var allCards = Storage.getCardsByBoard(boardId);
    ['todo', 'inprogress', 'done'].forEach(function (columnKey) {
        var section = $('[aria-label="' + getColumnLabel(columnKey) + '"]');
        var counter = section ? section.querySelector('.column__count') : null;
        if (counter) counter.textContent = allCards.filter(function (card) { return card.column === columnKey; }).length;
    });
};

const renderBoard = () => {
    var board = getCurrentBoard();
    if (!board) { window.location.href = 'index.html'; return; }

    document.title = 'Priora — ' + board.title;

    var kanbanTitle = $('.kanban__title');
    if (kanbanTitle) kanbanTitle.textContent = board.title;

    var sidebarList = $('.sidebar__list');
    if (sidebarList) {
        sidebarList.innerHTML = '';
        Storage.getBoards().forEach(function (b) {
            var li = document.createElement('li');
            li.className = 'sidebar__item' + (b.id === board.id ? ' sidebar__item--active' : '');
            var link = document.createElement('a');
            link.href = 'board.html?id=' + b.id;
            link.textContent = b.title;
            li.appendChild(link);
            sidebarList.appendChild(li);
        });
    }

    renderCards(board.id);
    initDragDrop(board.id);
};

const initSidebar = () => {
    var wrapper = $('.sidebar-wrapper');
    if (!wrapper) return;
    var sidebar = $('.sidebar');
    var btnCollapse = $('.btn-sidebar--collapse');
    var btnExpand = $('.btn-sidebar--expand');

    var collapse = function () { sidebar.classList.add('collapsed'); wrapper.classList.add('collapsed'); btnCollapse.style.display = 'none'; btnExpand.style.display = 'flex'; };
    var expand = function () { sidebar.classList.remove('collapsed'); wrapper.classList.remove('collapsed'); btnCollapse.style.display = 'flex'; btnExpand.style.display = 'none'; };

    if (btnCollapse) btnCollapse.addEventListener('click', collapse);
    if (btnExpand) btnExpand.addEventListener('click', expand);
};

var activeColumn = 'todo';

const initNewCardModal = () => {
    var overlay = $('#newCardModal');
    if (!overlay) return;

    var btnClose = overlay.querySelector('.modal__close');
    var btnCancel = $('#cancelNewCard');
    var btnCreate = overlay.querySelector('.btn-primary');
    var inputTitle = $('#cardTitle');
    var inputDesc = $('#cardDescription');
    var inputNote = $('#cardAnnotation');
    var addButtons = $$('.btn-add-card');

    var openModal = function (columnKey) { activeColumn = columnKey; overlay.classList.add('visible'); if (inputTitle) inputTitle.focus(); };
    var closeModal = function () { overlay.classList.remove('visible'); overlay.querySelectorAll('input, textarea').forEach(function (field) { field.value = ''; }); };
    var createCard = function () {
        var selectedPriority = $('.color-spriority--selected');
        if (!inputTitle) return;
        var title = inputTitle.value.trim();
        if (!title) { inputTitle.focus(); return; }
        var board = getCurrentBoard();
        if (!board) return;
        Storage.addCard(board.id, activeColumn, selectedPriority, title, inputDesc ? inputDesc.value.trim() : '', inputNote ? inputNote.value.trim() : '');
        renderCards(board.id);
        closeModal();
    };

    addButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var section = btn.closest('section');
            var label = section ? section.getAttribute('aria-label') : 'To-Do';
            openModal(getColumnKey(label));
        });
    });

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    if (btnCreate) btnCreate.addEventListener('click', createCard);
    if (inputTitle) { inputTitle.addEventListener('keydown', function (event) { if (event.key === 'Enter') createCard(); }); }
    overlay.addEventListener('click', function (event) { if (event.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeModal(); });
};

var currentCardId = null;

const initEditCardModal = () => {
    var overlay = $('#editCardModal');
    if (!overlay) return;

    var titleDisplay = $('#editCardTitleDisplay');
    var titleInput = $('#editCardTitleInput');
    var btnEditTitle = $('#btnEditTitle');
    var descDisplay = $('#editCardDescDisplay');
    var descInput = $('#editCardDescInput');
    var btnEditDesc = $('#btnEditDescription');
    var annotationsList = $('#annotationsList');
    var newAnnotation = $('#newAnnotationInput');
    var btnClose = $('#closeEditCard');
    var btnCancel = $('#cancelEditCard');
    var btnSave = $('#saveEditCard');

    var toViewMode = function (display, input) { display.style.display = ''; input.style.display = 'none'; };
    var toEditMode = function (display, input) { display.style.display = 'none'; input.style.display = ''; input.focus(); };

    var renderAnnotations = function (annotations) {
        annotationsList.innerHTML = '';
        if (!annotations.length) {
            annotationsList.innerHTML = '<p style="font-size:0.82rem;color:var(--color-muted);font-style:italic;">No annotations yet.</p>';
            return;
        }
        annotations.forEach(function (text) {
            var div = document.createElement('div');
            div.className = 'annotation-item';
            div.textContent = text;
            annotationsList.appendChild(div);
        });
    };

    var openModal = function (cardId) {
        currentCardId = cardId;
        var cards = Storage.getCards();
        var card = null;
        for (var i = 0; i < cards.length; i++) { if (cards[i].id === cardId) { card = cards[i]; break; } }
        if (!card) return;

        titleDisplay.textContent = card.title;
        titleInput.value = card.title;
        toViewMode(titleDisplay, titleInput);

        descDisplay.textContent = card.description || '';
        descInput.value = card.description || '';
        toViewMode(descDisplay, descInput);

        var annotations = Array.isArray(card.annotations) ? card.annotations : (card.annotation ? [card.annotation] : []);
        renderAnnotations(annotations);

        newAnnotation.value = '';
        overlay.classList.add('visible');
    };

    var closeModal = function () { overlay.classList.remove('visible'); currentCardId = null; };

    var saveCard = function () {
        if (!currentCardId) return;
        var cards = Storage.getCards();
        var card = null;
        for (var i = 0; i < cards.length; i++) { if (cards[i].id === currentCardId) { card = cards[i]; break; } }
        if (!card) return;

        card.title = (titleInput.style.display !== 'none' ? titleInput.value.trim() : titleDisplay.textContent.trim()) || card.title;
        card.description = descInput.style.display !== 'none' ? descInput.value.trim() : descDisplay.textContent.trim();

        if (!Array.isArray(card.annotations)) {
            card.annotations = card.annotation ? [card.annotation] : [];
            delete card.annotation;
        }

        var newNote = newAnnotation.value.trim();
        if (newNote) card.annotations.push(newNote);

        Storage.saveCards(cards);
        var board = getCurrentBoard();
        if (board) renderCards(board.id);
        closeModal();
    };

    btnEditTitle.addEventListener('click', function () {
        if (titleInput.style.display === 'none') { titleInput.value = titleDisplay.textContent; toEditMode(titleDisplay, titleInput); }
        else { titleDisplay.textContent = titleInput.value.trim() || titleDisplay.textContent; toViewMode(titleDisplay, titleInput); }
    });

    btnEditDesc.addEventListener('click', function () {
        if (descInput.style.display === 'none') { descInput.value = descDisplay.textContent; toEditMode(descDisplay, descInput); }
        else { descDisplay.textContent = descInput.value.trim(); toViewMode(descDisplay, descInput); }
    });

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    if (btnSave) btnSave.addEventListener('click', saveCard);
    overlay.addEventListener('click', function (event) { if (event.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeModal(); });

    window.openEditCardModal = openModal;
};

const initPriorityPalette = () => {
    var sprioritys = $$('.color-spriority');
    if (!sprioritys.length) return;

    sprioritys.forEach(function (spriority) {
        spriority.addEventListener('click', function () {
            sprioritys.forEach(function (s) {
                s.classList.remove('color-spriority--selected');
            });
            spriority.classList.add('color-spriority--selected');
        });
    });
};

const initDragDrop = (boardId) => {
    var cardZones = $$('.column__cards');
    if (!cardZones.length) return;

    cardZones.forEach(function (zone) {
        Sortable.create(zone, {
            group: 'cards',
            animation: 150,
            ghostClass: 'card--ghost',
            dragClass: 'card--dragging',
            draggable: '.card',
            onStart: function () {
                $$('.column__cards').forEach(function (z) { z.style.minHeight = z.offsetHeight + 'px'; });
            },
            onEnd: function (event) {
                $$('.column__cards').forEach(function (z) { z.style.minHeight = ''; });

                var cardId = event.item.dataset.id;
                var section = event.to.closest('section');
                var column = getColumnKey(section ? section.getAttribute('aria-label') : 'To-Do');
                var allCards = Storage.getCards();

                for (var i = 0; i < allCards.length; i++) { if (allCards[i].id === cardId) { allCards[i].column = column; break; } }

                event.to.querySelectorAll('.card').forEach(function (el, index) {
                    for (var i = 0; i < allCards.length; i++) { if (allCards[i].id === el.dataset.id) { allCards[i].order = index; break; } }
                });

                if (event.from !== event.to) {
                    event.from.querySelectorAll('.card').forEach(function (el, index) {
                        for (var i = 0; i < allCards.length; i++) { if (allCards[i].id === el.dataset.id) { allCards[i].order = index; break; } }
                    });
                }

                Storage.saveCards(allCards);
                updateCounters(boardId);
            },
        });
    });
};

document.addEventListener('DOMContentLoaded', function () {
    initSettings();
    renderBoard();
    initSidebar();
    initNewCardModal();
    initEditCardModal();
    initPriorityPalette();
});