import bcrypt from 'bcryptjs';
import { supabase } from '../src/config/supabaseClient.js';
import db from '../src/config/db.js';

async function updateEmailEstudanteModelo() {
  const targetEmail = 'isabele.oliveira30@aluno.ce.gov.br';
  const oldEmail = 'estudante.modelo@aluno.ce.gov.br';
  const nome = '(Estudante Modelo)';
  const turma = 'Sem Turma';
  const senhaPlain = 'Agora@2026';
  const senhaHash = bcrypt.hashSync(senhaPlain, 10);

  console.log(`[Configurando Estudante Modelo] Email: ${targetEmail}`);

  // 1. Verificar se já existe targetEmail no Supabase
  const { data: existingTarget } = await supabase
    .from('users')
    .select('*')
    .ilike('email', targetEmail)
    .maybeSingle();

  let result = null;
  if (existingTarget) {
    console.log('E-mail já existia (ID:', existingTarget.id, '). Atualizando para Estudante Modelo...');
    const { data, error } = await supabase
      .from('users')
      .update({
        nome,
        turma,
        senha_hash: senhaHash,
        role: 'ESTUDANTE'
      })
      .eq('id', existingTarget.id)
      .select('id, nome, email, turma, role')
      .single();
    if (error) console.error('Erro ao atualizar Supabase:', error.message);
    else result = data;
  } else {
    // Verificar se existe o temporário oldEmail e renomear o email dele
    const { data: existingOld } = await supabase
      .from('users')
      .select('*')
      .ilike('email', oldEmail)
      .maybeSingle();

    if (existingOld) {
      console.log('Atualizando registro temporário existente (ID:', existingOld.id, ')...');
      const { data, error } = await supabase
        .from('users')
        .update({
          nome,
          email: targetEmail,
          turma,
          senha_hash: senhaHash,
          role: 'ESTUDANTE'
        })
        .eq('id', existingOld.id)
        .select('id, nome, email, turma, role')
        .single();
      if (error) console.error('Erro ao atualizar Supabase:', error.message);
      else result = data;
    } else {
      console.log('Inserindo novo registro no Supabase...');
      const { data, error } = await supabase
        .from('users')
        .insert({
          nome,
          email: targetEmail,
          turma,
          senha_hash: senhaHash,
          role: 'ESTUDANTE'
        })
        .select('id, nome, email, turma, role')
        .single();
      if (error) console.error('Erro ao inserir no Supabase:', error.message);
      else result = data;
    }
  }

  // 2. Se sobrou o oldEmail no Supabase por algum motivo, remover
  await supabase.from('users').delete().ilike('email', oldEmail);

  // 3. SQLite local
  if (db) {
    try {
      db.prepare('DELETE FROM users WHERE LOWER(email) = LOWER(?)').run(oldEmail);
      const loc = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(targetEmail);
      if (loc) {
        db.prepare('UPDATE users SET nome = ?, turma = ?, senha_hash = ?, role = ? WHERE id = ?')
          .run(nome, turma, senhaHash, 'ESTUDANTE', loc.id);
      } else {
        db.prepare('INSERT INTO users (nome, email, senha_hash, role, turma) VALUES (?, ?, ?, ?, ?)')
          .run(nome, targetEmail, senhaHash, 'ESTUDANTE', turma);
      }
      console.log('SQLite local sincronizado.');
    } catch (err) {
      console.warn('Aviso SQLite local:', err.message);
    }
  }

  console.log('✅ Estudante Modelo atualizado com sucesso:', result);
}

updateEmailEstudanteModelo();
