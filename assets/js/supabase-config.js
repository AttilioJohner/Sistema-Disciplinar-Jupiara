// Configuração do Supabase para o Sistema Disciplinar Jupiara
class SupabaseConfig {
  constructor() {
    // URLs de configuração (serão definidas nas variáveis de ambiente)
    this.supabaseUrl = window.SUPABASE_URL || '';
    this.supabaseKey = window.SUPABASE_ANON_KEY || '';
    
    // Verificar se as variáveis estão configuradas
    if (!this.supabaseUrl || !this.supabaseKey) {
      console.warn('⚠️ Variáveis do Supabase não configuradas. Usando modo local.');
      this.useLocal = true;
      return;
    }
    
    this.useLocal = false;
    this.supabase = null;
    this.initSupabase();
  }

  // Inicializar cliente Supabase
  async initSupabase() {
    try {
      // Carregar a biblioteca do Supabase via CDN
      if (!window.supabase) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.onload = () => {
          this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
          console.log('✅ Supabase inicializado com sucesso');
          this.dispatchReadyEvent();
        };
        script.onerror = () => {
          console.error('❌ Erro ao carregar biblioteca do Supabase');
          this.useLocal = true;
        };
        document.head.appendChild(script);
      } else {
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        console.log('✅ Supabase inicializado com sucesso');
        this.dispatchReadyEvent();
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Supabase:', error);
      this.useLocal = true;
    }
  }

  // Disparar evento quando estiver pronto
  dispatchReadyEvent() {
    window.dispatchEvent(new CustomEvent('supabaseReady', { 
      detail: { supabase: this.supabase } 
    }));
  }

  // Verificar se está usando modo local
  isLocal() {
    return this.useLocal;
  }

  // Obter instância do Supabase
  getClient() {
    return this.supabase;
  }

  // Verificar conexão
  async testConnection() {
    if (this.useLocal) {
      return { success: false, message: 'Modo local ativo' };
    }

    try {
      const { data, error } = await this.supabase.from('alunos').select('count').limit(1);
      
      if (error && error.code === 'PGRST116') {
        // Tabela não existe ainda, mas conexão está OK
        return { success: true, message: 'Conectado (tabelas não criadas)' };
      } else if (error) {
        throw error;
      }
      
      return { success: true, message: 'Conectado com sucesso' };
    } catch (error) {
      console.error('Erro na conexão com Supabase:', error);
      return { success: false, message: error.message };
    }
  }
}

// Adapter para compatibilidade com código existente
class SupabaseAdapter {
  constructor(supabaseConfig) {
    this.config = supabaseConfig;
    this.isReady = false;
    
    // Aguardar inicialização
    window.addEventListener('supabaseReady', () => {
      this.isReady = true;
    });
  }

  // Simular interface do Firestore/LocalDB
  collection(name) {
    return new SupabaseCollection(this.config, name);
  }

  // Operações batch
  batch() {
    return new SupabaseBatch(this.config);
  }

  // Métodos de rede (compatibilidade)
  enableNetwork() {
    return Promise.resolve();
  }

  disableNetwork() {
    return Promise.resolve();
  }
}

class SupabaseCollection {
  constructor(config, tableName) {
    this.config = config;
    this.tableName = tableName;
  }

  // Obter todos os documentos
  async get() {
    if (this.config.isLocal()) {
      // Fallback para sistema local
      return window.localDb?.collection(this.tableName)?.get() || { docs: [], size: 0, empty: true };
    }

    try {
      const { data, error } = await this.config.getClient()
        .from(this.tableName)
        .select('*');

      if (error) throw error;

      const docs = (data || []).map(item => ({
        id: item.id,
        data: () => item,
        exists: true
      }));

      return {
        docs,
        size: docs.length,
        empty: docs.length === 0,
        forEach: (callback) => docs.forEach(callback)
      };
    } catch (error) {
      console.error(`Erro ao buscar ${this.tableName}:`, error);
      return { docs: [], size: 0, empty: true };
    }
  }

  // Obter documento por ID
  doc(id) {
    return new SupabaseDocument(this.config, this.tableName, id);
  }

  // Adicionar documento
  async add(data) {
    if (this.config.isLocal()) {
      return window.localDb?.collection(this.tableName)?.add(data);
    }

    try {
      const docData = {
        ...data,
        id: this.generateId(),
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };

      const { data: result, error } = await this.config.getClient()
        .from(this.tableName)
        .insert([docData])
        .select()
        .single();

      if (error) throw error;

      return {
        id: result.id,
        get: async () => ({
          id: result.id,
          data: () => result,
          exists: true
        })
      };
    } catch (error) {
      console.error(`Erro ao adicionar em ${this.tableName}:`, error);
      throw error;
    }
  }

  // Filtrar por campo
  where(field, operator, value) {
    return new SupabaseQuery(this.config, this.tableName, [{ field, operator, value }]);
  }

  // Gerar ID único
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

class SupabaseDocument {
  constructor(config, tableName, docId) {
    this.config = config;
    this.tableName = tableName;
    this.id = docId;
  }

  async get() {
    if (this.config.isLocal()) {
      return window.localDb?.collection(this.tableName)?.doc(this.id)?.get();
    }

    try {
      const { data, error } = await this.config.getClient()
        .from(this.tableName)
        .select('*')
        .eq('id', this.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        id: this.id,
        data: () => data || {},
        exists: !!data
      };
    } catch (error) {
      console.error(`Erro ao buscar documento ${this.id}:`, error);
      return {
        id: this.id,
        data: () => ({}),
        exists: false
      };
    }
  }

