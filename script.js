// Variables globales
let quotes = [];
let timerInterval;
let answerTimeout;
let timeLeft = 30;
let answerTimeLeft = 30;
let currentQuoteIndex = 0;
let gameSessionLength = 2;
let isPaused = false;
let currentStartTime = 0;
let player = null;
let isYouTubeAPIReady = false;
let playerReadyCallback = null;

// Éléments du DOM
const quoteElement = document.getElementById('quote');
const questionCounterElement = document.getElementById('question-counter');
const timerElement = document.getElementById('timer');
const answerContainer = document.getElementById('answer-container');
const answerElement = document.getElementById('answer');
const youtubeContainer = document.getElementById('youtube-container');
const createQuizButton = document.getElementById('create-quiz-button');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const resetButton = document.getElementById('reset-button');
const skipButton = document.getElementById('skip-button');
const stopQuizButton = document.getElementById('stop-quiz-button');
const nextQuestionButton = document.getElementById('next-question-button');
const mainContainer = document.getElementById('main-container');
const settingsMenu = document.getElementById('settings-menu');
const overlay = document.getElementById('overlay');
const quotesEditor = document.getElementById('quotes-editor');
const gameSessionLengthInput = document.getElementById('game-session-length');
const saveSettingsButton = document.getElementById('save-settings-button');
const endScreen = document.getElementById('end-screen');
const replayButton = document.getElementById('replay-button');
const newQuizButton = document.getElementById('new-quiz-button');

// Fonctions utilitaires
function convertTimeToSeconds(time) {
    let [minutes, seconds] = time.split(':').map(Number);
    return minutes * 60 + seconds;
}

