import * as Swal from 'sweetalert2';

let tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let player;
function onYouTubeIframeAPIReady() {
    console.log("YouTube API Ready");
}

let quotes = [];
let timerInterval;
let answerTimeout;
let timeLeft = 30;
let answerTimeLeft = 30;
let currentQuote;
let usedQuotes = [];
let gameSessionQuotes = [];
let gameSessionLength = 2;
let quoteIndex = 0;
let isPaused = false;

const quoteElement = document.getElementById('quote');
const questionCounterElement = document.getElementById('question-counter');
const timerElement = document.getElementById('timer');
const answerContainer = document.getElementById('answer-container');
const answerElement = document.getElementById('answer');
const youtubeVideo = document.getElementById('youtube-video');
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

function getRandomQuote() {
    if (gameSessionQuotes.length >= gameSessionLength) {
        showFinalAnswer();
        return null;
    }

    if (usedQuotes.length >= quotes.length * 2) {
        usedQuotes = [];
    }

    let availableQuotes = quotes.filter(quote =>
        !usedQuotes.includes(quote) && !gameSessionQuotes.includes(quote)
    );

    if (availableQuotes.length === 0) {
        availableQuotes = quotes.filter(quote => !gameSessionQuotes.includes(quote));
        if (availableQuotes.length === 0) {
            showFinalAnswer();
            return null;
        }
    }

    let randomIndex = Math.floor(Math.random() * availableQuotes.length);
    return availableQuotes[randomIndex];
}

function convertToEmbedUrl(url, startTime) {
    let videoId = '';
    let match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
        videoId = match[1];
    }
    return `https://www.youtube-nocookie.com/embed/${videoId}?start=${startTime}&enablejsapi=1&autoplay=1&controls=0`;
}

function loadQuote() {
    currentQuote = getRandomQuote();
    if (!currentQuote) return;

    quoteElement.textContent = currentQuote.quote;
    answerElement.textContent = currentQuote.answer;

    let youtubeUrl = currentQuote.youtubeUrl;
    let startTime = currentQuote.startTime || 0;

    if (!youtubeUrl.includes('embed')) {
        youtubeUrl = convertToEmbedUrl(youtubeUrl, startTime);
    } else if (!youtubeUrl.includes('enablejsapi=1')) {
        youtubeUrl += (youtubeUrl.includes('?') ? '&' : '?') + 'enablejsapi=1&autoplay=1&controls=0';
    }

    youtubeVideo.src = youtubeUrl;

    // Réinitialisation et création d'un nouveau player si nécessaire
    try {
        if (typeof YT !== 'undefined' && YT.Player) {
            if (player) {
                player.destroy();
            }
            player = new YT.Player('youtube-video', {
                events: {
                    'onReady': onPlayerReady
                }
            });
        }
    } catch (e) {
        console.error("Erreur lors de l'initialisation du player YouTube:", e);
    }

    answerContainer.style.display = 'none';
    youtubeContainer.style.display = 'block';
    usedQuotes.push(currentQuote);
    gameSessionQuotes.push(currentQuote);
    mainContainer.classList.remove('answer-time');

    questionCounterElement.textContent = `${gameSessionQuotes.length}/${gameSessionLength}`;
    nextQuestionButton.style.display = 'none';
    timerElement.textContent = `${timeLeft}`;
    skipButton.style.display = 'inline-block';
    startTimer();
}

// Fonction appelée lorsque le player YouTube est prêt
function onPlayerReady(event) {
    event.target.playVideo();
    event.target.setVolume(100); // Set volume to 100%
}

function startTimer() {
    clearInterval(timerInterval);

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
    resetButton.disabled = true;
    mainContainer.classList.add('answer-time');

    answerTimeLeft = 30;
    updateAnswerTimer();
    answerTimeout = setInterval(updateAnswerTimer, 1000);

    if (gameSessionQuotes.length < gameSessionLength) {
        nextQuestionButton.style.display = 'inline-block';
    } else {
        showFinalAnswer();
    }

    skipButton.style.display = 'none';
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
    pauseButton.disabled = false;
    skipButton.disabled = false;
    resetButton.disabled = false;
    loadQuote();
}

function showFinalAnswer() {
    answerContainer.style.display = 'block';
    youtubeContainer.style.display = 'block';
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
}

function startGameSession() {
    if (quotes.length === 0) {
        Swal.fire('Veuillez configurer le quiz avant de commencer.');
        openSettingsMenu();
        return;
    }
    gameSessionQuotes = [];
    usedQuotes = [];
    quoteIndex = 0;
    loadQuote();
}

