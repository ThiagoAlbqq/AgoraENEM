import bcrypt from 'bcryptjs';
import { supabase } from '../src/config/supabaseClient.js';

async function verify() {
  const email = 'isabele.oliveira30@aluno.ce.gov.br';
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .single();

  if (error || !user) {
    console.error('Erro ao buscar:', error);
    return;
  }

  console.log('✅ Verificado com sucesso no Supabase:', {
    id: user.id,
    nome: user.nome,
    email: user.email,
    turma: user.turma,
    role: user.role,
    senhaCorreta: bcrypt.compareSync('Agora@2026', user.senha_hash)
  });
}

verify();
