import bcrypt from 'bcryptjs';
import { supabase, isSupabaseConfigured } from '../src/config/supabaseClient.js';
import db from '../src/config/db.js';

async function createEstudanteModelo() {
  const nome = '(Estudante Modelo)';
  const email = 'estudante.modelo@aluno.ce.gov.br';
  const turma = 'Sem Turma';
  const senhaPlain = 'Agora@2026';
  const senhaHash = bcrypt.hashSync(senhaPlain, 10);

  console.log(`[Criando Estudante Modelo] Nome: ${nome} | Email: ${email}`);

  let userResult = null;

  if (isSupabaseConfigured) {
    const { data: existing, error: findError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (findError) {
      console.error('Erro ao buscar no Supabase:', findError.message);
    }

    if (existing) {
      console.log('Usuário já existe no Supabase (ID:', existing.id, '). Atualizando...');
      const { data, error } = await supabase
        .from('users')
        .update({
          nome,
          turma,
          senha_hash: senhaHash,
          role: 'ESTUDANTE'
        })
        .eq('id', existing.id)
        .select('id, nome, email, turma, role')
        .single();

      if (error) console.error('Erro ao atualizar Supabase:', error.message);
      else userResult = data;
    } else {
      // Inserir novo
      const { data, error } = await supabase
        .from('users')
        .insert({
          nome,
          email,
          turma,
          senha_hash: senhaHash,
          role: 'ESTUDANTE'
        })
        .select('id, nome, email, turma, role')
        .single();

      if (error) console.error('Erro ao inserir no Supabase:', error.message);
      else userResult = data;
    }
  }

  if (db) {
    try {
      const localExisting = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
      if (localExisting) {
        db.prepare('UPDATE users SET nome = ?, turma = ?, senha_hash = ?, role = ? WHERE id = ?')
          .run(nome, turma, senhaHash, 'ESTUDANTE', localExisting.id);
        console.log('Atualizado no SQLite local.');
      } else {
        db.prepare('INSERT INTO users (nome, email, senha_hash, role, turma) VALUES (?, ?, ?, ?, ?)')
          .run(nome, email, senhaHash, 'ESTUDANTE', turma);
        console.log('Inserido no SQLite local.');
      }
    } catch (dbErr) {
      console.warn('Aviso SQLite local:', dbErr.message);
    }
  }

  console.log('✅ Estudante Modelo configurado:', userResult);
}

createEstudanteModelo();
