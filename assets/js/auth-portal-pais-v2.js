/**
 * Sistema de Autenticação para Portal dos Pais - Versão Simplificada
 * Abordagem diferente para contornar problemas do Supabase Auth
 */

class AuthPortalPaisV2 {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
        this.currentResponsavel = null;
    }

    /**
     * Cadastro simplificado - cria direto no banco sem Supabase Auth
     */
    async criarContaSimplificada(cpf, nome, codigoAluno, parentesco, senha) {
        try {
            const cpfLimpo = cpf.replace(/\D/g, '');
            
            console.log('🔐 Iniciando cadastro simplificado:', { cpfLimpo, nome, codigoAluno, parentesco });

            // 1. Verificar se CPF já existe
            const { data: cpfExistente } = await this.supabase
                .from('responsaveis')
                .select('id')
                .eq('cpf', cpfLimpo)
                .single();

            if (cpfExistente) {
                throw new Error('CPF já cadastrado. Use a opção de login normal.');
            }

            // 2. Verificar se o aluno existe - tentativa com RPC ou query direta
            let aluno = null;
            let alunoExiste = false;
            
            // Primeira tentativa: query normal
            try {
                const { data: alunoData, error: alunoError } = await this.supabase
                    .from('alunos')
                    .select('codigo, "Nome completo", turma')
                    .eq('codigo', parseInt(codigoAluno))
                    .single();

                if (!alunoError && alunoData) {
                    aluno = alunoData;
                    alunoExiste = true;
                    console.log('✅ Aluno encontrado:', aluno);
                }
            } catch (err) {
                console.log('⚠️ Primeira tentativa falhou, tentando verificação alternativa...');
            }

            // Segunda tentativa: verificar apenas se o código existe (query simplificada)
            if (!alunoExiste) {
                try {
                    const { count, error: countError } = await this.supabase
                        .from('alunos')
                        .select('codigo', { count: 'exact', head: true })
                        .eq('codigo', parseInt(codigoAluno));

                    if (!countError && count > 0) {
                        alunoExiste = true;
                        console.log('✅ Aluno confirmado existir (verificação por contagem)');
                    }
                } catch (err) {
                    console.log('⚠️ Verificação por contagem também falhou');
                }
            }

            // Se ainda não confirmou, vamos tentar criar mesmo assim
            // A FK vai validar se o aluno existe
            if (!alunoExiste) {
                console.log('⚠️ Não foi possível verificar o aluno devido às políticas RLS.');
                console.log('📝 Tentaremos criar a associação - o banco validará se o aluno existe.');
            }

            // 3. Criar hash simples da senha
            const senhaHash = btoa(senha + cpfLimpo);

            // 4. Criar responsável
            const { data: novoResponsavel, error: responsavelError } = await this.supabase
                .from('responsaveis')
                .insert({
                    cpf: cpfLimpo,
                    nome: nome,
                    email: `${cpfLimpo}@portal.pais.local`,
                    telefone: '',
                    senha_hash: senhaHash,
                    ativo: true
                })
                .select('id')
                .single();

            if (responsavelError) {
                console.error('❌ Erro ao criar responsável:', responsavelError);
                
                // Tratar erro de duplicação
                if (responsavelError.code === '23505' || responsavelError.message.includes('duplicate')) {
                    throw new Error('CPF já cadastrado no sistema.');
                }
                
                throw new Error('Erro ao criar conta. Por favor, tente novamente.');
            }

            console.log('✅ Responsável criado com ID:', novoResponsavel.id);

            // 5. Criar associação com o aluno
            console.log('🔗 Criando vínculo com aluno código:', codigoAluno);

            const { data: associacaoData, error: associacaoError } = await this.supabase
                .from('responsavel_aluno')
                .insert({
                    responsavel_id: novoResponsavel.id,
                    aluno_codigo: parseInt(codigoAluno),
                    parentesco: parentesco,
                    autorizado_retirar: true,
                    autorizado_ver_notas: true,
                    autorizado_ver_frequencia: true,
                    autorizado_ver_disciplinar: true
                })
                .select()
                .single();

            if (associacaoError) {
                console.error('❌ Erro ao criar vínculo:', associacaoError);
                
                // Se falhou por causa de FK (aluno não existe), limpar responsável criado
                if (associacaoError.code === '23503' || 
                    associacaoError.message.includes('foreign key') || 
                    associacaoError.message.includes('violates') ||
                    associacaoError.message.includes('aluno_codigo')) {
                    
                    // Remover responsável órfão
                    await this.supabase
                        .from('responsaveis')
                        .delete()
                        .eq('id', novoResponsavel.id);
                    
                    throw new Error(`Código do aluno ${codigoAluno} não encontrado. Verifique se o código está correto.`);
                }
                
                // Se foi erro de duplicação (já existe vínculo)
                if (associacaoError.code === '23505' || associacaoError.message.includes('duplicate')) {
                    // Não é erro crítico, o responsável foi criado
                    console.log('⚠️ Vínculo já existia, mas conta foi criada');
                } else {
                    // Outro erro - remover responsável
                    await this.supabase
                        .from('responsaveis')
                        .delete()
                        .eq('id', novoResponsavel.id);
                    
                    throw new Error('Erro ao vincular com aluno. Tente novamente.');
                }
            } else {
                console.log('✅ Vínculo criado com sucesso:', associacaoData);
            }

            // 6. Mensagem de sucesso personalizada
            let mensagemSucesso = 'Conta criada com sucesso! ';
            
            if (aluno) {
                mensagemSucesso += `Você foi vinculado ao aluno ${aluno['Nome completo']}`;
                if (aluno.turma) {
                    mensagemSucesso += ` (Turma: ${aluno.turma})`;
                }
            } else {
                mensagemSucesso += `Você foi vinculado ao aluno de código ${codigoAluno}`;
            }
            
            mensagemSucesso += '. Agora você pode fazer login com seu CPF e senha.';

            return {
                success: true,
                message: mensagemSucesso
            };

        } catch (error) {
            console.error('❌ Erro no cadastro:', error);
            return {
                success: false,
                error: error.message || 'Erro ao criar conta. Tente novamente.'
            };
        }
    }

    /**
     * Login simplificado - verifica senha hash
     */
    async loginSimplificado(cpf, senha) {
        try {
            const cpfLimpo = cpf.replace(/\D/g, '');
            const senhaHash = btoa(senha + cpfLimpo);

            console.log('🔐 Tentando login simplificado:', cpfLimpo);

            // Buscar responsável
            const { data: responsavel, error } = await this.supabase
                .from('responsaveis')
                .select('id, cpf, nome, email, senha_hash, ativo')
                .eq('cpf', cpfLimpo)
                .eq('ativo', true)
                .single();

            if (error || !responsavel) {
                throw new Error('CPF não encontrado ou inativo');
            }

            // Verificar senha
            if (responsavel.senha_hash !== senhaHash) {
                throw new Error('Senha incorreta');
            }

            // Salvar dados
            this.currentResponsavel = responsavel;
            
            localStorage.setItem('portal_pais_auth', JSON.stringify({
                id: responsavel.id,
                nome: responsavel.nome,
                cpf: responsavel.cpf,
                loginTime: Date.now()
            }));

            console.log('✅ Login realizado:', responsavel.nome);

            return {
                success: true,
                responsavel: responsavel,
                message: 'Login realizado com sucesso'
            };

        } catch (error) {
            console.error('❌ Erro no login:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar se está autenticado
     */
    async isAuthenticated() {
        const authData = localStorage.getItem('portal_pais_auth');
        if (!authData) return false;

        try {
            const data = JSON.parse(authData);
            
            // Verificar se não expirou (24 horas)
            if (Date.now() - data.loginTime > 24 * 60 * 60 * 1000) {
                this.logout();
                return false;
            }

            this.currentResponsavel = data;
            return true;

        } catch (error) {
            this.logout();
            return false;
        }
    }

    /**
     * Buscar alunos do responsável com dados REAIS
     */
    async getAlunos() {
        if (!await this.isAuthenticated()) {
            throw new Error('Não autenticado');
        }

        try {
            console.log('🔍 Buscando alunos para responsável ID:', this.currentResponsavel.id);
            
            // Buscar associações do responsável
            const { data: associacoes, error: assocError } = await this.supabase
                .from('responsavel_aluno')
                .select(`
                    aluno_codigo,
                    parentesco,
                    autorizado_ver_notas,
                    autorizado_ver_frequencia,
                    autorizado_ver_disciplinar
                `)
                .eq('responsavel_id', this.currentResponsavel.id);

            console.log('📋 Associações encontradas:', associacoes);

            if (assocError) {
                console.error('❌ Erro ao buscar associações:', assocError);
                return [];
            }

            if (!associacoes || associacoes.length === 0) {
                console.warn('⚠️ Nenhuma associação encontrada para responsável ID:', this.currentResponsavel.id);
                return [];
            }

            // Buscar dados dos alunos
            const codigosAlunos = associacoes.map(a => a.aluno_codigo);
            console.log('🔍 Buscando dados dos alunos com códigos:', codigosAlunos);
            
            const { data: alunos, error: alunosError } = await this.supabase
                .from('alunos')
                .select('codigo, "Nome completo", turma')
                .in('codigo', codigosAlunos);

            if (alunosError) {
                console.error('❌ Erro ao buscar alunos:', alunosError);
                return [];
            }

            if (!alunos || alunos.length === 0) {
                console.warn('⚠️ Nenhum aluno encontrado com os códigos:', codigosAlunos);
                return [];
            }

            console.log('👥 Alunos encontrados:', alunos);

            // Buscar estatísticas agregadas (frequência e medidas)
            const hoje = new Date();
            const inicioAno = new Date(hoje.getFullYear(), 1, 1).toISOString().split('T')[0]; // Fevereiro como início do ano letivo
            
            // Buscar TODAS as frequências do ano para calcular corretamente
            const { data: frequencias } = await this.supabase
                .from('frequencia')
                .select('codigo_aluno, status, data')
                .in('codigo_aluno', codigosAlunos)
                .gte('data', inicioAno);

            // Buscar medidas disciplinares
            const { data: medidas } = await this.supabase
                .from('medidas')
                .select('codigo_aluno, tipo_medida')
                .in('codigo_aluno', codigosAlunos);

            // Calcular estatísticas por aluno
            const estatisticas = {};
            
            // Calcular frequência CORRETAMENTE
            console.log('🔍 DADOS BRUTOS de frequência:', frequencias);
            
            if (frequencias) {
                frequencias.forEach(f => {
                    if (!estatisticas[f.codigo_aluno]) {
                        estatisticas[f.codigo_aluno] = { 
                            total: 0, 
                            presentes: 0, 
                            faltas: 0,
                            atestados: 0,
                            medidas: 0, 
                            pontos: 0 
                        };
                    }
                    estatisticas[f.codigo_aluno].total++;
                    
                    console.log(`🔍 Processando registro: Aluno ${f.codigo_aluno}, Status: '${f.status}', Data: ${f.data}`);
                    
                    // Contar corretamente os status - incluir TODOS os valores possíveis
                    if (f.status === 'presente' || f.status === 'p' || f.status === 'P') {
                        estatisticas[f.codigo_aluno].presentes++;
                    } else if (f.status === 'ausente' || f.status === 'falta' || f.status === 'falta_controlada' || f.status === 'f' || f.status === 'F' || f.status === 'fc' || f.status === 'FC') {
                        estatisticas[f.codigo_aluno].faltas++;
                    } else if (f.status === 'atestado' || f.status === 'a' || f.status === 'A') {
                        estatisticas[f.codigo_aluno].atestados++;
                        // ATESTADO NÃO conta como presença para cálculo de frequência
                    } else {
                        console.warn(`⚠️ Status desconhecido encontrado: '${f.status}' para aluno ${f.codigo_aluno}`);
                    }
                });
            }
            
            console.log('📊 Estatísticas processadas:', estatisticas);

            // Calcular medidas e pontos
            if (medidas) {
                medidas.forEach(m => {
                    if (!estatisticas[m.codigo_aluno]) {
                        estatisticas[m.codigo_aluno] = { total: 0, presentes: 0, medidas: 0, pontos: 0 };
                    }
                    estatisticas[m.codigo_aluno].medidas++;
                    
                    // Calcular pontos baseado no tipo de medida
                    let pontos = 0;
                    const tipoMedida = m.tipo_medida?.toLowerCase() || '';
                    
                    // Medidas positivas reduzem pontos
                    if (tipoMedida.includes('elogio') || tipoMedida.includes('positivo')) {
                        pontos = -1;
                    } 
                    // Medidas negativas aumentam pontos
                    else if (tipoMedida.includes('advertência') || tipoMedida.includes('oral')) {
                        pontos = 1;
                    } else if (tipoMedida.includes('escrita')) {
                        pontos = 2;
                    } else if (tipoMedida.includes('suspensão')) {
                        pontos = 3;
                    }
                    
                    estatisticas[m.codigo_aluno].pontos += pontos;
                });
            }

            // Buscar notas disciplinares REAIS da view
            const { data: notasDisciplinares } = await this.supabase
                .from('v_nota_disciplinar_atual')
                .select('codigo_aluno, nota_atual')
                .in('codigo_aluno', codigosAlunos);

            console.log('📊 Notas disciplinares do banco:', notasDisciplinares);

            // Combinar todos os dados
            const resultado = alunos.map(aluno => {
                const associacao = associacoes.find(a => a.aluno_codigo === aluno.codigo);
                const stats = estatisticas[aluno.codigo] || { 
                    total: 0, 
                    presentes: 0, 
                    faltas: 0, 
                    atestados: 0, 
                    medidas: 0, 
                    pontos: 0 
                };
                
                // FREQUÊNCIA CORRETA: presentes / total_registros * 100
                const percentualFrequencia = stats.total > 0 
                    ? Math.round((stats.presentes / stats.total) * 100)
                    : 100; // Se não tem registros, assume 100%
                
                // PERCENTUAL DE FALTAS: faltas / total_registros * 100  
                const percentualFaltas = stats.total > 0 
                    ? Math.round((stats.faltas / stats.total) * 100)
                    : 0;
                
                // NOTA DISCIPLINAR REAL do banco (não calculada)
                const notaBanco = notasDisciplinares?.find(n => n.codigo_aluno === aluno.codigo);
                const notaDisciplinar = notaBanco ? 
                    parseFloat(notaBanco.nota_atual).toFixed(1) : 
                    Math.max(0, 10 - (stats.pontos * 0.5)).toFixed(1);
                
                console.log(`📊 DADOS CORRIGIDOS - Aluno ${aluno.codigo}:
                    ✅ Presenças: ${stats.presentes}
                    ❌ Faltas: ${stats.faltas} 
                    📋 Atestados: ${stats.atestados}
                    📚 Total aulas: ${stats.total}
                    📊 % Frequência: ${percentualFrequencia}% (${stats.presentes}/${stats.total})
                    🎯 Nota Disciplinar: ${notaDisciplinar} ${notaBanco ? '(REAL do banco)' : '(calculada)'}
                    📜 Medidas: ${stats.medidas}`);
                
                return {
                    codigo: aluno.codigo,
                    nome_completo: aluno['Nome completo'],
                    turma: aluno.turma,
                    parentesco: associacao?.parentesco || 'responsável',
                    percentual_frequencia: percentualFrequencia,
                    percentual_faltas: percentualFaltas,
                    nota_disciplinar: notaDisciplinar,
                    total_medidas: stats.medidas,
                    total_presencas: stats.presentes,
                    total_faltas: stats.faltas,
                    total_atestados: stats.atestados,
                    total_registros: stats.total,
                    autorizado_ver_notas: associacao?.autorizado_ver_notas || false,
                    autorizado_ver_frequencia: associacao?.autorizado_ver_frequencia || false,
                    autorizado_ver_disciplinar: associacao?.autorizado_ver_disciplinar || false
                };
            });
            
            console.log('✅ Dados completos dos alunos:', resultado);
            return resultado;

        } catch (error) {
            console.error('❌ Erro ao buscar alunos:', error);
            return [];
        }
    }

    /**
     * Buscar dados completos de um aluno (compatível com sistema antigo)
     */
    async getDadosAluno(codigoAluno) {
        if (!await this.isAuthenticated()) {
            throw new Error('Não autenticado');
        }

        try {
            // Verificar se tem acesso ao aluno
            const alunos = await this.getAlunos();
            const alunoAutorizado = alunos.find(a => a.codigo == codigoAluno);
            
            if (!alunoAutorizado) {
                throw new Error('Acesso negado a este aluno');
            }

            // Buscar dados detalhados
            const [alunoData, medidasData, frequenciaData] = await Promise.all([
                this.supabase
                    .from('alunos')
                    .select('*')
                    .eq('codigo', codigoAluno)
                    .single(),
                
                this.supabase
                    .from('medidas')
                    .select('*')
                    .eq('codigo_aluno', codigoAluno)
                    .order('data', { ascending: false })
                    .limit(50),
                
                this.supabase
                    .from('frequencia')
                    .select('*')
                    .eq('codigo_aluno', codigoAluno)
                    .gte('data', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                    .order('data', { ascending: false })
            ]);

            if (alunoData.error) throw alunoData.error;
            if (medidasData.error) throw medidasData.error;
            if (frequenciaData.error) throw frequenciaData.error;

            return {
                aluno: alunoData.data,
                medidas: medidasData.data || [],
                frequencia: frequenciaData.data || []
            };

        } catch (error) {
            console.error('Erro ao buscar dados do aluno:', error);
            throw error;
        }
    }

    /**
     * Associar responsável atual a um aluno (correção manual)
     */
    async associarAoAluno(codigoAluno, parentesco = 'responsável') {
        if (!await this.isAuthenticated()) {
            throw new Error('Não autenticado');
        }

        try {
            console.log('🔗 Associando responsável ao aluno:', {
                responsavel_id: this.currentResponsavel.id,
                aluno_codigo: parseInt(codigoAluno),
                parentesco: parentesco
            });

            // Verificar se aluno existe
            const { data: aluno, error: alunoError } = await this.supabase
                .from('alunos')
                .select('codigo, "Nome completo", turma')
                .eq('codigo', parseInt(codigoAluno))
                .single();

            if (alunoError || !aluno) {
                throw new Error('Código do aluno não encontrado: ' + codigoAluno);
            }

            // Criar associação
            const { data: associacaoData, error: associacaoError } = await this.supabase
                .from('responsavel_aluno')
                .insert({
                    responsavel_id: this.currentResponsavel.id,
                    aluno_codigo: parseInt(codigoAluno),
                    parentesco: parentesco,
                    autorizado_retirar: true,
                    autorizado_ver_notas: true,
                    autorizado_ver_frequencia: true,
                    autorizado_ver_disciplinar: true
                })
                .select();

            if (associacaoError) {
                if (associacaoError.message.includes('duplicate') || associacaoError.message.includes('unique')) {
                    return { success: true, message: 'Associação já existe!' };
                }
                throw new Error('Erro na associação: ' + associacaoError.message);
            }

            console.log('✅ Associação criada:', associacaoData);

            return {
                success: true,
                message: `Associado com sucesso ao aluno: ${aluno['Nome completo']} (${aluno.turma})`
            };

        } catch (error) {
            console.error('❌ Erro ao associar:', error);
            throw error;
        }
    }

    /**
     * Logout
     */
    async logout() {
        this.currentResponsavel = null;
        localStorage.removeItem('portal_pais_auth');
        return { success: true };
    }

    /**
     * Validar CPF
     */
    static validarCPF(cpf) {
        const limpo = cpf.replace(/\D/g, '');
        
        if (limpo.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(limpo)) return false;
        
        return true; // Validação básica
    }

    /**
     * Formatar CPF
     */
    static formatarCPF(cpf) {
        const limpo = cpf.replace(/\D/g, '');
        if (limpo.length === 11) {
            return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return cpf;
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AuthPortalPaisV2 = AuthPortalPaisV2;
}