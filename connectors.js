/**
 * Conectores para diferentes tipos de bancos de dados
 */

// MySQL Connector
const mysql = {
  async connect(args) {
    const mysql2 = require('mysql2/promise');
    
    const { host, port, user, password, database, url, options } = args;
    
    let connectionConfig;
    
    if (url) {
      connectionConfig = url;
    } else {
      connectionConfig = {
        host: host || process.env.MYSQL_HOST || 'localhost',
        port: port || process.env.MYSQL_PORT || 3306,
        user: user || process.env.MYSQL_USER || 'root',
        password: password || process.env.MYSQL_PASSWORD || '',
        database: database || process.env.MYSQL_DATABASE,
        ...options
      };
    }
    
    try {
      const connection = await mysql2.createConnection(connectionConfig);
      return connection;
    } catch (error) {
      throw new Error(`Erro ao conectar ao MySQL: ${error.message}`);
    }
  },
  
  async listDatabases(connection) {
    try {
      const [rows] = await connection.query('SHOW DATABASES');
      return rows.map(row => row.Database);
    } catch (error) {
      throw new Error(`Erro ao listar bancos de dados MySQL: ${error.message}`);
    }
  },
  
  async listTables(connection) {
    try {
      const [rows] = await connection.query('SHOW TABLES');
      const tableKey = Object.keys(rows[0])[0];
      return rows.map(row => row[tableKey]);
    } catch (error) {
      throw new Error(`Erro ao listar tabelas MySQL: ${error.message}`);
    }
  },
  
  async getTableStructure(connection, tableName) {
    try {
      // Obter informações das colunas
      const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
      
      // Obter informações dos índices
      const [indexes] = await connection.query(`SHOW INDEX FROM \`${tableName}\``);
      
      // Processar índices
      const processedIndexes = {};
      indexes.forEach(index => {
        if (!processedIndexes[index.Key_name]) {
          processedIndexes[index.Key_name] = {
            name: index.Key_name,
            columns: [],
            unique: index.Non_unique === 0,
            type: index.Key_name === 'PRIMARY' ? 'PRIMARY' : (index.Index_type || 'INDEX')
          };
        }
        processedIndexes[index.Key_name].columns.push(index.Column_name);
      });
      
      return {
        table_name: tableName,
        columns: columns.map(column => ({
          name: column.Field,
          type: column.Type,
          nullable: column.Null === 'YES',
          default: column.Default,
          primary_key: column.Key === 'PRI',
          auto_increment: column.Extra.includes('auto_increment')
        })),
        indexes: Object.values(processedIndexes)
      };
    } catch (error) {
      throw new Error(`Erro ao obter estrutura da tabela MySQL: ${error.message}`);
    }
  },
  
  async executeQuery(connection, query, params = []) {
    try {
      const [results, fields] = await connection.query(query, params);
      
      // Verificar se é uma consulta SELECT
      if (Array.isArray(results)) {
        return {
          results,
          fields: fields ? fields.map(field => field.name) : [],
          affected_rows: results.length
        };
      } else {
        // Para operações de modificação (INSERT, UPDATE, DELETE)
        return {
          affected_rows: results.affectedRows,
          insert_id: results.insertId,
          changed_rows: results.changedRows
        };
      }
    } catch (error) {
      throw new Error(`Erro ao executar consulta MySQL: ${error.message}`);
    }
  },
  
  async insertData(connection, tableName, data) {
    try {
      // Verificar se é uma inserção única ou múltipla
      const isMultiple = Array.isArray(data);
      const dataToInsert = isMultiple ? data : [data];
      
      if (dataToInsert.length === 0) {
        throw new Error('Nenhum dado fornecido para inserção');
      }
      
      // Obter nomes das colunas do primeiro objeto
      const columns = Object.keys(dataToInsert[0]);
      
      // Construir placeholders para valores
      const placeholders = dataToInsert.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
      
      // Construir valores para inserção
      const values = [];
      dataToInsert.forEach(item => {
        columns.forEach(column => {
          values.push(item[column]);
        });
      });
      
      // Construir e executar a consulta
      const query = `INSERT INTO \`${tableName}\` (${columns.map(col => `\`${col}\``).join(', ')}) VALUES ${placeholders}`;
      const [result] = await connection.query(query, values);
      
      return {
        affected_rows: result.affectedRows,
        insert_id: result.insertId
      };
    } catch (error) {
      throw new Error(`Erro ao inserir dados MySQL: ${error.message}`);
    }
  },
  
  async updateData(connection, tableName, data, where) {
    try {
      // Construir SET parte da consulta
      const setColumns = Object.keys(data);
      const setClause = setColumns.map(column => `\`${column}\` = ?`).join(', ');
      const setValues = setColumns.map(column => data[column]);
      
      // Construir WHERE parte da consulta
      const whereColumns = Object.keys(where);
      const whereClause = whereColumns.map(column => `\`${column}\` = ?`).join(' AND ');
      const whereValues = whereColumns.map(column => where[column]);
      
      // Construir e executar a consulta
      const query = `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereClause}`;
      const values = [...setValues, ...whereValues];
      
      const [result] = await connection.query(query, values);
      
      return {
        affected_rows: result.affectedRows,
        changed_rows: result.changedRows
      };
    } catch (error) {
      throw new Error(`Erro ao atualizar dados MySQL: ${error.message}`);
    }
  },
  
  async deleteData(connection, tableName, where) {
    try {
      // Construir WHERE parte da consulta
      const whereColumns = Object.keys(where);
      const whereClause = whereColumns.map(column => `\`${column}\` = ?`).join(' AND ');
      const whereValues = whereColumns.map(column => where[column]);
      
      // Construir e executar a consulta
      const query = `DELETE FROM \`${tableName}\` WHERE ${whereClause}`;
      
      const [result] = await connection.query(query, whereValues);
      
      return {
        affected_rows: result.affectedRows
      };
    } catch (error) {
      throw new Error(`Erro ao excluir dados MySQL: ${error.message}`);
    }
  },
  
  async closeConnection(connection) {
    try {
      await connection.end();
    } catch (error) {
      throw new Error(`Erro ao fechar conexão MySQL: ${error.message}`);
    }
  }
};

