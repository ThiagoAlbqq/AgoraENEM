import db from '../config/db.js';

// POST /api/redacoes/sync-legacy
// Migrates legacy IndexedDB local evaluations to central SQLite cloud DB
export const syncLegacyRedacoes = (req, res) => {
  try {
    const { redacoes } = req.body;
    if (!Array.isArray(redacoes) || redacoes.length === 0) {
      return res.status(400).json({ error: 'Nenhuma redação fornecida para sincronização.' });
    }

    let insertedCount = 0;
    let skippedCount = 0;

    const checkStmt = db.prepare(`
      SELECT id FROM redacoes 
      WHERE nome_aluno = ? AND data_captura = ?
    `);

    const findUserStmt = db.prepare(`
      SELECT id FROM users 
      WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?)) AND role = 'ESTUDANTE'
    `);

    const insertStmt = db.prepare(`
      INSERT INTO redacoes (
        user_id, nome_aluno, turma_aluno, nome_detectado, data_captura,
        tipo_input, imagem_base64, texto_digitado, is_synced, extracted_data, nota_final,
        status_validacao, validado_por, data_validacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `);

    const syncTransaction = db.transaction((items) => {
      for (const item of items) {
        const nomeAluno = item.nome_aluno || item.nomeAluno || 'Aluno Não Identificado';
        const dataCaptura = item.data_captura || item.dataCaptura || new Date().toISOString();

        // Prevent duplicate syncs
        const existing = checkStmt.get(nomeAluno, dataCaptura);
        if (existing) {
          skippedCount++;
          continue;
        }

        // Try linking to an existing student user by exact name
        let userId = item.user_id || null;
        if (!userId && nomeAluno && nomeAluno.trim().length >= 3) {
          const matchedUser = findUserStmt.get(nomeAluno.trim());
          if (matchedUser) {
            userId = matchedUser.id;
          }
        }

        const extractedDataStr = typeof item.extracted_data === 'string'
          ? item.extracted_data
          : JSON.stringify(item.extracted_data || item.resultado || {});

        const notaFinal = item.nota_final || item.notaFinal || (item.extracted_data?.pontuacao_geral) || 0;
        const imagemBase64 = item.imagem_base64 || item.imagemBase64 || null;
        const textoDigitado = item.texto_digitado || item.textoDigitado || null;
        const tipoInput = item.tipo_input || item.tipoInput || 'imagem';
        const turmaAluno = item.turma_aluno || item.turmaAluno || 'Turma Geral';
        const nomeDetectado = item.nome_detectado ? 1 : 0;
        
        // Legacy items already corrected by Profa. Clara are marked VALIDADA
        const statusValidacao = item.status_validacao || 'VALIDADA';
        const validadoPor = req.user?.id || null;
        const dataValidacao = new Date().toISOString();

        insertStmt.run(
          userId,
          nomeAluno,
          turmaAluno,
          nomeDetectado,
          dataCaptura,
          tipoInput,
          imagemBase64,
          textoDigitado,
          extractedDataStr,
          notaFinal,
          statusValidacao,
          validadoPor,
          dataValidacao
        );
        insertedCount++;
      }
    });

    syncTransaction(redacoes);

    res.status(200).json({
      message: `${insertedCount} correções locais sincronizadas e disponibilizadas com sucesso! (${skippedCount} já existiam)`,
      insertedCount,
      skippedCount
    });
  } catch (error) {
    console.error('[Redacao Sync Error]:', error);
    res.status(500).json({ error: 'Falha ao sincronizar correções com a nuvem.' });
  }
};

