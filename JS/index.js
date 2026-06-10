const buildBoardCard = (board) => {
    var wrapper = document.createElement('div');
    wrapper.className = 'board-card-wrapper';
    wrapper.dataset.id = board.id;

    var article = document.createElement('article');
    article.className = 'board-card';

    var allCards = Storage.getCards();
    var boardCards = allCards.filter(function (card) {
        return card.boardId === board.id;
    });
    var inProgress = boardCards.filter(function (card) {
        return card.column === 'inprogress';
    });

    var count = inProgress.length;
    var label;
    if (count === 0) {
        label = 'No tasks in progress';
    } else if (count === 1) {
        label = '1 task in progress';
    } else {
        label = count + ' tasks in progress';
    }

    article.innerHTML =
        '<div class="board-card__strip" style="background-color: ' + board.color + ';"></div>' +
        '<div class="board-card__body">' +
        '<h2 class="board-card__title">' + board.title + '</h2>' +
        '<p class="board-card__meta">' + label + '</p>' +
        '</div>';

    article.addEventListener('click', function () {
        window.location.href = 'board.html?id=' + board.id;
    });

    wrapper.appendChild(article);
    return wrapper;
};

const renderBoardCards = () => {
    var grid = $('.board-grid');
    if (!grid) return;

    var existing = grid.querySelectorAll('.board-card-wrapper');
    existing.forEach(function (el) {
        el.remove();
    });

    var boards = Storage.getBoards();
    var newButton = $('.board-card--new');

    boards.forEach(function (board) {
        var wrapper = buildBoardCard(board);
        grid.insertBefore(wrapper, newButton);
    });

    if (newButton) {
        newButton.style.display = boards.length >= 5 ? 'none' : '';
    }
};

const initNewBoardModal = () => {
    var overlay = $('#newBoardModal');
    if (!overlay) return;

    var btnOpen = $('.board-card--new');
    var btnClose = overlay.querySelector('.modal__close');
    var btnCancel = $('#cancelNewBoard');
    var btnCreate = overlay.querySelector('.btn-primary');
    var inputTitle = $('#boardTitle');

    var openModal = function () {
        overlay.classList.add('visible');
        inputTitle.focus();
    };

    var closeModal = function () {
        overlay.classList.remove('visible');
        inputTitle.value = '';
        resetPalette();
    };

    var createBoard = function () {
        var title = inputTitle.value.trim();
        if (!title) {
            inputTitle.focus();
            return;
        }

        var selectedSwatch = $('.color-swatch--selected');
        var color = selectedSwatch ? selectedSwatch.dataset.color : '#C4703A';

        Storage.addBoard(title, color);
        renderBoardCards();
        closeModal();
    };

    if (btnOpen) btnOpen.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    if (btnCreate) btnCreate.addEventListener('click', createBoard);

    if (inputTitle) {
        inputTitle.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') createBoard();
        });
    }

    overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeModal();
    });
};

const initColorPalette = () => {
    var swatches = $$('.color-swatch');
    if (!swatches.length) return;

    swatches.forEach(function (swatch) {
        swatch.addEventListener('click', function () {
            swatches.forEach(function (s) {
                s.classList.remove('color-swatch--selected');
            });
            swatch.classList.add('color-swatch--selected');
        });
    });
};

const resetPalette = () => {
    var swatches = $$('.color-swatch');
    swatches.forEach(function (swatch, index) {
        swatch.classList.toggle('color-swatch--selected', index === 0);
    });
};

document.addEventListener('DOMContentLoaded', function () {
    initSettings();
    renderBoardCards();
    initNewBoardModal();
    initColorPalette();
});