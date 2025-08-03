
// Supabase configuration
const SUPABASE_URL = 'https://ylfzwxtrkxiitmldysso.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsZnp3eHRya3hpaXRtbGR5c3NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDk0MzksImV4cCI6MjA2OTc4NTQzOX0.1ESXlg-d6O2yY2ogwQ7i9I4iGB3LFyIovV0Dlp4uuAw';

class SupabaseClient {
    constructor() {
        this.url = SUPABASE_URL;
        this.key = SUPABASE_ANON_KEY;
        this.currentUser = null;
        this.headers = {
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        };
    }

    async signUp(email, password, username) {
        const response = await fetch(`${this.url}/auth/v1/signup`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ 
                email, 
                password,
                options: {
                    data: { username }
                }
            })
        });
        return await response.json();
    }

    async signIn(email, password) {
        const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        if (result.access_token) {
            this.currentUser = result.user;
            this.headers.Authorization = `Bearer ${result.access_token}`;
            localStorage.setItem('supabase_token', result.access_token);
            localStorage.setItem('supabase_user', JSON.stringify(result.user));
        }
        return result;
    }

    async signInAnonymously() {
        const anonymousUser = {
            id: 'anon_' + Math.random().toString(36).substr(2, 9),
            email: null,
            username: 'Anonymous_' + Math.random().toString(36).substr(2, 5)
        };
        this.currentUser = anonymousUser;
        localStorage.setItem('supabase_user', JSON.stringify(anonymousUser));
        return { user: anonymousUser };
    }

    async signOut() {
        this.currentUser = null;
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('supabase_user');
        this.headers.Authorization = `Bearer ${this.key}`;
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const storedUser = localStorage.getItem('supabase_user');
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
                const token = localStorage.getItem('supabase_token');
                if (token) {
                    this.headers.Authorization = `Bearer ${token}`;
                }
            }
        }
        return this.currentUser;
    }

    async insert(table, data) {
        const response = await fetch(`${this.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async select(table, query = '') {
        const response = await fetch(`${this.url}/rest/v1/${table}?${query}`, {
            method: 'GET',
            headers: this.headers
        });
        return await response.json();
    }

    async update(table, data, query) {
        const response = await fetch(`${this.url}/rest/v1/${table}?${query}`, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        return await response.json();
    }

    async delete(table, query) {
        const response = await fetch(`${this.url}/rest/v1/${table}?${query}`, {
            method: 'DELETE',
            headers: this.headers
        });
        return await response.json();
    }
}

export const supabase = new SupabaseClient();