// GET /api/redacoes
export const getRedacoes = (req, res) => {
  try {
    const user = req.user;
    let rows;

    if (user.role === 'ADMIN') {
      // Professor/Admin sees ALL redações (both validated and pending teacher review)
      rows = db.prepare(`
        SELECT r.*, u.email as user_email, v.nome as nome_validador
        FROM redacoes r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN users v ON r.validado_por = v.id
        ORDER BY r.data_captura DESC
      `).all();
    } else {
      // Student ONLY sees redações explicitly linked to their user_id (OR exact matching student name) AND validated by teacher!
      const cleanStudentName = (user.nome || '').trim();
      rows = db.prepare(`
        SELECT r.*, u.email as user_email, v.nome as nome_validador
        FROM redacoes r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN users v ON r.validado_por = v.id
        WHERE (r.user_id = ? 
           OR (r.user_id IS NULL AND LOWER(TRIM(r.nome_aluno)) = LOWER(TRIM(?))))
          AND r.status_validacao = 'VALIDADA'
        ORDER BY r.data_captura DESC
      `).all(user.id, cleanStudentName);
    }

    // Format output JSON
    const formatted = rows.map(row => {
      let extractedData = {};
      try {
        extractedData = JSON.parse(row.extracted_data || '{}');
      } catch (e) {
        extractedData = {};
      }

      return {
        id: row.id,
        user_id: row.user_id,
        nome_aluno: row.nome_aluno,
        turma_aluno: row.turma_aluno,
        nome_detectado: Boolean(row.nome_detectado),
        data_captura: row.data_captura,
        tipo_input: row.tipo_input,
        imagem_base64: row.imagem_base64,
        texto_digitado: row.texto_digitado,
        is_synced: Boolean(row.is_synced),
        extracted_data: extractedData,
        nota_final: row.nota_final,
        status_validacao: row.status_validacao || 'VALIDADA',
        validado_por: row.validado_por,
        nome_validador: row.nome_validador,
        data_validacao: row.data_validacao,
        user_email: row.user_email
      };
    });

    res.status(200).json({ redacoes: formatted });
  } catch (error) {
    console.error('[Get Redacoes Error]:', error);
    res.status(500).json({ error: 'Erro ao buscar redações.' });
  }
};

// POST /api/redacoes
export const createRedacao = (req, res) => {
  try {
    const {
      user_id,
      nome_aluno,
      turma_aluno,
      tipo_input,
      imagem_base64,
      texto_digitado,
      extracted_data,
      nota_final,
      status_validacao
    } = req.body;

    let targetUserId = user_id || null;
    if (!targetUserId && nome_aluno && nome_aluno.trim().length >= 3) {
      const cleanName = nome_aluno.trim();
      const matched = db.prepare(`
        SELECT id FROM users 
        WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?)) AND role = 'ESTUDANTE'
      `).get(cleanName);

      if (matched) targetUserId = matched.id;
    }

    const extractedDataStr = typeof extracted_data === 'string'
      ? extracted_data
      : JSON.stringify(extracted_data || {});

    // Default status: if uploaded by Admin directly, set to VALIDADA or PENDENTE_VALIDACAO
    const initialStatus = status_validacao || (req.user?.role === 'ADMIN' ? 'VALIDADA' : 'PENDENTE_VALIDACAO');
    const validadoPor = initialStatus === 'VALIDADA' ? req.user?.id : null;
    const dataValidacao = initialStatus === 'VALIDADA' ? new Date().toISOString() : null;

    const result = db.prepare(`
      INSERT INTO redacoes (
        user_id, nome_aluno, turma_aluno, nome_detectado, data_captura,
        tipo_input, imagem_base64, texto_digitado, is_synced, extracted_data, nota_final,
        status_validacao, validado_por, data_validacao
      ) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `).run(
      targetUserId,
      nome_aluno || 'Aluno Não Identificado',
      turma_aluno || 'Geral',
      tipo_input || 'imagem',
      imagem_base64 || null,
      texto_digitado || null,
      extractedDataStr,
      nota_final || (extracted_data?.pontuacao_geral) || 0,
      initialStatus,
      validadoPor,
      dataValidacao
    );

    res.status(201).json({
      message: 'Redação registrada com sucesso!',
      id: result.lastInsertRowid,
      status_validacao: initialStatus
    });
  } catch (error) {
    console.error('[Create Redacao Error]:', error);
    res.status(500).json({ error: 'Erro ao salvar redação.' });
  }
};

