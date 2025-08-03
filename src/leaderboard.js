
import { db } from './db.js';
import { Utils } from './utils.js';

class Leaderboard {
    constructor() {
        this.currentField = 'all';
        this.bindEvents();
        this.loadLeaderboard();
    }

    bindEvents() {
        document.getElementById('field-filter').addEventListener('change', (e) => {
            this.currentField = e.target.value;
            this.loadLeaderboard();
        });
    }

    async loadLeaderboard() {
        try {
            const leaderboardData = await db.getLeaderboard(this.currentField, 10);
            this.renderLeaderboard(leaderboardData);
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            Utils.showNotification('Failed to load leaderboard', 'error');
        }
    }

    renderLeaderboard(data) {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '';

        if (data.length === 0) {
            leaderboardList.innerHTML = `
                <div class="retro-card text-center text-gray-600">
                    No players found for this field yet.
                </div>
            `;
            return;
        }

        data.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'retro-card bg-white';
            
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            
            playerDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                        <span class="text-2xl">${rankEmoji}</span>
                        <div>
                            <div class="font-semibold text-lg">${player.player_id.replace('anon_', 'Anonymous_')}</div>
                            <div class="text-sm text-gray-600">
                                ${player.field} • ${player.games_played} games played
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-bold text-blue-600">${player.total_score}</div>
                        <div class="text-sm text-gray-600">
                            🔥 ${player.basedness_score} basedness
                        </div>
                    </div>
                </div>
            `;
            
            leaderboardList.appendChild(playerDiv);
        });
    }
}

// Initialize leaderboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Leaderboard();
});
