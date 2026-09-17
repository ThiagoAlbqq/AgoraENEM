import { db } from '../db/db';

const API_BASE = '/api';

export const authService = {
  getToken() {
    return localStorage.getItem('agora_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('agora_token', token);
    } else {
      localStorage.removeItem('agora_token');
    }
  },

  async login(email, senha) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao realizar login.');
    }

    this.setToken(data.token);
    return data;
  },

  async register(userData) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao realizar cadastro.');
    }

    this.setToken(data.token);
    return data;
  },

  async getMe() {
    const token = this.getToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      this.setToken(null);
      return null;
    }

    const data = await response.json();
    return data.user;
  },

  logout() {
    this.setToken(null);
  },

  async getEstudantes() {
    const token = this.getToken();
    if (!token) return [];

    const response = await fetch(`${API_BASE}/auth/estudantes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.estudantes || [];
  },

  async syncLegacyToCloud() {
    const token = this.getToken();
    if (!token) throw new Error('É necessário estar autenticado como Admin para subir as correções.');

    // Fetch all local IndexedDB redações
    const localRedacoes = await db.redacoes.toArray();
    if (localRedacoes.length === 0) {
      return { insertedCount: 0, message: 'Nenhuma correção local no IndexedDB encontrada.' };
    }

    const response = await fetch(`${API_BASE}/redacoes/sync-legacy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ redacoes: localRedacoes })
    });

    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Erro na sincronização: o backend retornou uma página inválida em vez de dados (provavelmente está offline ou o servidor caiu).');
    }

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao sincronizar com a nuvem.');
    }

    return data;
  },

  async fetchCloudRedacoes() {
    const token = this.getToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE}/redacoes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.redacoes || [];
  },

  async validarRedacao(id, payload = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Apenas professores autenticados podem validar correções.');

    const response = await fetch(`${API_BASE}/redacoes/${id}/validar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao validar redação.');
    }

    return data;
  },

  async vincularAluno(id, payload = {}) {
    const token = this.getToken();
    if (!token) throw new Error('Apenas professores autenticados podem vincular redações.');

    const response = await fetch(`${API_BASE}/redacoes/${id}/vincular`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao vincular aluno.');
    }

    return data;
  },

  async clearAllRedacoes() {
    const token = this.getToken();
    if (!token) throw new Error('Apenas professores autenticados podem apagar redações.');

    const response = await fetch(`${API_BASE}/redacoes/clear-all`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao apagar redações.');
    }

    return data;
  }
};

