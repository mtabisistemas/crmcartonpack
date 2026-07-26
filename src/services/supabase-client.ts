import { createClient } from '@supabase/supabase-js';
import { DBMock } from './db-mock';
import type { 
  Usuario, Cliente, ContatoCliente, Visita, Ligacao, 
  Orcamento, HistoricoCompra, Meta, Prospeccao
} from '../types/crm';

// Carregar variáveis de ambiente do Supabase (Next.js style)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Determinar se usaremos o Supabase real ou o Mock
const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'SUA_URL_DO_SUPABASE');

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

console.log(`[Carton PACK CRM] Banco de dados ativo: ${isSupabaseConfigured ? 'Supabase Real' : 'LocalMock (localStorage)'}`);

// -------------------------------------------------------------
// SERVIÇO UNIFICADO (COM FALLBACK AUTOMÁTICO)
// -------------------------------------------------------------
export const dbService = {
  isMock: !isSupabaseConfigured,

  usuarios: {
    async list(): Promise<any[]> {
      let localUsers: any[] = [];
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('cp_crm_v7_official_users');
        if (saved) {
          try { localUsers = JSON.parse(saved); } catch (e) {}
        }
      }

      if (!isSupabaseConfigured || !supabase) {
        return localUsers.length > 0 ? localUsers : DBMock.getUsuarios();
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');

        if (!error && data && data.length > 0) {
          const mappedFromSb = data.map((p: any) => ({
            id: p.id,
            name: p.full_name || p.name || p.email?.split('@')[0],
            email: p.email,
            role: p.role || 'representante',
            status: p.status || 'ativo',
            phone: p.phone || '',
            createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
            username: p.username,
            tempPassword: p.temp_password || p.tempPassword,
            isFirstAccess: p.is_first_access !== false
          }));

          const merged = [...mappedFromSb];
          localUsers.forEach(lu => {
            if (!merged.some(m => m.id === lu.id || (m.email && m.email === lu.email) || (m.username && m.username === lu.username))) {
              merged.push(lu);
            }
          });

          if (typeof window !== 'undefined') {
            localStorage.setItem('cp_crm_v7_official_users', JSON.stringify(merged));
          }

          return merged;
        }
      } catch (err) {
        console.warn('[Supabase Profiles Fetch Warning]:', err);
      }

      return localUsers;
    },

    async save(user: any): Promise<any> {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('cp_crm_v7_official_users');
        const users = saved ? JSON.parse(saved) : [];
        const idx = users.findIndex((u: any) => u.id === user.id);
        if (idx >= 0) {
          users[idx] = user;
        } else {
          users.unshift(user);
        }
        localStorage.setItem('cp_crm_v7_official_users', JSON.stringify(users));
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const payload = {
            full_name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            phone: user.phone,
            status: user.status || 'ativo',
            temp_password: user.tempPassword,
            is_first_access: user.isFirstAccess !== false
          };

          await supabase.from('profiles').upsert([payload]);
        } catch (err) {
          console.warn('[Supabase Sync Warning]:', err);
        }
      }

      return user;
    },

    async delete(id: string): Promise<void> {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('cp_crm_v7_official_users');
        if (saved) {
          try {
            const users = JSON.parse(saved).filter((u: any) => u.id !== id);
            localStorage.setItem('cp_crm_v7_official_users', JSON.stringify(users));
          } catch (e) {}
        }
      }

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('profiles').delete().eq('id', id);
        } catch (e) {}
      }
    },

    async getLogado(): Promise<any> {
      if (!isSupabaseConfigured) return DBMock.getUsuarioLogado();
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },

    setLogado(usuario: any) {
      if (!isSupabaseConfigured) {
        DBMock.setUsuarioLogado(usuario);
      } else {
        if (typeof window === 'undefined') return;
        localStorage.setItem('cp_crm_user_logado_simulado', JSON.stringify(usuario));
        window.dispatchEvent(new Event('storage-user-changed'));
      }
    },

    getLogadoSimulado(): any {
      if (!isSupabaseConfigured) return DBMock.getUsuarioLogado();
      if (typeof window === 'undefined') return DBMock.getUsuarioLogado();
      const sim = localStorage.getItem('cp_crm_user_logado_simulado');
      if (sim) return JSON.parse(sim) as Usuario;
      return DBMock.getUsuarioLogado();
    }
  },

  clientes: {
    async list(): Promise<Cliente[]> {
      if (!isSupabaseConfigured) return DBMock.getClientes();
      const { data, error } = await supabase!
        .from('clientes')
        .select('*')
        .order('razao_social', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async getById(id: string): Promise<Cliente | undefined> {
      if (!isSupabaseConfigured) return DBMock.getClienteById(id);
      const { data, error } = await supabase!
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return undefined;
      return data;
    },

    async save(cliente: Omit<Cliente, 'id' | 'status_carteira' | 'data_ultima_compra' | 'data_ultimo_contato'>): Promise<Cliente> {
      if (!isSupabaseConfigured) return DBMock.salvarCliente(cliente);
      const { data, error } = await supabase!
        .from('clientes')
        .insert([cliente])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Cliente>): Promise<Cliente> {
      if (!isSupabaseConfigured) return DBMock.atualizarCliente(id, updates);
      const { data, error } = await supabase!
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  contatos: {
    async listByCliente(clienteId: string): Promise<ContatoCliente[]> {
      if (!isSupabaseConfigured) return DBMock.getContatosByCliente(clienteId);
      const { data, error } = await supabase!
        .from('contatos_cliente')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('nome', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async save(contato: Omit<ContatoCliente, 'id'>): Promise<ContatoCliente> {
      if (!isSupabaseConfigured) return DBMock.salvarContato(contato);
      const { data, error } = await supabase!
        .from('contatos_cliente')
        .insert([contato])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      if (!isSupabaseConfigured) return DBMock.excluirContato(id);
      const { error } = await supabase!
        .from('contatos_cliente')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  visitas: {
    async list(): Promise<Visita[]> {
      if (!isSupabaseConfigured) return DBMock.getVisitas();
      const { data, error } = await supabase!
        .from('visitas')
        .select('*')
        .order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async save(visita: Omit<Visita, 'id'>): Promise<Visita> {
      if (!isSupabaseConfigured) return DBMock.salvarVisita(visita);
      const { data, error } = await supabase!
        .from('visitas')
        .insert([visita])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Visita>): Promise<Visita> {
      if (!isSupabaseConfigured) return DBMock.atualizarVisita(id, updates);
      const { data, error } = await supabase!
        .from('visitas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  ligacoes: {
    async list(): Promise<Ligacao[]> {
      if (!isSupabaseConfigured) return DBMock.getLigações();
      const { data, error } = await supabase!
        .from('ligacoes')
        .select('*')
        .order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async save(ligacao: Omit<Ligacao, 'id'>): Promise<Ligacao> {
      if (!isSupabaseConfigured) return DBMock.salvarLigacao(ligacao);
      const { data, error } = await supabase!
        .from('ligacoes')
        .insert([ligacao])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Ligacao>): Promise<Ligacao> {
      if (!isSupabaseConfigured) return DBMock.atualizarLigacao(id, updates);
      const { data, error } = await supabase!
        .from('ligacoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  orcamentos: {
    async list(): Promise<Orcamento[]> {
      if (!isSupabaseConfigured) return DBMock.getOrcamentos();
      const { data, error } = await supabase!
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async save(orcamento: Omit<Orcamento, 'id'>): Promise<Orcamento> {
      if (!isSupabaseConfigured) return DBMock.salvarOrcamento(orcamento);
      const { data, error } = await supabase!
        .from('orcamentos')
        .insert([orcamento])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Orcamento>): Promise<Orcamento> {
      if (!isSupabaseConfigured) return DBMock.atualizarOrcamento(id, updates);
      const { data, error } = await supabase!
        .from('orcamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  historicoCompras: {
    async list(): Promise<HistoricoCompra[]> {
      if (!isSupabaseConfigured) return DBMock.getCompras();
      const { data, error } = await supabase!
        .from('historico_compras')
        .select('*')
        .order('data_compra', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async listByCliente(clienteId: string): Promise<HistoricoCompra[]> {
      if (!isSupabaseConfigured) return DBMock.getComprasByCliente(clienteId);
      const { data, error } = await supabase!
        .from('historico_compras')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('data_compra', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async save(compra: Omit<HistoricoCompra, 'id'>): Promise<HistoricoCompra> {
      if (!isSupabaseConfigured) return DBMock.salvarCompra(compra);
      const { data, error } = await supabase!
        .from('historico_compras')
        .insert([compra])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  metas: {
    async list(): Promise<Meta[]> {
      if (!isSupabaseConfigured) return DBMock.getMetas();
      const { data, error } = await supabase!
        .from('metas')
        .select('*');
      if (error) throw error;
      return data || [];
    },

    async save(meta: Omit<Meta, 'id'>): Promise<Meta> {
      if (!isSupabaseConfigured) return DBMock.salvarMeta(meta);
      // Simulação simplificada de Upsert no Supabase
      const { data, error } = await supabase!
        .from('metas')
        .upsert([meta], { onConflict: 'usuario_id,tipo,periodo' })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  prospeccao: {
    async list(): Promise<Prospeccao[]> {
      if (!isSupabaseConfigured) return DBMock.getProspeccoes();
      const { data, error } = await supabase!
        .from('prospeccao')
        .select('*')
        .order('empresa', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async save(prosp: Omit<Prospeccao, 'id'>): Promise<Prospeccao> {
      if (!isSupabaseConfigured) return DBMock.salvarProspeccao(prosp);
      const { data, error } = await supabase!
        .from('prospeccao')
        .insert([prosp])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Prospeccao>): Promise<Prospeccao> {
      if (!isSupabaseConfigured) return DBMock.atualizarProspeccao(id, updates);
      const { data, error } = await supabase!
        .from('prospeccao')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async convert(id: string, responsavelId: string, vendedorInternoId: string): Promise<Cliente> {
      if (!isSupabaseConfigured) return DBMock.converterProspectEmCliente(id, responsavelId, vendedorInternoId);
      // Em produção, isso pode ser feito via Edge Function ou múltiplas queries transacionais.
      // Aqui emulamos a conversão no banco para manter o frontend coeso.
      const { data: prospect, error: pError } = await supabase!
        .from('prospeccao')
        .update({ status: 'convertido' })
        .eq('id', id)
        .select()
        .single();
      if (pError) throw pError;

      const { data: cliente, error: cError } = await supabase!
        .from('clientes')
        .insert([{
          razao_social: prospect.empresa,
          cnpj: 'CNPJ - ' + Math.floor(Math.random()*100000),
          cidade: 'Indefinida',
          estado: 'RS',
          segmento: prospect.segmento,
          representante_id: responsavelId,
          vendedor_interno_id: vendedorInternoId,
          status_carteira: 'ativo',
          classificacao_potencial: 'C',
          volume_mensal: 0,
          principais_produtos: []
        }])
        .select()
        .single();
      if (cError) throw cError;

      await supabase!
        .from('contatos_cliente')
        .insert([{
          cliente_id: cliente.id,
          nome: prospect.contato,
          cargo: 'Contato de Prospecção',
          telefone: prospect.telefone,
          email: prospect.email
        }]);

      return cliente;
    }
  }
};