// PostgreSQL Connector
const postgres = {
  async connect(args) {
    const { Client } = require('pg');
    
    const { host, port, user, password, database, url, options } = args;
    
    let connectionConfig;
    
    if (url) {
      connectionConfig = { connectionString: url, ...options };
    } else {
      connectionConfig = {
        host: host || process.env.PG_HOST || 'localhost',
        port: port || process.env.PG_PORT || 5432,
        user: user || process.env.PG_USER || 'postgres',
        password: password || process.env.PG_PASSWORD || '',
        database: database || process.env.PG_DATABASE,
        ...options
      };
    }
    
    try {
      const client = new Client(connectionConfig);
      await client.connect();
      return client;
    } catch (error) {
      throw new Error(`Erro ao conectar ao PostgreSQL: ${error.message}`);
    }
  },
  
  async listDatabases(connection) {
    try {
      const result = await connection.query('SELECT datname FROM pg_database WHERE datistemplate = false');
      return result.rows.map(row => row.datname);
    } catch (error) {
      throw new Error(`Erro ao listar bancos de dados PostgreSQL: ${error.message}`);
    }
  },
  
  async listTables(connection) {
    try {
      const result = await connection.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      return result.rows.map(row => row.table_name);
    } catch (error) {
      throw new Error(`Erro ao listar tabelas PostgreSQL: ${error.message}`);
    }
  },
  
  async getTableStructure(connection, tableName) {
    try {
      // Obter informações das colunas
      const columnsQuery = `
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          CASE WHEN column_name IN (
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = '${tableName}'::regclass AND i.indisprimary
          ) THEN true ELSE false END as is_primary
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await connection.query(columnsQuery, [tableName]);
      
      // Obter informações dos índices
      const indexesQuery = `
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          CASE
            WHEN ix.indisprimary THEN 'PRIMARY'
            WHEN ix.indisunique THEN 'UNIQUE'
            ELSE 'INDEX'
          END as index_type
        FROM
          pg_class t,
          pg_class i,
          pg_index ix,
          pg_attribute a
        WHERE
          t.oid = ix.indrelid
          AND i.oid = ix.indexrelid
          AND a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
          AND t.relkind = 'r'
          AND t.relname = $1
        ORDER BY
          i.relname, a.attnum
      `;
      
      const indexesResult = await connection.query(indexesQuery, [tableName]);
      
      // Processar índices
      const processedIndexes = {};
      indexesResult.rows.forEach(row => {
        if (!processedIndexes[row.index_name]) {
          processedIndexes[row.index_name] = {
            name: row.index_name,
            columns: [],
            unique: row.is_unique,
            type: row.index_type
          };
        }
        processedIndexes[row.index_name].columns.push(row.column_name);
      });
      
      return {
        table_name: tableName,
        columns: columnsResult.rows.map(column => ({
          name: column.column_name,
          type: column.data_type,
          nullable: column.is_nullable === 'YES',
          default: column.column_default,
          primary_key: column.is_primary
        })),
        indexes: Object.values(processedIndexes)
      };
    } catch (error) {
      throw new Error(`Erro ao obter estrutura da tabela PostgreSQL: ${error.message}`);
    }
  },
  
  async executeQuery(connection, query, params = []) {
    try {
      const result = await connection.query(query, params);
      
      // Verificar se é uma consulta SELECT
      if (result.command === 'SELECT') {
        return {
          results: result.rows,
          fields: result.fields ? result.fields.map(field => field.name) : [],
          affected_rows: result.rowCount
        };
      } else {
        // Para operações de modificação (INSERT, UPDATE, DELETE)
        return {
          affected_rows: result.rowCount,
          command: result.command
        };
      }
    } catch (error) {
      throw new Error(`Erro ao executar consulta PostgreSQL: ${error.message}`);
    }
  },
  
  async insertData(connection, tableName, data) {
    try {
      // Verificar se é uma inserção única ou múltipla
      const isMultiple = Array.isArray(data);
      const dataToInsert = isMultiple ? data : [data];
      
      if (dataToInsert.length === 0) {
        throw new Error('Nenhum dado fornecido para inserção');
      }
      
      // Obter nomes das colunas do primeiro objeto
      const columns = Object.keys(dataToInsert[0]);
      
      // Construir consultas para cada linha
      const results = [];
      
      for (const item of dataToInsert) {
        const placeholders = [];
        const values = [];
        let paramIndex = 1;
        
        columns.forEach(column => {
          placeholders.push(`$${paramIndex}`);
          values.push(item[column]);
          paramIndex++;
        });
        
        const query = `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) 
                       VALUES (${placeholders.join(', ')}) RETURNING *`;
        
        const result = await connection.query(query, values);
        results.push(result.rows[0]);
      }
      
      return {
        affected_rows: results.length,
        results: results
      };
    } catch (error) {
      throw new Error(`Erro ao inserir dados PostgreSQL: ${error.message}`);
    }
  },
  
  async updateData(connection, tableName, data, where) {
    try {
      // Construir SET parte da consulta
      const setColumns = Object.keys(data);
      const setClause = [];
      const values = [];
      let paramIndex = 1;
      
      setColumns.forEach(column => {
        setClause.push(`"${column}" = $${paramIndex}`);
        values.push(data[column]);
        paramIndex++;
      });
      
      // Construir WHERE parte da consulta
      const whereColumns = Object.keys(where);
      const whereClause = [];
      
      whereColumns.forEach(column => {
        whereClause.push(`"${column}" = $${paramIndex}`);
        values.push(where[column]);
        paramIndex++;
      });
      
      // Construir e executar a consulta
      const query = `UPDATE "${tableName}" SET ${setClause.join(', ')} WHERE ${whereClause.join(' AND ')} RETURNING *`;
      
      const result = await connection.query(query, values);
      
      return {
        affected_rows: result.rowCount,
        results: result.rows
      };
    } catch (error) {
      throw new Error(`Erro ao atualizar dados PostgreSQL: ${error.message}`);
    }
  },
  
  async deleteData(connection, tableName, where) {
    try {
      // Construir WHERE parte da consulta
      const whereColumns = Object.keys(where);
      const whereClause = [];
      const values = [];
      let paramIndex = 1;
      
      whereColumns.forEach(column => {
        whereClause.push(`"${column}" = $${paramIndex}`);
        values.push(where[column]);
        paramIndex++;
      });
      
      // Construir e executar a consulta
      const query = `DELETE FROM "${tableName}" WHERE ${whereClause.join(' AND ')} RETURNING *`;
      
      const result = await connection.query(query, values);
      
      return {
        affected_rows: result.rowCount,
        results: result.rows
      };
    } catch (error) {
      throw new Error(`Erro ao excluir dados PostgreSQL: ${error.message}`);
    }
  },
  
  async closeConnection(connection) {
    try {
      await connection.end();
    } catch (error) {
      throw new Error(`Erro ao fechar conexão PostgreSQL: ${error.message}`);
    }
  }
};

// SQLite Connector
const sqlite = {
  async connect(args) {
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    const { database } = args;
    
    if (!database) {
      throw new Error('Caminho do banco de dados SQLite não especificado');
    }
    
    try {
      const db = await open({
        filename: database,
        driver: sqlite3.Database
      });
      
      // Habilitar chaves estrangeiras
      await db.run('PRAGMA foreign_keys = ON');
      
      return db;
    } catch (error) {
      throw new Error(`Erro ao conectar ao SQLite: ${error.message}`);
    }
  },
  
  async listDatabases() {
    // SQLite não tem conceito de múltiplos bancos de dados
    return ['main'];
  },
  
  async listTables(connection) {
    try {
      const result = await connection.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      return result.map(row => row.name);
    } catch (error) {
      throw new Error(`Erro ao listar tabelas SQLite: ${error.message}`);
    }
  },
  
  async getTableStructure(connection, tableName) {
    try {
      // Obter informações das colunas
      const columnsResult = await connection.all(`PRAGMA table_info(${tableName})`);
      
      // Obter informações dos índices
      const indexesResult = await connection.all(`PRAGMA index_list(${tableName})`);
      
      // Processar índices
      const processedIndexes = [];
      
      for (const index of indexesResult) {
        const indexColumns = await connection.all(`PRAGMA index_info(${index.name})`);
        
        processedIndexes.push({
          name: index.name,
          columns: indexColumns.map(col => col.name),
          unique: index.unique === 1,
          type: index.origin === 'pk' ? 'PRIMARY' : (index.unique === 1 ? 'UNIQUE' : 'INDEX')
        });
      }
      
      return {
        table_name: tableName,
        columns: columnsResult.map(column => ({
          name: column.name,
          type: column.type,
          nullable: column.notnull === 0,
          default: column.dflt_value,
          primary_key: column.pk === 1
        })),
        indexes: processedIndexes
      };
    } catch (error) {
      throw new Error(`Erro ao obter estrutura da tabela SQLite: ${error.message}`);
    }
  },
  
  async executeQuery(connection, query, params = []) {
    try {
      // Verificar se é uma consulta SELECT
      const isSelect = query.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        const results = await connection.all(query, params);
        return {
          results,
          affected_rows: results.length
        };
      } else {
        const result = await connection.run(query, params);
        return {
          affected_rows: result.changes,
          last_id: result.lastID
        };
      }
    } catch (error) {
      throw new Error(`Erro ao executar consulta SQLite: ${error.message}`);
    }
  },
  
  async insertData(connection, tableName, data) {
    try {
      // Verificar se é uma inserção única ou múltipla
      const isMultiple = Array.isArray(data);
      const dataToInsert = isMultiple ? data : [data];
      
      if (dataToInsert.length === 0) {
        throw new Error('Nenhum dado fornecido para inserção');
      }
      
      // Iniciar transação
      await connection.run('BEGIN TRANSACTION');
      
      const results = [];
      
      try {
        for (const item of dataToInsert) {
          const columns = Object.keys(item);
          const placeholders = columns.map(() => '?').join(', ');
          const values = columns.map(column => item[column]);
          
          const query = `INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')}) VALUES (${placeholders})`;
          
          const result = await connection.run(query, values);
          results.push({
            id: result.lastID,
            changes: result.changes
          });
        }
        
        // Confirmar transação
        await connection.run('COMMIT');
        
        return {
          affected_rows: results.length,
          results: results
        };
      } catch (error) {
        // Reverter transação em caso de erro
        await connection.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw new Error(`Erro ao inserir dados SQLite: ${error.message}`);
    }
  },
  
  async updateData(connection, tableName, data, where) {
    try {
      // Construir SET parte da consulta
      const setColumns = Object.keys(data);
      const setClause = setColumns.map(column => `"${column}" = ?`).join(', ');
      const setValues = setColumns.map(column => data[column]);
      
      // Construir WHERE parte da consulta
      const whereColumns = Object.keys(where);
      const whereClause = whereColumns.map(column => `"${column}" = ?`).join(' AND ');
      const whereValues = whereColumns.map(column => where[column]);
      
      // Construir e executar a consulta
      const query = `UPDATE "${tableName}" SET ${setClause} WHERE ${whereClause}`;
      const values = [...setValues, ...whereValues];
      
      const result = await connection.run(query, values);
      
      return {
        affected_rows: result.changes
      };
    } catch (error) {
      throw new Error(`Erro ao atualizar dados SQLite: ${error.message}`);
    }
  },
  
  async deleteData(connection, tableName, where) {
    try {
      // Construir WHERE parte da consulta
      const whereColumns = Object.keys(where);
      const whereClause = whereColumns.map(column => `"${column}" = ?`).join(' AND ');
      const whereValues = whereColumns.map(column => where[column]);
      
      // Construir e executar a consulta
      const query = `DELETE FROM "${tableName}" WHERE ${whereClause}`;
      
      const result = await connection.run(query, whereValues);
      
      return {
        affected_rows: result.changes
      };
    } catch (error) {
      throw new Error(`Erro ao excluir dados SQLite: ${error.message}`);
    }
  },
  
  async closeConnection(connection) {
    try {
      await connection.close();
    } catch (error) {
      throw new Error(`Erro ao fechar conexão SQLite: ${error.message}`);
    }
  }
};

