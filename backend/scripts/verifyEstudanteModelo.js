import bcrypt from 'bcryptjs';
import { supabase } from '../src/config/supabaseClient.js';

async function verifyLogin() {
  const email = 'estudante.modelo@aluno.ce.gov.br';
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .single();

  if (error || !user) {
    console.error('User not found:', error);
    return;
  }

  const matches = bcrypt.compareSync('Agora@2026', user.senha_hash);
  console.log('Login verification for Estudante Modelo:', {
    id: user.id,
    nome: user.nome,
    email: user.email,
    turma: user.turma,
    role: user.role,
    passwordMatches: matches
  });
}

verifyLogin();