// PATCH /api/redacoes/:id/vincular
// Professor explicitly links a redação to a registered student account
export const vincularAlunoRedacao = (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, nome_aluno, turma_aluno } = req.body;

    const redacao = db.prepare('SELECT * FROM redacoes WHERE id = ?').get(id);
    if (!redacao) {
      return res.status(404).json({ error: 'Redação não encontrada.' });
    }

    let student = null;
    if (user_id) {
      student = db.prepare("SELECT id, nome, turma FROM users WHERE id = ? AND role = 'ESTUDANTE'").get(user_id);
    } else if (nome_aluno) {
      student = db.prepare("SELECT id, nome, turma FROM users WHERE LOWER(TRIM(nome)) = LOWER(TRIM(?)) AND role = 'ESTUDANTE'").get(nome_aluno.trim());
    }

    const finalUserId = student ? student.id : (user_id || null);
    const finalNomeAluno = student ? student.nome : (nome_aluno || redacao.nome_aluno);
    const finalTurmaAluno = student ? student.turma : (turma_aluno || redacao.turma_aluno);

    db.prepare(`
      UPDATE redacoes
      SET user_id = ?,
          nome_aluno = ?,
          turma_aluno = ?,
          nome_detectado = 1
      WHERE id = ?
    `).run(finalUserId, finalNomeAluno, finalTurmaAluno, id);

    res.status(200).json({
      message: `Redação ID #${id} vinculada ao aluno ${finalNomeAluno} com sucesso!`,
      user_id: finalUserId,
      nome_aluno: finalNomeAluno,
      turma_aluno: finalTurmaAluno
    });
  } catch (error) {
    console.error('[Vincular Aluno Error]:', error);
    res.status(500).json({ error: 'Erro ao vincular redação ao aluno.' });
  }
};

// PATCH /api/redacoes/:id/validar
// Professor validates/approves AI correction and releases it to the student
export const validarRedacao = (req, res) => {
  try {
    const { id } = req.params;
    const { nota_final, extracted_data, parecer_professor } = req.body;

    const current = db.prepare('SELECT * FROM redacoes WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ error: 'Redação não encontrada.' });
    }

    let updatedExtractedData = {};
    try {
      updatedExtractedData = JSON.parse(current.extracted_data || '{}');
    } catch (e) {
      updatedExtractedData = {};
    }

    if (extracted_data) {
      updatedExtractedData = { ...updatedExtractedData, ...extracted_data };
    }

    if (parecer_professor) {
      updatedExtractedData.parecer_professor = parecer_professor;
    }

    const finalNota = typeof nota_final === 'number' ? nota_final : current.nota_final;
    const extractedDataStr = JSON.stringify(updatedExtractedData);

    db.prepare(`
      UPDATE redacoes
      SET status_validacao = 'VALIDADA',
          validado_por = ?,
          data_validacao = CURRENT_TIMESTAMP,
          nota_final = ?,
          extracted_data = ?
      WHERE id = ?
    `).run(req.user.id, finalNota, extractedDataStr, id);

    res.status(200).json({
      message: 'Correção validada com sucesso pelo professor! Liberada para o aluno.',
      status_validacao: 'VALIDADA'
    });
  } catch (error) {
    console.error('[Validar Redacao Error]:', error);
    res.status(500).json({ error: 'Erro ao validar redação.' });
  }
};

// DELETE /api/redacoes/clear-all (Admin wipes all redações)
export const deleteAllRedacoes = (req, res) => {
  try {
    const result = db.prepare('DELETE FROM redacoes').run();
    res.status(200).json({
      message: 'Todas as redações foram apagadas com sucesso.',
      count: result.changes
    });
  } catch (error) {
    console.error('[Delete All Redacoes Error]:', error);
    res.status(500).json({ error: 'Erro ao apagar redações.' });
  }
};

// DELETE /api/redacoes/:id
export const deleteRedacao = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM redacoes WHERE id = ?').run(id);
    res.status(200).json({ message: 'Redação excluída com sucesso.' });
  } catch (error) {
    console.error('[Delete Redacao Error]:', error);
    res.status(500).json({ error: 'Erro ao excluir redação.' });
  }
};

// GET /api/export-db or /api/redacoes/export-db
// Exports full SQLite DB (users + redacoes) as JSON backup download
export const exportDatabase = (req, res) => {
  try {
    const users = db.prepare('SELECT id, nome, email, senha_hash, role, turma, created_at FROM users').all();
    const redacoes = db.prepare('SELECT * FROM redacoes').all();

    const formattedRedacoes = redacoes.map(r => {
      let ext = r.extracted_data;
      if (typeof ext === 'string') {
        try { ext = JSON.parse(ext); } catch(e) {}
      }
      return {
        ...r,
        extracted_data: ext
      };
    });

    const backup = {
      exported_at: new Date().toISOString(),
      counts: {
        users: users.length,
        redacoes: formattedRedacoes.length
      },
      users,
      redacoes: formattedRedacoes
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="agora-db-backup.json"');
    return res.status(200).send(JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('[Export DB Error]:', error);
    return res.status(500).json({ error: 'Falha ao exportar banco de dados.', details: error.message });
  }
};