// SQL Server Connector
const mssql = {
  async connect(args) {
    const sql = require('mssql');
    
    const { server, port, user, password, database, url, options } = args;
    
    let connectionConfig;
    
    if (url) {
      connectionConfig = url;
    } else {
      connectionConfig = {
        server: server || process.env.MSSQL_SERVER || 'localhost',
        port: port || process.env.MSSQL_PORT || 1433,
        user: user || process.env.MSSQL_USER || 'sa',
        password: password || process.env.MSSQL_PASSWORD || '',
        database: database || process.env.MSSQL_DATABASE,
        options: {
          trustServerCertificate: true,
          ...options
        }
      };
    }
    
    try {
      const pool = await sql.connect(connectionConfig);
      return pool;
    } catch (error) {
      throw new Error(`Erro ao conectar ao SQL Server: ${error.message}`);
    }
  },
  
  async listDatabases(connection) {
    try {
      const result = await connection.request().query('SELECT name FROM sys.databases WHERE database_id > 4');
      return result.recordset.map(row => row.name);
    } catch (error) {
      throw new Error(`Erro ao listar bancos de dados SQL Server: ${error.message}`);
    }
  },
  
  async listTables(connection) {
    try {
      const result = await connection.request().query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
      );
      return result.recordset.map(row => row.TABLE_NAME);
    } catch (error) {
      throw new Error(`Erro ao listar tabelas SQL Server: ${error.message}`);
    }
  },
  
  async getTableStructure(connection, tableName) {
    try {
      // Obter informações das colunas
      const columnsQuery = `
        SELECT 
          c.COLUMN_NAME as name,
          c.DATA_TYPE as type,
          c.IS_NULLABLE as nullable,
          c.COLUMN_DEFAULT as default_value,
          CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as is_primary,
          CASE WHEN c.COLUMN_NAME IN (SELECT name FROM sys.identity_columns WHERE object_id = OBJECT_ID(@tableName)) THEN 1 ELSE 0 END as is_identity
        FROM 
          INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN (
          SELECT ku.COLUMN_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
            ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            AND ku.TABLE_NAME = @tableName
        ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
        WHERE c.TABLE_NAME = @tableName
        ORDER BY c.ORDINAL_POSITION
      `;
      
      const request = connection.request();
      request.input('tableName', tableName);
      const columnsResult = await request.query(columnsQuery);
      
      // Obter informações dos índices
      const indexesQuery = `
        SELECT 
          i.name as index_name,
          COL_NAME(ic.object_id, ic.column_id) as column_name,
          i.is_unique,
          i.is_primary_key,
          i.type_desc as index_type
        FROM 
          sys.indexes i
        JOIN 
          sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        WHERE 
          i.object_id = OBJECT_ID(@tableName)
        ORDER BY 
          i.name, ic.key_ordinal
      `;
      
      const indexRequest = connection.request();
      indexRequest.input('tableName', tableName);
      const indexesResult = await indexRequest.query(indexesQuery);
      
      // Processar índices
      const processedIndexes = {};
      indexesResult.recordset.forEach(row => {
        if (!processedIndexes[row.index_name]) {
          processedIndexes[row.index_name] = {
            name: row.index_name,
            columns: [],
            unique: row.is_unique,
            type: row.is_primary_key ? 'PRIMARY' : (row.is_unique ? 'UNIQUE' : row.index_type)
          };
        }
        processedIndexes[row.index_name].columns.push(row.column_name);
      });
      
      return {
        table_name: tableName,
        columns: columnsResult.recordset.map(column => ({
          name: column.name,
          type: column.type,
          nullable: column.nullable === 'YES',
          default: column.default_value,
          primary_key: column.is_primary === 1,
          auto_increment: column.is_identity === 1
        })),
        indexes: Object.values(processedIndexes)
      };
    } catch (error) {
      throw new Error(`Erro ao obter estrutura da tabela SQL Server: ${error.message}`);
    }
  },
  
  async executeQuery(connection, query, params = []) {
    try {
      const request = connection.request();
      
      // Adicionar parâmetros, se fornecidos
      if (Array.isArray(params) && params.length > 0) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
        
        // Substituir placeholders ? por @paramX
        let paramIndex = 0;
        query = query.replace(/\?/g, () => `@param${paramIndex++}`);
      }
      
      const result = await request.query(query);
      
      // Verificar se é uma consulta SELECT
      if (result.recordset) {
        return {
          results: result.recordset,
          fields: result.recordset.columns ? Object.keys(result.recordset.columns) : [],
          affected_rows: result.recordset.length
        };
      } else {
        // Para operações de modificação (INSERT, UPDATE, DELETE)
        return {
          affected_rows: result.rowsAffected[0]
        };
      }
    } catch (error) {
      throw new Error(`Erro ao executar consulta SQL Server: ${error.message}`);
    }
  },
  
  async insertData(connection, tableName, data) {
    try {
      // Verificar se é uma inserção única ou múltipla
      const isMultiple = Array.isArray(data);
      const dataToInsert = isMultiple ? data : [data];
      
      if (dataToInsert.length === 0) {
        throw new Error('Nenhum dado fornecido para inserção');
      }
      
      // Iniciar transação
      const transaction = connection.transaction();
      await transaction.begin();
      
      const results = [];
      
      try {
        for (const item of dataToInsert) {
          const columns = Object.keys(item);
          const request = transaction.request();
          
          // Adicionar parâmetros
          columns.forEach((column, index) => {
            request.input(`p${index}`, item[column]);
          });
          
          // Construir consulta
          const query = `
            INSERT INTO [${tableName}] (${columns.map(col => `[${col}]`).join(', ')})
            OUTPUT INSERTED.*
            VALUES (${columns.map((_, index) => `@p${index}`).join(', ')})
          `;
          
          const result = await request.query(query);
          results.push(result.recordset[0]);
        }
        
        // Confirmar transação
        await transaction.commit();
        
        return {
          affected_rows: results.length,
          results: results
        };
      } catch (error) {
        // Reverter transação em caso de erro
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      throw new Error(`Erro ao inserir dados SQL Server: ${error.message}`);
    }
  },
  
  async updateData(connection, tableName, data, where) {
    try {
      // Construir SET parte da consulta
      const setColumns = Object.keys(data);
      const whereColumns = Object.keys(where);
      
      const request = connection.request();
      
      // Adicionar parâmetros SET
      setColumns.forEach((column, index) => {
        request.input(`set${index}`, data[column]);
      });
      
      // Adicionar parâmetros WHERE
      whereColumns.forEach((column, index) => {
        request.input(`where${index}`, where[column]);
      });
      
      // Construir consulta
      const query = `
        UPDATE [${tableName}]
        SET ${setColumns.map((col, index) => `[${col}] = @set${index}`).join(', ')}
        OUTPUT INSERTED.*
        WHERE ${whereColumns.map((col, index) => `[${col}] = @where${index}`).join(' AND ')}
      `;
      
      const result = await request.query(query);
      
      return {
        affected_rows: result.rowsAffected[0],
        results: result.recordset
      };
    } catch (error) {
      throw new Error(`Erro ao atualizar dados SQL Server: ${error.message}`);
    }
  },
  
  async deleteData(connection, tableName, where) {
    try {
      // Construir WHERE parte da consulta
      const whereColumns = Object.keys(where);
      
      const request = connection.request();
      
      // Adicionar parâmetros WHERE
      whereColumns.forEach((column, index) => {
        request.input(`where${index}`, where[column]);
      });
      
      // Construir consulta
      const query = `
        DELETE FROM [${tableName}]
        OUTPUT DELETED.*
        WHERE ${whereColumns.map((col, index) => `[${col}] = @where${index}`).join(' AND ')}
      `;
      
      const result = await request.query(query);
      
      return {
        affected_rows: result.rowsAffected[0],
        results: result.recordset
      };
    } catch (error) {
      throw new Error(`Erro ao excluir dados SQL Server: ${error.message}`);
    }
  },
  
  async closeConnection(connection) {
    try {
      await connection.close();
    } catch (error) {
      throw new Error(`Erro ao fechar conexão SQL Server: ${error.message}`);
    }
  }
};

