/**
 * Sistema de Autenticação para Portal dos Pais
 * Implementa login seguro com CPF e senha usando Supabase Auth + RLS
 */

class AuthPortalPais {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
        this.currentResponsavel = null;
        this.authStateListeners = [];
    }

    /**
     * Autentica responsável com CPF e senha
     */
    async login(cpf, senha) {
        try {
            // Limpar CPF (apenas números)
            const cpfLimpo = cpf.replace(/\D/g, '');
            
            if (cpfLimpo.length !== 11) {
                throw new Error('CPF deve conter 11 dígitos');
            }

            // Buscar responsável pelo CPF
            const { data: responsavel, error: responsavelError } = await this.supabase
                .from('responsaveis')
                .select('id, cpf, nome, email, ativo')
                .eq('cpf', cpfLimpo)
                .eq('ativo', true)
                .single();

            if (responsavelError || !responsavel) {
                throw new Error('CPF não encontrado ou inativo');
            }

            // Tentar autenticar com Supabase Auth
            // Usa email baseado no ID do responsável para compatibilidade
            const email = `${responsavel.id}@portal.pais.local`;
            
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (authError) {
                // Se não existe no Auth, criar primeiro acesso
                if (authError.message.includes('Invalid login credentials')) {
                    throw new Error('Senha incorreta ou primeiro acesso não configurado');
                }
                throw authError;
            }

            // Salvar dados do responsável autenticado
            this.currentUser = authData.user;
            this.currentResponsavel = responsavel;

            // Salvar no localStorage para persistência
            localStorage.setItem('portal_pais_responsavel', JSON.stringify({
                id: responsavel.id,
                nome: responsavel.nome,
                cpf: responsavel.cpf,
                loginTime: Date.now()
            }));

            // Notificar listeners
            this.notifyAuthStateChange(true);

            return {
                success: true,
                responsavel: responsavel,
                message: 'Login realizado com sucesso'
            };

        } catch (error) {
            console.error('Erro no login:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cria conta completa com código do aluno (novo fluxo)
     */
    async criarContaComCodigoAluno(cpf, nome, codigoAluno, parentesco, senha) {
        try {
            const cpfLimpo = cpf.replace(/\D/g, '');
            
            // Validar CPF único
            const { data: cpfExistente, error: cpfError } = await this.supabase
                .from('responsaveis')
                .select('id')
                .eq('cpf', cpfLimpo)
                .single();

            if (cpfExistente) {
                throw new Error('CPF já cadastrado. Use a opção de login normal.');
            }

            // Verificar se o aluno existe (usando view pública)
            const { data: aluno, error: alunoError } = await this.supabase
                .from('v_alunos_validacao')
                .select('codigo, nome_completo, turma')
                .eq('codigo', parseInt(codigoAluno))
                .single();

            if (alunoError || !aluno) {
                throw new Error('Código do aluno não encontrado. Verifique o código informado.');
            }

            // Criar responsável no banco
            const { data: novoResponsavel, error: responsavelError } = await this.supabase
                .from('responsaveis')
                .insert({
                    cpf: cpfLimpo,
                    nome: nome,
                    email: `${cpfLimpo}@portal.pais.local`,
                    telefone: '',
                    ativo: true
                })
                .select('id')
                .single();

            if (responsavelError) {
                throw new Error('Erro ao criar responsável: ' + responsavelError.message);
            }

            // Criar conta no Supabase Auth
            const email = `${novoResponsavel.id}@portal.pais.local`;
            
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: senha,
                options: {
                    data: {
                        responsavel_id: novoResponsavel.id,
                        nome: nome,
                        cpf: cpfLimpo
                    }
                }
            });

            if (authError) {
                // Se falhou no Auth, tentar remover responsável criado
                await this.supabase
                    .from('responsaveis')
                    .delete()
                    .eq('id', novoResponsavel.id);
                    
                throw new Error('Erro na autenticação: ' + authError.message);
            }

            // Associar responsável ao aluno
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
                console.warn('Erro na associação responsável-aluno:', associacaoError);
            }

            return {
                success: true,
                message: `Conta criada com sucesso! Você foi associado ao aluno: ${aluno.nome_completo} (${aluno.turma})`
            };

        } catch (error) {
            console.error('Erro no cadastro:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cria primeira conta para responsável (método antigo - mantido para compatibilidade)
     */
    async criarPrimeiroAcesso(cpf, senha) {
        return this.criarContaComCodigoAluno(cpf, 'Nome Responsável', '', 'responsável', senha);
    }

    /**
     * Logout seguro
     */
    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            
            // Limpar dados locais
            this.currentUser = null;
            this.currentResponsavel = null;
            localStorage.removeItem('portal_pais_responsavel');
            
            // Notificar listeners
            this.notifyAuthStateChange(false);

            if (error) {
                console.warn('Erro no logout do Supabase:', error.message);
            }

            return { success: true };

        } catch (error) {
            console.error('Erro no logout:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verifica se usuário está autenticado
     */
    async isAuthenticated() {
        try {
            // Verificar sessão do Supabase
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error || !session) {
                this.currentUser = null;
                this.currentResponsavel = null;
                return false;
            }

            // Se tem sessão mas não tem dados do responsável, buscar
            if (!this.currentResponsavel) {
                const responsavelData = localStorage.getItem('portal_pais_responsavel');
                if (responsavelData) {
                    const data = JSON.parse(responsavelData);
                    
                    // Verificar se não expirou (24 horas)
                    if (Date.now() - data.loginTime > 24 * 60 * 60 * 1000) {
                        await this.logout();
                        return false;
                    }

                    this.currentResponsavel = data;
                }
            }

            this.currentUser = session.user;
            return true;

        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            return false;
        }
    }

    /**
     * Busca alunos do responsável autenticado (com RLS)
     */
    async getAlunos() {
        if (!await this.isAuthenticated()) {
            throw new Error('Não autenticado');
        }

        try {
            // RLS policy garante que só retorna alunos autorizados
            const { data, error } = await this.supabase
                .from('v_portal_pais_seguro')
                .select('*')
                .order('nome_completo');

            if (error) {
                throw error;
            }

            return data || [];

        } catch (error) {
            console.error('Erro ao buscar alunos:', error);
            throw error;
        }
    }

    /**
     * Busca dados completos de um aluno específico
     */
    async getDadosAluno(codigoAluno) {
        if (!await this.isAuthenticated()) {
            throw new Error('Não autenticado');
        }

        try {
            // Verificar se tem acesso ao aluno
            const alunos = await this.getAlunos();
            const alunoAutorizado = alunos.find(a => a.codigo === codigoAluno);
            
            if (!alunoAutorizado) {
                throw new Error('Acesso negado a este aluno');
            }

            // Buscar dados detalhados (RLS já protege)
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
     * Adiciona listener para mudanças de estado de autenticação
     */
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        
        // Remover listener
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }

    /**
     * Notifica listeners sobre mudanças de autenticação
     */
    notifyAuthStateChange(isAuthenticated) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(isAuthenticated, this.currentResponsavel);
            } catch (error) {
                console.error('Erro em listener de autenticação:', error);
            }
        });
    }

    /**
     * Utilitário para formatação de CPF
     */
    static formatarCPF(cpf) {
        const limpo = cpf.replace(/\D/g, '');
        if (limpo.length === 11) {
            return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        return cpf;
    }

    /**
     * Validação simples de CPF
     */
    static validarCPF(cpf) {
        const limpo = cpf.replace(/\D/g, '');
        
        if (limpo.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(limpo)) return false; // Sequência repetida
        
        // Validação básica dos dígitos verificadores
        let soma = 0;
        for (let i = 0; i < 9; i++) {
            soma += parseInt(limpo.charAt(i)) * (10 - i);
        }
        let digito1 = 11 - (soma % 11);
        if (digito1 > 9) digito1 = 0;

        soma = 0;
        for (let i = 0; i < 10; i++) {
            soma += parseInt(limpo.charAt(i)) * (11 - i);
        }
        let digito2 = 11 - (soma % 11);
        if (digito2 > 9) digito2 = 0;

        return (digito1 === parseInt(limpo.charAt(9)) && digito2 === parseInt(limpo.charAt(10)));
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AuthPortalPais = AuthPortalPais;
}