  async set(data) {
    if (this.config.isLocal()) {
      return window.localDb?.collection(this.tableName)?.doc(this.id)?.set(data);
    }

    try {
      const docData = {
        ...data,
        id: this.id,
        atualizadoEm: new Date().toISOString()
      };

      const { error } = await this.config.getClient()
        .from(this.tableName)
        .upsert([docData]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Erro ao definir documento ${this.id}:`, error);
      throw error;
    }
  }

  async update(data) {
    if (this.config.isLocal()) {
      return window.localDb?.collection(this.tableName)?.doc(this.id)?.update(data);
    }

    try {
      const updateData = {
        ...data,
        atualizadoEm: new Date().toISOString()
      };

      const { error } = await this.config.getClient()
        .from(this.tableName)
        .update(updateData)
        .eq('id', this.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar documento ${this.id}:`, error);
      throw error;
    }
  }

  async delete() {
    if (this.config.isLocal()) {
      return window.localDb?.collection(this.tableName)?.doc(this.id)?.delete();
    }

    try {
      const { error } = await this.config.getClient()
        .from(this.tableName)
        .delete()
        .eq('id', this.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Erro ao deletar documento ${this.id}:`, error);
      throw error;
    }
  }

  collection(subCollection) {
    return new SupabaseCollection(this.config, `${this.tableName}_${this.id}_${subCollection}`);
  }
}

class SupabaseQuery {
  constructor(config, tableName, filters = [], limitCount = null) {
    this.config = config;
    this.tableName = tableName;
    this.filters = filters;
    this.limitCount = limitCount;
  }

  where(field, operator, value) {
    return new SupabaseQuery(
      this.config, 
      this.tableName, 
      [...this.filters, { field, operator, value }], 
      this.limitCount
    );
  }

  limit(count) {
    return new SupabaseQuery(this.config, this.tableName, this.filters, count);
  }

  async get() {
    if (this.config.isLocal()) {
      return window.localDb?.collection(this.tableName)?.where(
        this.filters[0]?.field, 
        this.filters[0]?.operator, 
        this.filters[0]?.value
      )?.get() || { docs: [], size: 0, empty: true };
    }

    try {
      let query = this.config.getClient().from(this.tableName).select('*');

      // Aplicar filtros
      for (const filter of this.filters) {
        switch (filter.operator) {
          case '==':
            query = query.eq(filter.field, filter.value);
            break;
          case '!=':
            query = query.neq(filter.field, filter.value);
            break;
          case '>':
            query = query.gt(filter.field, filter.value);
            break;
          case '>=':
            query = query.gte(filter.field, filter.value);
            break;
          case '<':
            query = query.lt(filter.field, filter.value);
            break;
          case '<=':
            query = query.lte(filter.field, filter.value);
            break;
          case 'array-contains':
            query = query.contains(filter.field, [filter.value]);
            break;
        }
      }

      // Aplicar limit
      if (this.limitCount) {
        query = query.limit(this.limitCount);
      }

      const { data, error } = await query;
      if (error) throw error;

      const docs = (data || []).map(item => ({
        id: item.id,
        data: () => item,
        exists: true
      }));

      return {
        docs,
        size: docs.length,
        empty: docs.length === 0,
        forEach: (callback) => docs.forEach(callback)
      };
    } catch (error) {
      console.error(`Erro na query ${this.tableName}:`, error);
      return { docs: [], size: 0, empty: true };
    }
  }
}

class SupabaseBatch {
  constructor(config) {
    this.config = config;
    this.operations = [];
  }

  set(docRef, data) {
    this.operations.push({
      type: 'set',
      table: docRef.tableName,
      id: docRef.id,
      data
    });
  }

  update(docRef, data) {
    this.operations.push({
      type: 'update',
      table: docRef.tableName,
      id: docRef.id,
      data
    });
  }

  delete(docRef) {
    this.operations.push({
      type: 'delete',
      table: docRef.tableName,
      id: docRef.id
    });
  }

  async commit() {
    if (this.config.isLocal()) {
      return window.localDb?.batch()?.commit();
    }

    try {
      for (const op of this.operations) {
        switch (op.type) {
          case 'set':
            await this.config.getClient()
              .from(op.table)
              .upsert([{ ...op.data, id: op.id, atualizadoEm: new Date().toISOString() }]);
            break;
          case 'update':
            await this.config.getClient()
              .from(op.table)
              .update({ ...op.data, atualizadoEm: new Date().toISOString() })
              .eq('id', op.id);
            break;
          case 'delete':
            await this.config.getClient()
              .from(op.table)
              .delete()
              .eq('id', op.id);
            break;
        }
      }
      
      this.operations = [];
      return true;
    } catch (error) {
      console.error('Erro no batch commit:', error);
      throw error;
    }
  }
}

// Inicializar Supabase
const supabaseConfig = new SupabaseConfig();
const supabaseAdapter = new SupabaseAdapter(supabaseConfig);

// Substitir o sistema de banco global
window.db = supabaseAdapter;
window.supabaseConfig = supabaseConfig;

console.log('🚀 Sistema de banco de dados híbrido (Supabase + Local) inicializado');