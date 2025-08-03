import { supabase } from './supabase.js';
import { db } from './db.js';
import { Utils } from './utils.js';

class HeatedDotCom {
    constructor() {
        this.currentUser = null;
        this.currentRoom = null;
        this.currentRound = null;
        this.gameState = 'homepage';
        this.timer = null;
        this.currentTakeIndex = 0;
        this.takes = [];
        this.votes = [];
        this.players = [];

        this.initializeApp();
    }

    initializeApp() {
        // Check for existing user session
        this.currentUser = supabase.getCurrentUser();
        if (this.currentUser) {
            this.showUserInfo();
        }

        this.bindEvents();
        this.showPage('homepage');
    }

    bindEvents() {
        // Auth events
        document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
        document.getElementById('signup-btn').addEventListener('click', () => this.handleSignup());
        document.getElementById('anon-btn').addEventListener('click', () => this.handleAnonymousLogin());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        // Room events
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('join-random-btn').addEventListener('click', () => this.joinRandomRoom());
        document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom());
        document.getElementById('copy-room-code').addEventListener('click', () => this.copyRoomCode());

        // Game events
        document.getElementById('ready-btn').addEventListener('click', () => this.toggleReady());
        document.getElementById('submit-take-btn').addEventListener('click', () => this.submitTake());
        document.getElementById('next-round-btn').addEventListener('click', () => this.nextRound());
        document.getElementById('end-game-btn').addEventListener('click', () => this.endGame());
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());

        // Vote events
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.submitVote(e.target.dataset.vote));
        });

        // Enter key handlers
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        document.getElementById('room-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        // Email overlay close button
        document.getElementById('close-email-overlay').addEventListener('click', () => this.closeEmailOverlay());
    }

    // Authentication methods
    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            Utils.showNotification('Please enter email and password', 'error');
            return;
        }

        try {
            const result = await supabase.signIn(email, password);
            if (result.user) {
                this.currentUser = result.user;
                this.showUserInfo();
                Utils.showNotification('Logged in successfully!', 'success');
            } else {
                Utils.showNotification('Login failed', 'error');
            }
        } catch (error) {
            Utils.showNotification('Login error: ' + error.message, 'error');
        }
    }

    async handleSignup() {
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!username || !email || !password) {
            Utils.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            const result = await supabase.signUp(email, password, username);
            if (result.error) {
                Utils.showNotification(result.error.message, 'error');
            } else {
                this.showEmailOverlay();
                // Clear form
                document.getElementById('username').value = '';
                document.getElementById('email').value = '';
                document.getElementById('password').value = '';
            }
        } catch (error) {
            Utils.showNotification('Signup failed', 'error');
        }
    }

    showEmailOverlay() {
        document.getElementById('email-overlay').classList.remove('hidden');
    }

    closeEmailOverlay() {
        document.getElementById('email-overlay').classList.add('hidden');
    }

    async handleAnonymousLogin() {
        try {
            const result = await supabase.signInAnonymously();
            this.currentUser = result.user;
            this.showUserInfo();
            Utils.showNotification('Playing as anonymous user', 'success');
        } catch (error) {
            Utils.showNotification('Anonymous login failed', 'error');
        }
    }

    async handleLogout() {
        await supabase.signOut();
        this.currentUser = null;
        this.showLoginForm();
        Utils.showNotification('Logged out successfully', 'success');
    }

    showUserInfo() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        const usernameElement = document.querySelector('#user-info #username');
        if (usernameElement) {
            usernameElement.textContent = 
                this.currentUser.user_metadata?.username || this.currentUser.email || 'Anonymous';
        }
    }

    showLoginForm() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('user-info').classList.add('hidden');
    }

    // Room management
    async createRoom() {
        if (!this.currentUser) {
            Utils.showNotification('Please login first', 'error');
            return;
        }

        const topicField = document.getElementById('topic-field').value;

        try {
            const roomCode = await db.createRoom(this.currentUser.id, topicField);
            await this.joinRoomByCode(roomCode);
        } catch (error) {
            Utils.showNotification('Failed to create room: ' + error.message, 'error');
        }
    }

    async joinRoom() {
        const roomCode = document.getElementById('room-code').value.toUpperCase();
        if (!roomCode) {
            Utils.showNotification('Please enter a room code', 'error');
            return;
        }

        await this.joinRoomByCode(roomCode);
    }

    async joinRoomByCode(roomCode) {
        if (!this.currentUser) {
            Utils.showNotification('Please login first', 'error');
            return;
        }

        try {
            const room = await db.joinRoom(
                roomCode, 
                this.currentUser.id, 
                this.currentUser.user_metadata?.username || this.currentUser.email || 'Anonymous'
            );

            this.currentRoom = room;
            this.showPage('lobby');
            document.getElementById('current-room-code').textContent = roomCode;
            this.updateLobby();
            Utils.showNotification('Joined room successfully!', 'success');
        } catch (error) {
            Utils.showNotification('Failed to join room: ' + error.message, 'error');
        }
    }

    async joinRandomRoom() {
        if (!this.currentUser) {
            Utils.showNotification('Please login first', 'error');
            return;
        }

        try {
            const availableRooms = await db.getAvailableRooms();
            
            if (availableRooms.length === 0) {
                Utils.showNotification('No available rooms found. Create one!', 'error');
                return;
            }

            // Pick a random room
            const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
            await this.joinRoomByCode(randomRoom.code);
        } catch (error) {
            Utils.showNotification('Failed to join random room: ' + error.message, 'error');
        }
    }

    async leaveRoom() {
        if (!this.currentRoom) return;

        try {
            await db.leaveRoom(this.currentRoom.code, this.currentUser.id);
            this.currentRoom = null;
            this.showPage('homepage');
            Utils.showNotification('Left room', 'success');
        } catch (error) {
            Utils.showNotification('Failed to leave room', 'error');
        }
    }

    async copyRoomCode() {
        const roomCode = document.getElementById('current-room-code').textContent;
        const success = await Utils.copyToClipboard(roomCode);
        if (success) {
            Utils.showNotification('Room code copied!', 'success');
        }
    }

    // Lobby management
    async updateLobby() {
        if (!this.currentRoom) return;

        try {
            this.players = await db.getRoomPlayers(this.currentRoom.code);
            this.renderPlayers();
            this.checkReadyStatus();
        } catch (error) {
            console.error('Error updating lobby:', error);
        }
    }

    renderPlayers() {
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';

        this.players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.ready ? 'ready' : ''}`;
            playerCard.innerHTML = `
                <div class="font-semibold">${player.username}</div>
                <div class="text-sm text-gray-600">${player.ready ? '✅ Ready' : '⏳ Not Ready'}</div>
            `;
            playersList.appendChild(playerCard);
        });
    }

    checkReadyStatus() {
        const allReady = this.players.length >= 2 && this.players.every(p => p.ready);
        if (allReady && this.currentRoom.status === 'lobby') {
            this.startCountdown();
        }
    }

    startCountdown() {
        let countdown = 5;
        const timerEl = document.getElementById('start-timer');
        timerEl.classList.remove('hidden');

        const interval = setInterval(() => {
            timerEl.textContent = `Game starting in ${countdown}...`;
            countdown--;

            if (countdown < 0) {
                clearInterval(interval);
                this.startGame();
            }
        }, 1000);
    }

    async toggleReady() {
        if (!this.currentRoom) return;

        const currentPlayer = this.players.find(p => p.player_id === this.currentUser.id);
        const newReadyState = !currentPlayer.ready;

        try {
            await db.updatePlayerReady(this.currentRoom.code, this.currentUser.id, newReadyState);
            currentPlayer.ready = newReadyState;
            this.renderPlayers();
            this.checkReadyStatus();
        } catch (error) {
            Utils.showNotification('Failed to update ready status', 'error');
        }
    }

    // Game logic
    async startGame() {
        try {
            await db.updateRoomStatus(this.currentRoom.code, 'playing');
            const wordData = await Utils.generateWord(this.currentRoom.topic_field);

            this.currentRound = await db.startRound(
                this.currentRoom.code,
                wordData.word,
                wordData.definition,
                wordData.type
            );

            this.showPage('game-round');
            this.showWordPhase(wordData);
        } catch (error) {
            Utils.showNotification('Failed to start game: ' + error.message, 'error');
        }
    }

    showWordPhase(wordData) {
        document.getElementById('current-word').textContent = wordData.word;
        document.getElementById('word-type').textContent = wordData.type;
        document.getElementById('word-definition').textContent = wordData.definition;

        this.showPhase('word-phase');

        setTimeout(() => {
            this.startWritingPhase();
        }, 5000);
    }

    startWritingPhase() {
        this.showPhase('writing-phase');
        this.startWritingTimer();
    }

    startWritingTimer() {
        let timeLeft = 60;
        const timerEl = document.getElementById('writing-timer');

        this.timer = setInterval(() => {
            timerEl.textContent = timeLeft;
            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(this.timer);
                this.submitTake(true); // Force submit
            }
        }, 1000);
    }

    async submitTake(forced = false) {
        const takeText = document.getElementById('take-input').value.trim();

        if (!takeText && !forced) {
            Utils.showNotification('Please write your take', 'error');
            return;
        }

        try {
            await db.submitTake(
                this.currentRoom.code,
                this.currentRound.round_number,
                this.currentUser.id,
                takeText
            );

            clearInterval(this.timer);
            document.getElementById('submit-take-btn').disabled = true;
            Utils.showNotification('Take submitted!', 'success');

            // Check if all players have submitted
            setTimeout(() => this.checkAllTakesSubmitted(), 1000);
        } catch (error) {
            Utils.showNotification('Failed to submit take', 'error');
        }
    }

    async checkAllTakesSubmitted() {
        try {
            const takes = await db.getRoundTakes(this.currentRoom.code, this.currentRound.round_number);
            if (takes.length >= this.players.length) {
                this.startVotingPhase(takes);
            }
        } catch (error) {
            console.error('Error checking takes:', error);
        }
    }

    startVotingPhase(takes) {
        this.takes = Utils.shuffleArray(takes);
        this.currentTakeIndex = 0;
        this.votes = [];
        this.showPhase('voting-phase');
        this.showNextTake();
    }

    showNextTake() {
        if (this.currentTakeIndex >= this.takes.length) {
            this.showResults();
            return;
        }

        const currentTake = this.takes[this.currentTakeIndex];
        const isOwnTake = currentTake.player_id === this.currentUser.id;

        document.getElementById('take-text').textContent = currentTake.take_text;
        document.getElementById('voting-progress').textContent = 
            `Take ${this.currentTakeIndex + 1} of ${this.takes.length}`;

        // Disable voting on own take
        document.querySelectorAll('.vote-btn').forEach(btn => {
            btn.disabled = isOwnTake;
        });

        if (isOwnTake) {
            setTimeout(() => {
                this.currentTakeIndex++;
                this.showNextTake();
            }, 3000);
        }
    }

    async submitVote(voteType) {
        const currentTake = this.takes[this.currentTakeIndex];

        try {
            await db.submitVote(
                this.currentRoom.code,
                this.currentRound.round_number,
                currentTake.id,
                this.currentUser.id,
                voteType
            );

            this.votes.push({
                take_id: currentTake.id,
                vote_type: voteType
            });

            this.currentTakeIndex++;
            this.showNextTake();
        } catch (error) {
            Utils.showNotification('Failed to submit vote', 'error');
        }
    }

    async showResults() {
        this.showPhase('results-phase');

        try {
            const votes = await db.getRoundVotes(this.currentRoom.code, this.currentRound.round_number);
            const results = this.calculateResults(votes);
            this.renderResults(results);
            this.updateScores(results);
        } catch (error) {
            Utils.showNotification('Failed to load results', 'error');
        }
    }

    calculateResults(votes) {
        const results = {};

        this.takes.forEach(take => {
            const takeVotes = votes.filter(v => v.take_id === take.id);
            const score = takeVotes.reduce((sum, vote) => sum + Utils.calculateScore(vote.vote_type), 0);

            results[take.player_id] = results[take.player_id] || { score: 0, takes: [] };
            results[take.player_id].score += score;
            results[take.player_id].takes.push({
                text: take.take_text,
                score: score,
                votes: takeVotes
            });
        });

        return results;
    }

    renderResults(results) {
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';

        Object.entries(results).forEach(([playerId, data]) => {
            const player = this.players.find(p => p.player_id === playerId);
            const isCurrentUser = playerId === this.currentUser.id;

            const resultDiv = document.createElement('div');
            resultDiv.className = `take-result ${isCurrentUser ? 'own-take' : ''}`;
            resultDiv.innerHTML = `
                <div class="font-semibold mb-2">${player?.username || 'Unknown'}</div>
                ${data.takes.map(take => `
                    <div class="mb-2 p-2 bg-gray-50 rounded">
                        <p class="text-sm">"${take.text}"</p>
                        <p class="text-xs text-gray-600">Score: ${take.score} points</p>
                    </div>
                `).join('')}
                <div class="font-bold">Total: ${data.score} points</div>
            `;
            resultsList.appendChild(resultDiv);
        });
    }

    async updateScores(results) {
        for (const [playerId, data] of Object.entries(results)) {
            try {
                await db.updatePlayerScore(playerId, this.currentRoom.topic_field, data.score);
            } catch (error) {
                console.error('Error updating score for player:', playerId, error);
            }
        }
    }

    nextRound() {
        // For now, just end the game after one round
        this.endGame();
    }

    endGame() {
        this.showPage('final-leaderboard');
        this.showFinalScores();
    }

    showFinalScores() {
        const finalScores = document.getElementById('final-scores');
        finalScores.innerHTML = '';

        // Calculate final scores from current round
        const sortedPlayers = this.players
            .map(player => ({ ...player, finalScore: player.score || 0 }))
            .sort((a, b) => b.finalScore - a.finalScore);

        sortedPlayers.forEach((player, index) => {
            const scoreDiv = document.createElement('div');
            scoreDiv.className = 'retro-card bg-white';
            scoreDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-semibold">${index + 1}. ${player.username}</span>
                    <span class="text-blue-600 font-bold">${player.finalScore} points</span>
                </div>
            `;
            finalScores.appendChild(scoreDiv);
        });
    }

    newGame() {
        this.currentRoom = null;
        this.currentRound = null;
        this.takes = [];
        this.votes = [];
        this.showPage('homepage');
    }

    // UI helpers
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });
        document.getElementById(pageId).classList.remove('hidden');
        this.gameState = pageId;
    }

    showPhase(phaseId) {
        document.querySelectorAll('.phase').forEach(phase => {
            phase.classList.add('hidden');
        });
        document.getElementById(phaseId).classList.remove('hidden');
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HeatedDotCom();
});