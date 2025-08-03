
// API configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class Utils {
    static async generateWord(topicField) {
        const prompts = {
            politics: "Generate a challenging political vocabulary word that would spark good debate. Return only: word|definition|type (noun/verb/adjective)",
            philosophy: "Generate a challenging philosophical vocabulary word that would spark good debate. Return only: word|definition|type (noun/verb/adjective)", 
            social: "Generate a challenging social issues vocabulary word that would spark good debate. Return only: word|definition|type (noun/verb/adjective)",
            random: "Generate any challenging vocabulary word that would spark good debate. Return only: word|definition|type (noun/verb/adjective)"
        };

        try {
            const response = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'mistralai/mistral-7b-instruct:free',
                    messages: [{
                        role: 'user',
                        content: prompts[topicField] || prompts.random
                    }],
                    max_tokens: 100
                })
            });

            const data = await response.json();
            const result = data.choices[0].message.content.trim();
            const [word, definition, type] = result.split('|');
            
            return {
                word: word.trim(),
                definition: definition.trim(),
                type: type.trim()
            };
        } catch (error) {
            console.error('Error generating word:', error);
            // Fallback words
            const fallbacks = {
                politics: { word: "hegemony", definition: "dominance or influence of one group over others", type: "noun" },
                philosophy: { word: "nihilism", definition: "the belief that life is meaningless", type: "noun" },
                social: { word: "ostracize", definition: "to exclude someone from a group", type: "verb" },
                random: { word: "ephemeral", definition: "lasting for a very short time", type: "adjective" }
            };
            return fallbacks[topicField] || fallbacks.random;
        }
    }

    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static calculateScore(voteType) {
        const scores = {
            'fire': 2,
            'ok': 1,
            'bad': 0
        };
        return scores[voteType] || 0;
    }

    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    static generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        }
    }

    static showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'error' ? 'bg-red-500' : 
            type === 'success' ? 'bg-green-500' : 'bg-blue-500'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}