function convertToEmbedUrl(url, startTime) {
    let videoId = '';
    let match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
        videoId = match[1];
    } else {
        console.error("URL YouTube invalide:", url);
        return "";
    }

    if (typeof startTime === 'string') {
        startTime = convertTimeToSeconds(startTime);
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}?start=${startTime}&enablejsapi=1&autoplay=1&controls=0&mute=0&loop=0&playlist=${videoId}&origin=${window.location.origin}`;
}

// Initialisation de l'API YouTube
function onYouTubeIframeAPIReady() {
    isYouTubeAPIReady = true;
    console.log("API YouTube prête");

    if (playerReadyCallback) {
        playerReadyCallback();
        playerReadyCallback = null;
    }
}

// Assurer que l'API YouTube est chargée
function loadYouTubeAPI() {
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        onYouTubeIframeAPIReady();
    }
}

// Fonctions de gestion du jeu
function loadQuote() {
    if (quotes.length === 0 || currentQuoteIndex >= quotes.length || currentQuoteIndex >= gameSessionLength) {
        showFinalAnswer();
        return;
    }

    const currentQuote = quotes[currentQuoteIndex];

    if (!currentQuote) {
        console.error("Citation non trouvée à l'index:", currentQuoteIndex);
        showFinalAnswer();
        return;
    }

    quoteElement.textContent = currentQuote.quote || "Question sans texte";
    answerElement.textContent = currentQuote.answer || "Pas de réponse fournie";

    isPaused = false;
    pauseButton.textContent = 'Pause';

    let youtubeUrl = currentQuote.youtubeUrl || "";
    currentStartTime = currentQuote.startTime || "0:00";

    if (player) {
        try {
            player.destroy();
        } catch (e) {
            console.error("Erreur lors de la destruction du player:", e);
        }
        player = null;
    }

    if (!youtubeUrl) {
        youtubeContainer.style.display = 'none';
    } else {
        if (!youtubeUrl.includes('embed')) {
            youtubeUrl = convertToEmbedUrl(youtubeUrl, currentStartTime);
        } else if (!youtubeUrl.includes('enablejsapi=1')) {
            youtubeUrl += (youtubeUrl.includes('?') ? '&' : '?') + 'enablejsapi=1&autoplay=1&controls=0&mute=0';
        }

        const oldIframe = document.getElementById('youtube-video');
        if (oldIframe) {
            oldIframe.remove();
        }

        const newIframe = document.createElement('iframe');
        newIframe.id = 'youtube-video';
        newIframe.setAttribute('width', '100%');
        newIframe.setAttribute('height', '100%');
        newIframe.setAttribute('frameborder', '0');
        newIframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        newIframe.setAttribute('allowfullscreen', '');
        newIframe.src = youtubeUrl;
        youtubeContainer.appendChild(newIframe);
        youtubeContainer.style.display = 'block';

        loadYouTubeAPI();

        const initializePlayer = () => {
            const iframe = document.getElementById('youtube-video');
            if (!iframe) {
                console.error("L'iframe YouTube n'est pas attaché au DOM.");
                return;
            }

            if (typeof YT !== 'undefined' && YT.Player) {
                try {
                    player = new YT.Player('youtube-video', {
                        events: {
                            'onReady': onPlayerReady,
                            'onStateChange': onPlayerStateChange,
                            'onError': onPlayerError
                        }
                    });
                } catch (e) {
                    console.error("Erreur lors de la création du player YouTube:", e);
                }
            } else {
                console.error("L'API YouTube n'est pas disponible");
                setTimeout(initializePlayer, 500);
            }
        };

        if (isYouTubeAPIReady) {
            setTimeout(initializePlayer, 300);
        } else {
            playerReadyCallback = () => setTimeout(initializePlayer, 300);
        }
    }

    answerContainer.style.display = 'none';
    mainContainer.classList.remove('answer-time');
    timeLeft = 30;

    questionCounterElement.textContent = `${currentQuoteIndex + 1}/${gameSessionLength}`;
    nextQuestionButton.style.display = 'none';
    timerElement.textContent = `${timeLeft}`;
    skipButton.style.display = 'inline-block';

    startTimer();
}

function onPlayerReady(event) {
    if (event && event.target) {
        try {
            console.log("Player YouTube prêt");
            event.target.setVolume(100);
            const startTimeInSeconds = convertTimeToSeconds(currentStartTime);
            event.target.seekTo(startTimeInSeconds, true);

            if (!isPaused) {
                setTimeout(() => {
                    if (player && typeof player.playVideo === 'function') {
                        player.playVideo();
                    }
                }, 100);
            } else {
                event.target.pauseVideo();
            }
        } catch (e) {
            console.error("Erreur lors de l'initialisation du player YouTube:", e);
        }
    }
}

function onPlayerStateChange(event) {
    if (event && event.data === YT.PlayerState.PAUSED && !isPaused) {
        isPaused = true;
        pauseButton.textContent = 'Reprendre';
        clearInterval(timerInterval);
        clearInterval(answerTimeout);
    } else if (event && event.data === YT.PlayerState.PLAYING && isPaused) {
        isPaused = false;
        pauseButton.textContent = 'Pause';
        if (!mainContainer.classList.contains('answer-time')) {
            startTimer();
        } else {
            clearInterval(answerTimeout);
            answerTimeout = setInterval(updateAnswerTimer, 1000);
        }
    }
}

function onPlayerError(event) {
    console.error("Erreur du lecteur YouTube:", event.data);
    youtubeContainer.innerHTML = '<div class="error-message">Erreur de chargement de la vidéo</div>';
    if (event.data === 150) {
        console.error("L'élément HTML spécifié ne contient pas de lecteur YouTube.");
    }
}

function startTimer() {
    clearInterval(timerInterval);
    clearInterval(answerTimeout);

    if (!isPaused && player && typeof player.playVideo === 'function') {
        player.playVideo();
    } else if (isPaused && player && typeof player.pauseVideo === 'function') {
        player.pauseVideo();
    }

    timerInterval = setInterval(() => {
        if (!isPaused) {
            timeLeft--;
            timerElement.textContent = `${timeLeft}`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                showAnswer();
            }
        }
    }, 1000);
}

function showAnswer() {
    answerContainer.style.display = 'block';
    youtubeContainer.style.display = 'block';

    clearInterval(timerInterval);

    pauseButton.disabled = false;
    skipButton.disabled = true;
    resetButton.disabled = false;
    mainContainer.classList.add('answer-time');

    answerTimeLeft = 30;
    updateAnswerTimer();

    clearInterval(answerTimeout);
    answerTimeout = setInterval(updateAnswerTimer, 1000);

    if (currentQuoteIndex < gameSessionLength - 1) {
        nextQuestionButton.style.display = 'inline-block';
    } else {
        nextQuestionButton.style.display = 'none';
    }

    skipButton.style.display = 'none';

    if (!isPaused && player && typeof player.playVideo === 'function') {
        player.playVideo();
    }
}

function updateAnswerTimer() {
    if (!isPaused) {
        timerElement.textContent = `${answerTimeLeft}`;
        answerTimeLeft--;

        if (answerTimeLeft < 0) {
            clearInterval(answerTimeout);
            loadNextQuote();
        }
    }
}

function loadNextQuote() {
    if (currentQuoteIndex < gameSessionLength - 1) {
        pauseButton.disabled = false;
        skipButton.disabled = false;
        resetButton.disabled = false;
        currentQuoteIndex++;
        loadQuote();
    } else {
        showFinalAnswer();
    }
}

function showFinalAnswer() {
    answerContainer.style.display = 'block';
    youtubeContainer.style.display = 'none';

    clearInterval(timerInterval);
    clearInterval(answerTimeout);

    pauseButton.disabled = true;
    skipButton.disabled = true;
    resetButton.disabled = true;
    mainContainer.classList.add('answer-time');

    quoteElement.textContent = "Dernière réponse:";
    timerElement.textContent = '';
    nextQuestionButton.style.display = 'none';
    startButton.disabled = true;
    stopQuizButton.disabled = false;

    stopVideo();

    // Afficher l'écran de fin après un court délai
    setTimeout(showEndScreen, 2000);
}

function showEndScreen() {
    endScreen.style.display = 'block';
    mainContainer.style.display = 'none';
}

function startGameSession() {
    if (quotes.length === 0 || quotes.some(q => !q.quote || !q.answer)) {
        Swal.fire('Veuillez configurer correctement le quiz avant de commencer.');
        openSettingsMenu();
        return;
    }

    isPaused = false;
    pauseButton.textContent = 'Pause';
    currentQuoteIndex = 0;
    loadQuote();
}

function endGameSession() {
    clearInterval(timerInterval);
    clearInterval(answerTimeout);

    if (player) {
        try {
            if (typeof player.stopVideo === 'function') {
                player.stopVideo();
            }
            player.destroy();
            player = null;
        } catch (e) {
            console.error("Erreur lors de l'arrêt de la vidéo:", e);
        }
    }

    location.reload();
}

function pauseVideo() {
    if (player && typeof player.pauseVideo === 'function') {
        try {
            player.pauseVideo();
            console.log("Vidéo mise en pause");
        } catch (e) {
            console.error("Erreur lors de la pause de la vidéo:", e);
        }
    } else {
        console.warn("La méthode pauseVideo n'est pas disponible");
    }
}

function playVideo() {
    if (player && typeof player.playVideo === 'function') {
        try {
            player.playVideo();
            console.log("Vidéo en lecture");
        } catch (e) {
            console.error("Erreur lors de la lecture de la vidéo:", e);
        }
    } else {
        console.warn("La méthode playVideo n'est pas disponible");
    }
}

function stopVideo() {
    if (player && typeof player.stopVideo === 'function') {
        try {
            player.stopVideo();
            console.log("Vidéo arrêtée");
        } catch (e) {
            console.error("Erreur lors de l'arrêt de la vidéo:", e);
        }
    } else {
        console.warn("La méthode stopVideo n'est pas disponible");
    }
}

function resetVideo() {
    if (player && typeof player.seekTo === 'function') {
        try {
            const startTimeInSeconds = convertTimeToSeconds(currentStartTime);
            player.seekTo(startTimeInSeconds, true);
            console.log(`Vidéo réinitialisée à ${startTimeInSeconds} secondes`);

            if (!isPaused) {
                playVideo();
            } else {
                pauseVideo();
            }
        } catch (e) {
            console.error("Erreur lors de la réinitialisation de la vidéo:", e);
        }
    } else {
        console.warn("La méthode seekTo n'est pas disponible");
    }
}

// Gestion des événements
createQuizButton.addEventListener('click', () => {
    openSettingsMenu();
});

startButton.addEventListener('click', () => {
    if (quotes.length === 0 || quotes.some(q => !q.quote || !q.answer)) {
        Swal.fire('Veuillez configurer correctement le quiz avant de commencer.');
        openSettingsMenu();
        return;
    }

    startButton.disabled = true;
    createQuizButton.disabled = true;
    stopQuizButton.disabled = false;
    pauseButton.disabled = false;
    resetButton.disabled = false;
    skipButton.disabled = false;
    startGameSession();
});

pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;

    if (isPaused) {
        clearInterval(timerInterval);
        clearInterval(answerTimeout);
        pauseVideo();
        pauseButton.textContent = 'Reprendre';
    } else {
        if (!mainContainer.classList.contains('answer-time')) {
            startTimer();
        } else {
            clearInterval(answerTimeout);
            answerTimeout = setInterval(updateAnswerTimer, 1000);
        }
        playVideo();
        pauseButton.textContent = 'Pause';
    }
});

resetButton.addEventListener('click', () => {
    if (!mainContainer.classList.contains('answer-time')) {
        timeLeft = 30;
        timerElement.textContent = `${timeLeft}`;
        clearInterval(timerInterval);
        startTimer();
    } else {
        answerTimeLeft = 30;
        timerElement.textContent = `${answerTimeLeft}`;
        clearInterval(answerTimeout);
        answerTimeout = setInterval(updateAnswerTimer, 1000);
    }

    resetVideo();
});

skipButton.addEventListener('click', () => {
    clearInterval(timerInterval);
    showAnswer();
});

nextQuestionButton.addEventListener('click', () => {
    clearInterval(answerTimeout);
    loadNextQuote();
});

stopQuizButton.addEventListener('click', () => {
    endGameSession();
});

replayButton.addEventListener('click', () => {
    endScreen.style.display = 'none';
    mainContainer.style.display = 'block';
    startGameSession();
});

newQuizButton.addEventListener('click', () => {
    endScreen.style.display = 'none';
    mainContainer.style.display = 'block';
    openSettingsMenu();
});

saveSettingsButton.addEventListener('click', () => {
    if (validateSettings()) {
        saveSettings();
        closeSettingsMenu();
    }
});

gameSessionLengthInput.addEventListener('input', () => {
    loadQuotesEditor();
});

// Fonctions de gestion des paramètres
function openSettingsMenu() {
    settingsMenu.style.display = 'block';
    overlay.style.display = 'block';
    loadQuotesEditor();
    gameSessionLengthInput.value = gameSessionLength;
}

function closeSettingsMenu() {
    settingsMenu.style.display = 'none';
    overlay.style.display = 'none';
}

function loadQuotesEditor() {
    const numberOfQuotes = parseInt(gameSessionLengthInput.value, 10);
    if (isNaN(numberOfQuotes) || numberOfQuotes < 1) {
        gameSessionLengthInput.value = 1;
        return;
    }

    quotesEditor.innerHTML = '';

    for (let i = 0; i < numberOfQuotes; i++) {
        const quoteItem = document.createElement('div');
        quoteItem.classList.add('quote-item');

        let displayStartTime = quotes[i]?.startTime || '0:00';

        quoteItem.innerHTML = `
            <h3>Réplique ${i + 1}</h3>
            <label for="quote-${i}">Réplique:</label>
            <textarea id="quote-${i}" rows="2" required>${quotes[i]?.quote || ''}</textarea>
            <label for="answer-${i}">Réponse:</label>
            <input type="text" id="answer-${i}" value="${quotes[i]?.answer || ''}" required>
            <label for="youtubeUrl-${i}">URL YouTube:</label>
            <input type="text" id="youtubeUrl-${i}" value="${quotes[i]?.youtubeUrl?.replace(/\?.*$/, '') || ''}" required>
            <label for="startTime-${i}">Temps de début (minutes:secondes):</label>
            <input type="text" id="startTime-${i}" value="${displayStartTime}" placeholder="0:00" pattern="[0-9]+:[0-5][0-9]">
            <small>Format: minutes:secondes (ex: 1:30, 0:45)</small>
        `;
        quotesEditor.appendChild(quoteItem);
    }
}

function validateSettings() {
    const numberOfQuotes = parseInt(gameSessionLengthInput.value, 10);
    if (isNaN(numberOfQuotes) || numberOfQuotes < 1) {
        Swal.fire('Veuillez entrer un nombre valide de questions.');
        return false;
    }

    for (let i = 0; i < numberOfQuotes; i++) {
        const quoteInput = document.getElementById(`quote-${i}`);
        const answerInput = document.getElementById(`answer-${i}`);
        const youtubeUrlInput = document.getElementById(`youtubeUrl-${i}`);

        if (!quoteInput || !answerInput || !youtubeUrlInput) {
            console.error("Éléments manquants pour la question", i);
            continue;
        }

        if (!quoteInput.value.trim()) {
            Swal.fire(`Veuillez saisir le texte de la réplique ${i+1}.`);
            return false;
        }

        if (!answerInput.value.trim()) {
            Swal.fire(`Veuillez saisir la réponse pour la réplique ${i+1}.`);
            return false;
        }

        if (!youtubeUrlInput.value.trim()) {
            Swal.fire(`Veuillez saisir l'URL YouTube pour la réplique ${i+1}.`);
            return false;
        }

        const youtubeUrl = youtubeUrlInput.value;
        if (!youtubeUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)) {
            Swal.fire(`L'URL YouTube pour la réplique ${i+1} n'est pas valide.`);
            return false;
        }

        const startTimeInput = document.getElementById(`startTime-${i}`);
        if (startTimeInput && startTimeInput.value && !/^\d+:[0-5]\d$/.test(startTimeInput.value)) {
            Swal.fire(`Format de temps invalide pour la réplique ${i+1}. Utilisez le format minutes:secondes (ex: 1:30)`);
            return false;
        }
    }

    return true;
}

