/**
 * Personal AI Vault - Client API Service
 */

const API_BASE = '/api';

export const api = {
  getToken() {
    return localStorage.getItem('vault_auth_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('vault_auth_token', token);
    } else {
      localStorage.removeItem('vault_auth_token');
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('vault:unauthorized'));
      }
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  },

  // Auth
  auth: {
    async register(username, email, password) {
      const res = await api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });
      if (res.token) api.setToken(res.token);
      return res;
    },

    async login(identifier, password) {
      const res = await api.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
      });
      if (res.token) api.setToken(res.token);
      return res;
    },

    async getMe() {
      return await api.request('/auth/me');
    },

    logout() {
      api.setToken(null);
    }
  },

  // Files
  files: {
    async list(type = 'all') {
      const query = type && type !== 'all' ? `?type=${type}` : '';
      return await api.request(`/files${query}`);
    },

    async get(id) {
      return await api.request(`/files/${id}`);
    },

    async upload(fileList, onProgress) {
      const formData = new FormData();
      for (const file of fileList) {
        formData.append('files', file);
      }

      return await api.request('/files/upload', {
        method: 'POST',
        body: formData
      });
    },

    async delete(id) {
      return await api.request(`/files/${id}`, {
        method: 'DELETE'
      });
    },

    getContentUrl(id, isDownload = false) {
      const token = api.getToken();
      return `${API_BASE}/files/${id}/content?token=${encodeURIComponent(token || '')}${isDownload ? '&download=1' : ''}`;
    }
  },

  // Notes
  notes: {
    async create(title, content, tags = []) {
      return await api.request('/notes', {
        method: 'POST',
        body: JSON.stringify({ title, content, tags })
      });
    },

    async update(id, title, content, tags) {
      return await api.request(`/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, content, tags })
      });
    }
  },

  // Credentials & Passwords
  credentials: {
    async create({ title, username, password, url, notes, tags = [] }) {
      return await api.request('/credentials', {
        method: 'POST',
        body: JSON.stringify({ title, username, password, url, notes, tags })
      });
    }
  },

  // Search & AI RAG
  search: {
    async fullText(query) {
      return await api.request(`/search?q=${encodeURIComponent(query)}`);
    },

    async askAi(question) {
      return await api.request('/search/ai', {
        method: 'POST',
        body: JSON.stringify({ question })
      });
    }
  },

  // Status Diagnostics
  status: {
    async getStatus() {
      return await api.request('/status');
    }
  }
};
