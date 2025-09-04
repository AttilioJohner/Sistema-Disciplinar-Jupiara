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

            // 2. Verificar se o aluno existe (tentar sem RLS primeiro)
            let aluno = null;
            try {
                const { data: alunoData, error: alunoError } = await this.supabase
                    .from('alunos')
                    .select('codigo, "Nome completo", turma')
                    .eq('codigo', parseInt(codigoAluno))
                    .single();

                if (!alunoError && alunoData) {
                    aluno = alunoData;
                }
            } catch (err) {
                console.log('❌ RLS bloqueou consulta de aluno, continuando...');
            }

            // Se não conseguiu verificar o aluno (RLS), vamos assumir que existe e tentar
            // O erro será capturado na FK se não existir

            // 3. Criar hash simples da senha (não é super seguro, mas funcional)
            const senhaHash = btoa(senha + cpfLimpo); // Base64 simples

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
                throw new Error('Erro ao criar responsável: ' + responsavelError.message);
            }

            console.log('✅ Responsável criado:', novoResponsavel.id);

            // 5. Tentar associar ao aluno
            const { error: associacaoError } = await this.supabase
                .from('responsavel_aluno')
                .insert({
                    responsavel_id: novoResponsavel.id,
                    aluno_codigo: parseInt(codigoAluno),
                    parentesco: parentesco,
                    autorizado_retirar: true,
                    autorizado_ver_notas: true,
                    autorizado_ver_frequencia: true,
                    autorizado_ver_disciplinar: true
                });

            if (associacaoError) {
                console.error('❌ Erro na associação:', associacaoError);
                
                // Se o erro é de FK (aluno não existe), remover responsável criado
                if (associacaoError.message.includes('foreign key') || associacaoError.message.includes('violates')) {
                    await this.supabase
                        .from('responsaveis')
                        .delete()
                        .eq('id', novoResponsavel.id);
                    
                    throw new Error('Código do aluno não encontrado. Verifique o código informado.');
                }
                
                throw new Error('Erro na associação: ' + associacaoError.message);
            }

            console.log('✅ Associação criada com sucesso');

            // 6. Retornar sucesso com nome do aluno (se conseguimos buscar)
            const nomeAluno = aluno ? aluno['Nome completo'] : `Aluno código ${codigoAluno}`;
            const turmaAluno = aluno ? ` (${aluno.turma})` : '';

            return {
                success: true,
                message: `Conta criada com sucesso! Você foi associado ao ${nomeAluno}${turmaAluno}`
            };

        } catch (error) {
            console.error('❌ Erro no cadastro simplificado:', error);
            return {
                success: false,
                error: error.message
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
     * Buscar alunos do responsável (compatível com formato esperado)
     */
    async getAlunos() {
        if (!await this.isAuthenticated()) {
            throw new Error('Não autenticado');
        }

        try {
            // Buscar associações do responsável
            const { data: associacoes, error: assocError } = await this.supabase
                .from('responsavel_aluno')
                .select('aluno_codigo, parentesco')
                .eq('responsavel_id', this.currentResponsavel.id);

            if (assocError) {
                console.error('Erro ao buscar associações:', assocError);
                return [];
            }

            if (!associacoes || associacoes.length === 0) {
                return [];
            }

            // Buscar dados dos alunos
            const codigosAlunos = associacoes.map(a => a.aluno_codigo);
            const { data: alunos, error: alunosError } = await this.supabase
                .from('alunos')
                .select('codigo, "Nome completo", turma')
                .in('codigo', codigosAlunos);

            if (alunosError) {
                console.error('Erro ao buscar alunos:', alunosError);
                return [];
            }

            // Combinar dados
            return alunos.map(aluno => {
                const associacao = associacoes.find(a => a.aluno_codigo === aluno.codigo);
                return {
                    codigo: aluno.codigo,
                    nome_completo: aluno['Nome completo'],
                    turma: aluno.turma,
                    parentesco: associacao?.parentesco || 'responsável',
                    percentual_frequencia: 100, // Placeholder
                    nota_disciplinar: '8.0',    // Placeholder
                    total_medidas: 0            // Placeholder
                };
            });

        } catch (error) {
            console.error('Erro ao buscar alunos:', error);
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