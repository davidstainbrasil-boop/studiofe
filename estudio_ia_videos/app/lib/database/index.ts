/**
 * Serviço de Banco de Dados PostgreSQL Local
 * MVP Video TécnicoCursos v7
 * 
 * Este módulo fornece uma camada de abstração para o PostgreSQL local,
 * substituindo a dependência do Supabase para operações de banco de dados.
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// ============================================
// TIPOS
// ============================================

/** Tipos válidos para parâmetros de query SQL */
export type QueryParam = string | number | boolean | null | undefined | Date | Buffer;
export type QueryParams = QueryParam[];

/** Tipo para dados de inserção/atualização */
export type RecordData = Record<string, QueryParam>;

// ============================================
// CONFIGURAÇÃO DO POOL DE CONEXÕES
// ============================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://mvp_admin:MvpVideo2025@Secure!@localhost:5432/mvp_videos',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log de conexão
pool.on('connect', () => {
  console.log('[DB] Nova conexão estabelecida');
});

pool.on('error', (err) => {
  console.error('[DB] Erro no pool de conexões:', err);
});

// ============================================
// FUNÇÕES DE QUERY
// ============================================

/**
 * Executa uma query SQL
 */
export async function query<T = unknown>(
  text: string,
  params?: QueryParams
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.LOG_LEVEL === 'debug') {
      console.log('[DB] Query executada:', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('[DB] Erro na query:', { text, error });
    throw error;
  }
}

/**
 * Obtém uma única linha
 */
export async function queryOne<T = unknown>(
  text: string,
  params?: QueryParams
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Obtém todas as linhas
 */
export async function queryAll<T = unknown>(
  text: string,
  params?: QueryParams
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

/**
 * Obtém um cliente do pool para transações
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Executa uma transação
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// HELPERS PARA OPERAÇÕES COMUNS
// ============================================

/**
 * Insere um registro e retorna o resultado
 */
export async function insert<T = unknown>(
  table: string,
  data: RecordData
): Promise<T> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  
  const sql = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;
  
  const result = await query<T>(sql, values);
  return result.rows[0];
}

/**
 * Atualiza registros
 */
export async function update<T = unknown>(
  table: string,
  data: RecordData,
  where: string,
  whereParams: QueryParams
): Promise<T[]> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
  
  // Ajustar placeholders do WHERE
  const adjustedWhere = where.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + columns.length}`);
  
  const sql = `
    UPDATE ${table}
    SET ${setClause}, updated_at = NOW()
    WHERE ${adjustedWhere}
    RETURNING *
  `;
  
  const result = await query<T>(sql, [...values, ...whereParams]);
  return result.rows;
}

/**
 * Deleta registros
 */
export async function remove(
  table: string,
  where: string,
  whereParams: QueryParams
): Promise<number> {
  const sql = `DELETE FROM ${table} WHERE ${where}`;
  const result = await query(sql, whereParams);
  return result.rowCount || 0;
}

/**
 * Busca por ID
 */
export async function findById<T = unknown>(
  table: string,
  id: string
): Promise<T | null> {
  return queryOne<T>(`SELECT * FROM ${table} WHERE id = $1`, [id]);
}

/**
 * Busca todos com filtros opcionais
 */
export async function findAll<T = Record<string, unknown>>(
  table: string,
  options?: {
    where?: string;
    params?: (string | number | boolean | null)[];
    orderBy?: string;
    limit?: number;
    offset?: number;
  }
): Promise<T[]> {
  let sql = `SELECT * FROM ${table}`;
  const params: (string | number | boolean | null)[] = options?.params || [];
  
  if (options?.where) {
    sql += ` WHERE ${options.where}`;
  }
  
  if (options?.orderBy) {
    sql += ` ORDER BY ${options.orderBy}`;
  }
  
  if (options?.limit) {
    sql += ` LIMIT ${options.limit}`;
  }
  
  if (options?.offset) {
    sql += ` OFFSET ${options.offset}`;
  }
  
  return queryAll<T>(sql, params);
}

/**
 * Conta registros
 */
export async function count(
  table: string,
  where?: string,
  params?: QueryParams
): Promise<number> {
  let sql = `SELECT COUNT(*) as count FROM ${table}`;
  if (where) {
    sql += ` WHERE ${where}`;
  }
  const result = await queryOne<{ count: string }>(sql, params);
  return parseInt(result?.count || '0', 10);
}

/**
 * Verifica se existe
 */
export async function exists(
  table: string,
  where: string,
  params: QueryParams
): Promise<boolean> {
  const sql = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${where}) as exists`;
  const result = await queryOne<{ exists: boolean }>(sql, params);
  return result?.exists || false;
}

// ============================================
// HEALTH CHECK
// ============================================

export async function healthCheck(): Promise<{
  connected: boolean;
  latency: number;
  poolSize: number;
  idleCount: number;
  waitingCount: number;
}> {
  const start = Date.now();
  try {
    await query('SELECT 1');
    return {
      connected: true,
      latency: Date.now() - start,
      poolSize: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (error) {
    return {
      connected: false,
      latency: -1,
      poolSize: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }
}

// ============================================
// CLEANUP
// ============================================

export async function closePool(): Promise<void> {
  await pool.end();
  console.log('[DB] Pool de conexões fechado');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  query,
  queryOne,
  queryAll,
  getClient,
  transaction,
  insert,
  update,
  remove,
  findById,
  findAll,
  count,
  exists,
  healthCheck,
  closePool,
  pool,
};

