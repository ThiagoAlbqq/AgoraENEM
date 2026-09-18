import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    let user = null;
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (error) {
        console.error('[Supabase Auth Login Error]:', error.message);
      }
      user = data;
    }

    if (!user) {
      user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const isValidPassword = bcrypt.compareSync(senha, user.senha_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        turma: user.turma
      }
    });
  } catch (error) {
    console.error('[Auth Error Login]:', error);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
};

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { nome, email, senha, role = 'ESTUDANTE', turma = '' } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNome = nome.trim();
    const cleanTurma = turma.trim();

    if (isSupabaseConfigured) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado no sistema.' });
      }
    } else {
      const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
      if (existingUser) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado no sistema.' });
      }
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    const userRole = (role === 'ADMIN' && req.user?.role === 'ADMIN') ? 'ADMIN' : 'ESTUDANTE';

    let newUser = null;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          nome: cleanNome,
          email: cleanEmail,
          senha_hash: senhaHash,
          role: userRole,
          turma: cleanTurma
        })
        .select('id, nome, email, role, turma')
        .single();

      if (error) {
        throw new Error(`Erro no Supabase Register: ${error.message}`);
      }
      newUser = data;
    } else {
      const result = db.prepare(`
        INSERT INTO users (nome, email, senha_hash, role, turma)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanNome, cleanEmail, senhaHash, userRole, cleanTurma);

      newUser = {
        id: result.lastInsertRowid,
        nome: cleanNome,
        email: cleanEmail,
        role: userRole,
        turma: cleanTurma
      };
    }

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Cadastro realizado com sucesso!',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('[Auth Error Register]:', error);
    res.status(500).json({ error: 'Erro interno ao realizar cadastro.' });
  }
};

// GET /api/auth/me
export const getMe = (req, res) => {
  res.status(200).json({ user: req.user });
};

// GET /api/auth/estudantes (Admin list of students for assignment)
export const getEstudantes = async (req, res) => {
  try {
    let estudantes = [];

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('id, nome, email, turma, created_at')
        .eq('role', 'ESTUDANTE')
        .order('nome', { ascending: true });

      if (error) {
        console.error('[Supabase GetEstudantes Error]:', error.message);
      } else {
        estudantes = data || [];
      }
    }

    if (estudantes.length === 0) {
      estudantes = db.prepare(`
        SELECT id, nome, email, turma, created_at 
        FROM users 
        WHERE role = 'ESTUDANTE' 
        ORDER BY nome ASC
      `).all();
    }

    res.status(200).json({ estudantes });
  } catch (error) {
    console.error('[Auth Error GetEstudantes]:', error);
    res.status(500).json({ error: 'Erro ao buscar estudantes.' });
  }
};