// MongoDB Connector
const mongodb = {
  async connect(args) {
    const { MongoClient } = require('mongodb');
    
    const { url, host, port, user, password, database, options } = args;
    
    let connectionString;
    
    if (url) {
      connectionString = url;
    } else {
      const auth = user && password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : '';
      const dbHost = host || process.env.MONGO_HOST || 'localhost';
      const dbPort = port || process.env.MONGO_PORT || 27017;
      connectionString = `mongodb://${auth}${dbHost}:${dbPort}`;
    }
    
    try {
      const client = new MongoClient(connectionString, options);
      await client.connect();
      
      const dbName = database || process.env.MONGO_DATABASE || 'test';
      const db = client.db(dbName);
      
      // Armazenar o cliente para poder fechar a conexão posteriormente
      db.client = client;
      
      return db;
    } catch (error) {
      throw new Error(`Erro ao conectar ao MongoDB: ${error.message}`);
    }
  },
  
  async listDatabases(connection) {
    try {
      const adminDb = connection.client.db('admin');
      const result = await adminDb.admin().listDatabases();
      return result.databases.map(db => db.name);
    } catch (error) {
      throw new Error(`Erro ao listar bancos de dados MongoDB: ${error.message}`);
    }
  },
  
  async listTables(connection) {
    try {
      const collections = await connection.listCollections().toArray();
      return collections.map(collection => collection.name);
    } catch (error) {
      throw new Error(`Erro ao listar coleções MongoDB: ${error.message}`);
    }
  },
  
  async getTableStructure(connection, tableName) {
    try {
      // MongoDB não tem um esquema fixo, então vamos inferir a estrutura a partir dos documentos
      const collection = connection.collection(tableName);
      
      // Obter uma amostra de documentos para inferir o esquema
      const sampleSize = 100;
      const documents = await collection.find().limit(sampleSize).toArray();
      
      if (documents.length === 0) {
        return {
          table_name: tableName,
          columns: [],
          indexes: []
        };
      }
      
      // Inferir tipos de campo a partir dos documentos
      const fieldTypes = {};
      
      documents.forEach(doc => {
        Object.entries(doc).forEach(([key, value]) => {
          if (key === '_id') return; // Ignorar campo _id
          
          const type = typeof value;
          
          if (!fieldTypes[key]) {
            fieldTypes[key] = { type, nullable: false, count: 1 };
          } else {
            fieldTypes[key].count++;
            
            // Se o tipo for diferente do já registrado, marcar como mixed
            if (fieldTypes[key].type !== type) {
              fieldTypes[key].type = 'mixed';
            }
          }
        });
      });
      
      // Verificar campos que não aparecem em todos os documentos (potencialmente nullable)
      Object.keys(fieldTypes).forEach(key => {
        if (fieldTypes[key].count < documents.length) {
          fieldTypes[key].nullable = true;
        }
      });
      
      // Obter índices
      const indexes = await collection.indexes();
      
      // Processar índices
      const processedIndexes = indexes.map(index => ({
        name: index.name,
        columns: Object.keys(index.key),
        unique: index.unique || false,
        type: index.name === '_id_' ? 'PRIMARY' : (index.unique ? 'UNIQUE' : 'INDEX')
      }));
      
      return {
        table_name: tableName,
        columns: Object.entries(fieldTypes).map(([name, info]) => ({
          name,
          type: info.type,
          nullable: info.nullable
        })),
        indexes: processedIndexes
      };
    } catch (error) {
      throw new Error(`Erro ao obter estrutura da coleção MongoDB: ${error.message}`);
    }
  },
  
  async executeQuery(connection, query, params = []) {
    try {
      // No MongoDB, a "consulta" é um objeto JSON que representa uma operação
      let operation;
      
      try {
        operation = JSON.parse(query);
      } catch (e) {
        throw new Error(`Consulta MongoDB inválida: ${e.message}`);
      }
      
      if (!operation.collection) {
        throw new Error('Nome da coleção não especificado na consulta');
      }
      
      const collection = connection.collection(operation.collection);
      
      // Executar a operação apropriada
      let result;
      
      switch (operation.action) {
        case 'find':
          const filter = operation.filter || {};
          const options = operation.options || {};
          
          let cursor = collection.find(filter, options);
          
          if (operation.sort) {
            cursor = cursor.sort(operation.sort);
          }
          
          if (operation.skip) {
            cursor = cursor.skip(operation.skip);
          }
          
          if (operation.limit) {
            cursor = cursor.limit(operation.limit);
          }
          
          result = await cursor.toArray();
          return {
            results: result,
            affected_rows: result.length
          };
          
        case 'findOne':
          result = await collection.findOne(operation.filter || {}, operation.options || {});
          return {
            results: result ? [result] : [],
            affected_rows: result ? 1 : 0
          };
          
        case 'insertOne':
          result = await collection.insertOne(operation.document);
          return {
            inserted_id: result.insertedId,
            affected_rows: result.acknowledged ? 1 : 0
          };
          
        case 'insertMany':
          result = await collection.insertMany(operation.documents);
          return {
            inserted_ids: result.insertedIds,
            affected_rows: result.insertedCount
          };
          
        case 'updateOne':
          result = await collection.updateOne(
            operation.filter || {},
            operation.update,
            operation.options || {}
          );
          return {
            matched_count: result.matchedCount,
            modified_count: result.modifiedCount,
            affected_rows: result.modifiedCount
          };
          
        case 'updateMany':
          result = await collection.updateMany(
            operation.filter || {},
            operation.update,
            operation.options || {}
          );
          return {
            matched_count: result.matchedCount,
            modified_count: result.modifiedCount,
            affected_rows: result.modifiedCount
          };
          
        case 'deleteOne':
          result = await collection.deleteOne(
            operation.filter || {},
            operation.options || {}
          );
          return {
            deleted_count: result.deletedCount,
            affected_rows: result.deletedCount
          };
          
        case 'deleteMany':
          result = await collection.deleteMany(
            operation.filter || {},
            operation.options || {}
          );
          return {
            deleted_count: result.deletedCount,
            affected_rows: result.deletedCount
          };
          
        case 'aggregate':
          result = await collection.aggregate(operation.pipeline, operation.options || {}).toArray();
          return {
            results: result,
            affected_rows: result.length
          };
          
        case 'count':
          result = await collection.countDocuments(operation.filter || {}, operation.options || {});
          return {
            count: result,
            affected_rows: 0
          };
          
        case 'distinct':
          result = await collection.distinct(operation.field, operation.filter || {}, operation.options || {});
          return {
            results: result,
            affected_rows: result.length
          };
          
        default:
          throw new Error(`Operação MongoDB não suportada: ${operation.action}`);
      }
    } catch (error) {
      throw new Error(`Erro ao executar operação MongoDB: ${error.message}`);
    }
  },
  
  async insertData(connection, tableName, data) {
    try {
      const collection = connection.collection(tableName);
      
      // Verificar se é uma inserção única ou múltipla
      const isMultiple = Array.isArray(data);
      
      let result;
      
      if (isMultiple) {
        result = await collection.insertMany(data);
        return {
          inserted_ids: result.insertedIds,
          affected_rows: result.insertedCount
        };
      } else {
        result = await collection.insertOne(data);
        return {
          inserted_id: result.insertedId,
          affected_rows: result.acknowledged ? 1 : 0
        };
      }
    } catch (error) {
      throw new Error(`Erro ao inserir dados MongoDB: ${error.message}`);
    }
  },
  
  async updateData(connection, tableName, data, where) {
    try {
      const collection = connection.collection(tableName);
      
      const result = await collection.updateMany(
        where,
        { $set: data }
      );
      
      return {
        matched_count: result.matchedCount,
        modified_count: result.modifiedCount,
        affected_rows: result.modifiedCount
      };
    } catch (error) {
      throw new Error(`Erro ao atualizar dados MongoDB: ${error.message}`);
    }
  },
  
  async deleteData(connection, tableName, where) {
    try {
      const collection = connection.collection(tableName);
      
      const result = await collection.deleteMany(where);
      
      return {
        deleted_count: result.deletedCount,
        affected_rows: result.deletedCount
      };
    } catch (error) {
      throw new Error(`Erro ao excluir dados MongoDB: ${error.message}`);
    }
  },
  
  async closeConnection(connection) {
    try {
      await connection.client.close();
    } catch (error) {
      throw new Error(`Erro ao fechar conexão MongoDB: ${error.message}`);
    }
  }
};

module.exports = {
  mysql,
  postgres,
  sqlite,
  mssql,
  mongodb
};