function saveSettings() {
    const numberOfQuotes = parseInt(gameSessionLengthInput.value, 10);

    quotes = [];

    for (let i = 0; i < numberOfQuotes; i++) {
        const quoteInput = document.getElementById(`quote-${i}`);
        const answerInput = document.getElementById(`answer-${i}`);
        const youtubeUrlInput = document.getElementById(`youtubeUrl-${i}`);
        const startTimeInput = document.getElementById(`startTime-${i}`);

        if (!quoteInput || !answerInput || !youtubeUrlInput || !startTimeInput) {
            console.error("Éléments manquants pour la question", i);
            continue;
        }

        const youtubeUrl = youtubeUrlInput.value;
        const startTime = startTimeInput.value || "0:00";

        quotes.push({
            quote: quoteInput.value,
            answer: answerInput.value,
            youtubeUrl: youtubeUrl,
            startTime: startTime
        });
    }

    gameSessionLength = numberOfQuotes;
    saveToLocalStorage();
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('blindTestQuotes', JSON.stringify(quotes));
        localStorage.setItem('blindTestSessionLength', gameSessionLength);
    } catch (e) {
        console.error("Erreur lors de la sauvegarde des données:", e);
    }
}

function loadFromLocalStorage() {
    try {
        const savedQuotes = localStorage.getItem('blindTestQuotes');
        const savedSessionLength = localStorage.getItem('blindTestSessionLength');

        if (savedQuotes) {
            quotes = JSON.parse(savedQuotes);
        }

        if (savedSessionLength) {
            gameSessionLength = parseInt(savedSessionLength, 10);
        }
    } catch (e) {
        console.error("Erreur lors du chargement des données:", e);
    }
}

// Initialisation
overlay.addEventListener('click', closeSettingsMenu);

pauseButton.disabled = true;
skipButton.disabled = true;
resetButton.disabled = true;
stopQuizButton.disabled = true;
nextQuestionButton.style.display = 'none';

youtubeContainer.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
});

youtubeContainer.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
});

loadYouTubeAPI();

document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
});

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
