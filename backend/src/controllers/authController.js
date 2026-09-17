import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

// POST /api/auth/login
export const login = (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
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
export const register = (req, res) => {
  try {
    const { nome, email, senha, role = 'ESTUDANTE', turma = '' } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado no sistema.' });
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    const userRole = (role === 'ADMIN' && req.user?.role === 'ADMIN') ? 'ADMIN' : 'ESTUDANTE';

    const result = db.prepare(`
      INSERT INTO users (nome, email, senha_hash, role, turma)
      VALUES (?, ?, ?, ?, ?)
    `).run(nome.trim(), email.trim().toLowerCase(), senhaHash, userRole, turma.trim());

    const newUser = {
      id: result.lastInsertRowid,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      role: userRole,
      turma: turma.trim()
    };

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
export const getEstudantes = (req, res) => {
  try {
    const estudantes = db.prepare(`
      SELECT id, nome, email, turma, created_at 
      FROM users 
      WHERE role = 'ESTUDANTE' 
      ORDER BY nome ASC
    `).all();
    res.status(200).json({ estudantes });
  } catch (error) {
    console.error('[Auth Error GetEstudantes]:', error);
    res.status(500).json({ error: 'Erro ao buscar estudantes.' });
  }
};