function endGameSession() {
    clearInterval(timerInterval);
    clearInterval(answerTimeout);
    quoteElement.textContent = "Session terminée !";
    questionCounterElement.textContent = "";
    timerElement.textContent = "";
    answerContainer.style.display = "none";
    youtubeContainer.style.display = "none";
    startButton.disabled = false;
    pauseButton.disabled = true;
    skipButton.disabled = true;
    resetButton.disabled = true;
    mainContainer.classList.remove('answer-time');
    nextQuestionButton.style.display = 'none';

    // Arrêter la vidéo si elle est en cours de lecture
    if (player && typeof player.stopVideo === 'function') {
        player.stopVideo();
    }
}

function pauseVideo() {
    if (player && typeof player.pauseVideo === 'function') {
        player.pauseVideo();
    } else {
        youtubeVideo.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
}

function playVideo() {
    if (player && typeof player.playVideo === 'function') {
        player.playVideo();
    } else {
        youtubeVideo.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
}

function seekToStart() {
    if (player && typeof player.seekTo === 'function') {
        player.seekTo(0, true);
    } else {
        youtubeVideo.contentWindow.postMessage('{"event":"command","func":"seekTo","args":[0, true]}', '*');
    }
}

createQuizButton.addEventListener('click', () => {
    openSettingsMenu();
});

startButton.addEventListener('click', () => {
    if (quotes.length === 0) {
        Swal.fire('Veuillez configurer le quiz avant de commencer.');
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
        startTimer();
        if (mainContainer.classList.contains('answer-time')) {
            updateAnswerTimer();
        }
        playVideo();
        pauseButton.textContent = 'Pause';
    }
});

resetButton.addEventListener('click', () => {
    timeLeft = 30;
    startTimer();
    seekToStart();
});

skipButton.addEventListener('click', () => {
    timeLeft = 1;
    updateAnswerTimer();
});

nextQuestionButton.addEventListener('click', () => {
    answerTimeLeft = 1;
    updateAnswerTimer();
});

stopQuizButton.addEventListener('click', () => {
    location.reload(true);
});

saveSettingsButton.addEventListener('click', () => {
    saveSettings();
    closeSettingsMenu();
});

gameSessionLengthInput.addEventListener('input', () => {
    loadQuotesEditor();
});

quotesEditor.addEventListener('input', (event) => {
    if (event.target.id.startsWith('youtubeUrl-')) {
        const index = event.target.id.split('-')[1];
        const startTimeInput = document.getElementById(`startTime-${index}`);
        const startTime = startTimeInput.value || 0;
        const youtubeUrl = event.target.value;

        // Ensure quotes array is initialized
        if (!quotes[index]) {
            quotes[index] = {};
        }

        quotes[index].youtubeUrl = youtubeUrl;
        quotes[index].startTime = startTime;
    }
});

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
    quotesEditor.innerHTML = '';

    for (let i = 0; i < numberOfQuotes; i++) {
        const quoteItem = document.createElement('div');
        quoteItem.classList.add('quote-item');
        quoteItem.innerHTML = `
            <h3>Réplique ${i + 1}</h3>
            <label for="quote-${i}">Réplique:</label>
            <textarea id="quote-${i}" rows="2">${quotes[i]?.quote || ''}</textarea>
            <label for="answer-${i}">Réponse:</label>
            <input type="text" id="answer-${i}" value="${quotes[i]?.answer || ''}">
            <label for="youtubeUrl-${i}">URL YouTube:</label>
            <input type="text" id="youtubeUrl-${i}" value="${quotes[i]?.youtubeUrl?.replace(/\?.*$/, '') || ''}">
            <label for="startTime-${i}">Temps de début (secondes):</label>
            <input type="number" id="startTime-${i}" value="${quotes[i]?.startTime || 0}" min="0">
        `;
        quotesEditor.appendChild(quoteItem);
    }
}

function saveSettings() {
    const numberOfQuotes = parseInt(gameSessionLengthInput.value, 10);
    quotes = [];

    for (let i = 0; i < numberOfQuotes; i++) {
        const youtubeUrl = document.getElementById(`youtubeUrl-${i}`).value;
        const startTime = parseInt(document.getElementById(`startTime-${i}`).value, 10) || 0;
        const embedUrl = convertToEmbedUrl(youtubeUrl, startTime);

        quotes.push({
            quote: document.getElementById(`quote-${i}`).value,
            answer: document.getElementById(`answer-${i}`).value,
            youtubeUrl: embedUrl,
            startTime: startTime
        });
    }

    gameSessionLength = numberOfQuotes;
}

overlay.addEventListener('click', closeSettingsMenu);

pauseButton.disabled = true;
skipButton.disabled = true;
resetButton.disabled = true;
stopQuizButton.disabled = true;
nextQuestionButton.style.display = 'none';
