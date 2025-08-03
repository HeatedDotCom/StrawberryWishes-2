
import { supabase } from './supabase.js';

export class Database {
    // Room management
    async createRoom(hostId, topicField) {
        const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const room = {
            code: roomCode,
            host_id: hostId,
            topic_field: topicField,
            status: 'lobby',
            created_at: new Date().toISOString(),
            current_round: 0,
            max_rounds: 3
        };
        
        await supabase.insert('rooms', room);
        return roomCode;
    }

    async joinRoom(roomCode, playerId, username) {
        const room = await this.getRoom(roomCode);
        if (!room) throw new Error('Room not found');
        
        const player = {
            room_code: roomCode,
            player_id: playerId,
            username: username,
            ready: false,
            score: 0,
            joined_at: new Date().toISOString()
        };
        
        await supabase.insert('room_players', player);
        return room;
    }

    async getRoom(roomCode) {
        const rooms = await supabase.select('rooms', `code=eq.${roomCode}`);
        return rooms[0] || null;
    }

    async getRoomPlayers(roomCode) {
        return await supabase.select('room_players', `room_code=eq.${roomCode}`);
    }

    async updatePlayerReady(roomCode, playerId, ready) {
        return await supabase.update('room_players', 
            { ready }, 
            `room_code=eq.${roomCode}&player_id=eq.${playerId}`
        );
    }

    async updateRoomStatus(roomCode, status) {
        return await supabase.update('rooms', { status }, `code=eq.${roomCode}`);
    }

    // Game rounds
    async startRound(roomCode, word, definition, wordType) {
        const round = {
            room_code: roomCode,
            round_number: 1,
            word: word,
            definition: definition,
            word_type: wordType,
            status: 'writing',
            started_at: new Date().toISOString()
        };
        
        await supabase.insert('game_rounds', round);
        return round;
    }

    async submitTake(roomCode, roundNumber, playerId, takeText) {
        const take = {
            room_code: roomCode,
            round_number: roundNumber,
            player_id: playerId,
            take_text: takeText,
            submitted_at: new Date().toISOString()
        };
        
        await supabase.insert('takes', take);
    }

    async getRoundTakes(roomCode, roundNumber) {
        return await supabase.select('takes', 
            `room_code=eq.${roomCode}&round_number=eq.${roundNumber}`
        );
    }

    async submitVote(roomCode, roundNumber, takeId, voterId, voteType) {
        const vote = {
            room_code: roomCode,
            round_number: roundNumber,
            take_id: takeId,
            voter_id: voterId,
            vote_type: voteType,
            voted_at: new Date().toISOString()
        };
        
        await supabase.insert('votes', vote);
    }

    async getRoundVotes(roomCode, roundNumber) {
        return await supabase.select('votes', 
            `room_code=eq.${roomCode}&round_number=eq.${roundNumber}`
        );
    }

    // Leaderboard
    async updatePlayerScore(playerId, field, points) {
        const existing = await supabase.select('leaderboard', 
            `player_id=eq.${playerId}&field=eq.${field}`
        );
        
        if (existing.length > 0) {
            const newScore = existing[0].total_score + points;
            const newBasedness = existing[0].basedness_score + (points > 1 ? 1 : 0);
            await supabase.update('leaderboard', 
                { 
                    total_score: newScore, 
                    basedness_score: newBasedness,
                    games_played: existing[0].games_played + 1,
                    updated_at: new Date().toISOString()
                }, 
                `player_id=eq.${playerId}&field=eq.${field}`
            );
        } else {
            await supabase.insert('leaderboard', {
                player_id: playerId,
                field: field,
                total_score: points,
                basedness_score: points > 1 ? 1 : 0,
                games_played: 1,
                created_at: new Date().toISOString()
            });
        }
    }

    async getLeaderboard(field = 'all', limit = 10) {
        const query = field === 'all' ? 
            `select=*&order=total_score.desc&limit=${limit}` :
            `field=eq.${field}&order=total_score.desc&limit=${limit}`;
        
        return await supabase.select('leaderboard', query);
    }

    async leaveRoom(roomCode, playerId) {
        await supabase.delete('room_players', 
            `room_code=eq.${roomCode}&player_id=eq.${playerId}`
        );
    }

    async getAvailableRooms() {
        const rooms = await supabase.select('rooms', 'status=eq.lobby');
        const availableRooms = [];
        
        for (const room of rooms) {
            const players = await this.getRoomPlayers(room.code);
            if (players.length < 8) { // Assuming max 8 players per room
                availableRooms.push(room);
            }
        }
        
        return availableRooms;
    }
}

export const db = new Database();
