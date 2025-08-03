
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
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-600">
                        No players found for this field yet.
                    </td>
                </tr>
            `;
            return;
        }

        data.forEach((player, index) => {
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
            
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const rankText = rankEmoji || `#${index + 1}`;
            
            row.innerHTML = `
                <td class="px-6 py-4 font-medium text-gray-900">
                    <span class="text-lg">${rankText}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="font-semibold text-gray-900">${player.player_id.replace('anon_', 'Anonymous_')}</div>
                </td>
                <td class="px-6 py-4 text-gray-600 capitalize">${player.field}</td>
                <td class="px-6 py-4 text-center font-bold text-blue-600 text-lg">${player.total_score}</td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        🔥 ${player.basedness_score}
                    </span>
                </td>
                <td class="px-6 py-4 text-center text-gray-600">${player.games_played}</td>
            `;
            
            leaderboardList.appendChild(row);
        });
    }
}

// Initialize leaderboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Leaderboard();
});
