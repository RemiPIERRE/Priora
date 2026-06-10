const getCurrentBoard = () => {
    var params = new URLSearchParams(window.location.search);
    var boardId = params.get('id');
    if (!boardId) return null;

    var boards = Storage.getBoards();
    var found = null;

    for (var i = 0; i < boards.length; i++) {
        if (boards[i].id === boardId) {
            found = boards[i];
            break;
        }
    }

    return found;
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

    var titleHtml = '<h4 class="card__title">' + card.title + '</h4>';

    var descriptionHtml = '';
    if (card.description) {
        descriptionHtml = '<p class="card__description">' + card.description + '</p>';
    }

    var annotationHtml = '';
    if (card.annotation) {
        annotationHtml = '<aside class="card__annotation">' + card.annotation + '</aside>';
    }

    article.innerHTML = titleHtml + descriptionHtml + annotationHtml;

    return article;
};

const renderCards = (boardId) => {
    var columns = ['todo', 'inprogress', 'done'];
    var allCards = Storage.getCardsByBoard(boardId);

    var existingCards = $$('.column .card');
    existingCards.forEach(function (el) {
        el.remove();
    });

    columns.forEach(function (columnKey) {
        var label = getColumnLabel(columnKey);
        var section = $('[aria-label="' + label + '"]');
        var cardZone = section ? section.querySelector('.column__cards') : null;
        var counter = section ? section.querySelector('.column__count') : null;

        var columnCards = allCards.filter(function (card) {
            return card.column === columnKey;
        });

        if (counter) {
            counter.textContent = columnCards.length;
        }

        columnCards.sort(function (a, b) {
            return a.order - b.order;
        });

        columnCards.forEach(function (card) {
            if (cardZone) {
                cardZone.appendChild(buildCardElement(card));
            }
        });
    });
};

const updateCounters = (boardId) => {
    var allCards = Storage.getCardsByBoard(boardId);
    var columns = ['todo', 'inprogress', 'done'];

    columns.forEach(function (columnKey) {
        var label = getColumnLabel(columnKey);
        var section = $('[aria-label="' + label + '"]');
        var counter = section ? section.querySelector('.column__count') : null;

        if (counter) {
            var count = allCards.filter(function (card) {
                return card.column === columnKey;
            }).length;
            counter.textContent = count;
        }
    });
};

const renderBoard = () => {
    var board = getCurrentBoard();

    if (!board) {
        window.location.href = 'index.html';
        return;
    }

    document.title = 'Priora — ' + board.title;

    var kanbanTitle = $('.kanban__title');
    if (kanbanTitle) {
        kanbanTitle.textContent = board.title;
    }

    var sidebarList = $('.sidebar__list');
    if (sidebarList) {
        sidebarList.innerHTML = '';

        var allBoards = Storage.getBoards();
        allBoards.forEach(function (b) {
            var li = document.createElement('li');

            var isActive = b.id === board.id;
            li.className = 'sidebar__item' + (isActive ? ' sidebar__item--active' : '');

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

    var collapse = function () {
        sidebar.classList.add('collapsed');
        wrapper.classList.add('collapsed');
        btnCollapse.style.display = 'none';
        btnExpand.style.display = 'flex';
    };

    var expand = function () {
        sidebar.classList.remove('collapsed');
        wrapper.classList.remove('collapsed');
        btnCollapse.style.display = 'flex';
        btnExpand.style.display = 'none';
    };

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

    var openModal = function (columnKey) {
        activeColumn = columnKey;
        overlay.classList.add('visible');
        if (inputTitle) inputTitle.focus();
    };

    var closeModal = function () {
        overlay.classList.remove('visible');
        var fields = overlay.querySelectorAll('input, textarea');
        fields.forEach(function (field) {
            field.value = '';
        });
    };

    var createCard = function () {
        if (!inputTitle) return;
        var title = inputTitle.value.trim();
        if (!title) {
            inputTitle.focus();
            return;
        }

        var board = getCurrentBoard();
        if (!board) return;

        var description = inputDesc ? inputDesc.value.trim() : '';
        var annotation = inputNote ? inputNote.value.trim() : '';

        Storage.addCard(board.id, activeColumn, title, description, annotation);
        renderCards(board.id);
        closeModal();
    };

    addButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var section = btn.closest('section');
            var label = section ? section.getAttribute('aria-label') : 'To-Do';
            var columnKey = getColumnKey(label);
            openModal(columnKey);
        });
    });

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    if (btnCreate) btnCreate.addEventListener('click', createCard);

    if (inputTitle) {
        inputTitle.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') createCard();
        });
    }

    overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeModal();
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
                var zones = $$('.column__cards');
                zones.forEach(function (z) {
                    z.style.minHeight = z.offsetHeight + 'px';
                });
            },

            onEnd: function (event) {
                var zones = $$('.column__cards');
                zones.forEach(function (z) {
                    z.style.minHeight = '';
                });

                var cardId = event.item.dataset.id;
                var section = event.to.closest('section');
                var label = section ? section.getAttribute('aria-label') : 'To-Do';
                var column = getColumnKey(label);

                var allCards = Storage.getCards();

                for (var i = 0; i < allCards.length; i++) {
                    if (allCards[i].id === cardId) {
                        allCards[i].column = column;
                        break;
                    }
                }

                var destCards = event.to.querySelectorAll('.card');
                destCards.forEach(function (el, index) {
                    for (var i = 0; i < allCards.length; i++) {
                        if (allCards[i].id === el.dataset.id) {
                            allCards[i].order = index;
                            break;
                        }
                    }
                });

                if (event.from !== event.to) {
                    var sourceCards = event.from.querySelectorAll('.card');
                    sourceCards.forEach(function (el, index) {
                        for (var i = 0; i < allCards.length; i++) {
                            if (allCards[i].id === el.dataset.id) {
                                allCards[i].order = index;
                                break;
                            }
                        }
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
});