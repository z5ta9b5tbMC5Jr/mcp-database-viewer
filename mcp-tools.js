/**
 * Implementação das ferramentas de banco de dados para o MCP Database Viewer
 */

const { v4: uuidv4 } = require('uuid');
const connectors = require('./connectors');

// Armazenar conexões ativas
const activeConnections = {};

/**
 * Conecta a um banco de dados
 * @param {object} args - Argumentos de conexão
 * @returns {Promise<object>} - Resultado da conexão
 */
async function connectToDatabase(args) {
  const { type } = args;
  
  if (!type) {
    throw new Error('Tipo de banco de dados não especificado');
  }
  
  // Verificar se o tipo de banco de dados é suportado
  if (!connectors[type]) {
    throw new Error(`Tipo de banco de dados '${type}' não suportado`);
  }
  
  // Gerar ID de conexão único
  const connectionId = `conn_${uuidv4().replace(/-/g, '')}`;
  
  try {
    // Estabelecer conexão usando o conector apropriado
    const connection = await connectors[type].connect(args);
    
    // Armazenar a conexão ativa
    activeConnections[connectionId] = {
      type,
      connection,
      createdAt: new Date(),
      lastUsed: new Date()
    };
    
    return {
      connection_id: connectionId,
      type,
      message: `Conexão estabelecida com ${type}`
    };
  } catch (error) {
    throw new Error(`Erro ao conectar ao banco de dados ${type}: ${error.message}`);
  }
}

/**
 * Lista os bancos de dados disponíveis no servidor
 * @param {object} args - Argumentos da operação
 * @returns {Promise<object>} - Lista de bancos de dados
 */
async function listDatabases(args) {
  const { connection_id } = args;
  
  if (!connection_id) {
    throw new Error('ID de conexão não especificado');
  }
  
  // Verificar se a conexão existe
  if (!activeConnections[connection_id]) {
    throw new Error(`Conexão '${connection_id}' não encontrada`);
  }
  
  const { type, connection } = activeConnections[connection_id];
  
  try {
    // Atualizar timestamp de último uso
    activeConnections[connection_id].lastUsed = new Date();
    
    // Listar bancos de dados usando o conector apropriado
    const databases = await connectors[type].listDatabases(connection);
    
    return {
      databases
    };
  } catch (error) {
    throw new Error(`Erro ao listar bancos de dados: ${error.message}`);
  }
}

/**
 * Lista as tabelas/coleções disponíveis no banco de dados conectado
 * @param {object} args - Argumentos da operação
 * @returns {Promise<object>} - Lista de tabelas/coleções
 */
async function listTables(args) {
  const { connection_id } = args;
  
  if (!connection_id) {
    throw new Error('ID de conexão não especificado');
  }
  
  // Verificar se a conexão existe
  if (!activeConnections[connection_id]) {
    throw new Error(`Conexão '${connection_id}' não encontrada`);
  }
  
  const { type, connection } = activeConnections[connection_id];
  
  try {
    // Atualizar timestamp de último uso
    activeConnections[connection_id].lastUsed = new Date();
    
    // Listar tabelas usando o conector apropriado
    const tables = await connectors[type].listTables(connection);
    
    return {
      tables
    };
  } catch (error) {
    throw new Error(`Erro ao listar tabelas: ${error.message}`);
  }
}

/**
 * Obtém a estrutura de uma tabela/coleção específica
 * @param {object} args - Argumentos da operação
 * @returns {Promise<object>} - Estrutura da tabela/coleção
 */
async function getTableStructure(args) {
  const { connection_id, table_name } = args;
  
  if (!connection_id) {
    throw new Error('ID de conexão não especificado');
  }
  
  if (!table_name) {
    throw new Error('Nome da tabela não especificado');
  }
  
  // Verificar se a conexão existe
  if (!activeConnections[connection_id]) {
    throw new Error(`Conexão '${connection_id}' não encontrada`);
  }
  
  const { type, connection } = activeConnections[connection_id];
  
  try {
    // Atualizar timestamp de último uso
    activeConnections[connection_id].lastUsed = new Date();
    
    // Obter estrutura da tabela usando o conector apropriado
    const structure = await connectors[type].getTableStructure(connection, table_name);
    
    return structure;
  } catch (error) {
    throw new Error(`Erro ao obter estrutura da tabela: ${error.message}`);
  }
}

/**
 * Executa uma consulta SQL ou operação NoSQL
 * @param {object} args - Argumentos da operação
 * @returns {Promise<object>} - Resultado da consulta
 */
async function executeQuery(args) {
  const { connection_id, query, params } = args;
  
  if (!connection_id) {
    throw new Error('ID de conexão não especificado');
  }
  
  if (!query) {
    throw new Error('Consulta não especificada');
  }
  
  // Verificar se a conexão existe
  if (!activeConnections[connection_id]) {
    throw new Error(`Conexão '${connection_id}' não encontrada`);
  }
  
  const { type, connection } = activeConnections[connection_id];
  
  try {
    // Atualizar timestamp de último uso
    activeConnections[connection_id].lastUsed = new Date();
    
    // Executar consulta usando o conector apropriado
    const result = await connectors[type].executeQuery(connection, query, params);
    
    return result;
  } catch (error) {
    throw new Error(`Erro ao executar consulta: ${error.message}`);
  }
}

/**
 * Insere dados em uma tabela/coleção
 * @param {object} args - Argumentos da operação
 * @returns {Promise<object>} - Resultado da inserção
 */
async function insertData(args) {
  const { connection_id, table_name, data } = args;
  
  if (!connection_id) {
    throw new Error('ID de conexão não especificado');
  }
  
  if (!table_name) {
    throw new Error('Nome da tabela não especificado');
  }
  
  if (!data) {
    throw new Error('Dados para inserção não especificados');
  }
  
  // Verificar se a conexão existe
  if (!activeConnections[connection_id]) {
    throw new Error(`Conexão '${connection_id}' não encontrada`);
  }
  
  const { type, connection } = activeConnections[connection_id];
  
  try {
    // Atualizar timestamp de último uso
    activeConnections[connection_id].lastUsed = new Date();
    
    // Inserir dados usando o conector apropriado
    const result = await connectors[type].insertData(connection, table_name, data);
    
    return result;
  } catch (error) {
    throw new Error(`Erro ao inserir dados: ${error.message}`);
  }
}

/**
 * Atualiza dados em uma tabela/coleção
 * @param {object} args - Argumentos da operação
 * @returns {Promise<object>} - Resultado da atualização
 */
async function updateData(args) {
  const { connection_id, table_name, data, where } = args;
  
  if (!connection_id) {
    throw new Error('ID de conexão não especificado');
  }
  
  if (!table_name) {
    throw new Error('Nome da tabela não especificado');
  }
  
  if (!data) {
    throw new Error('Dados para atualização não especificados');
  }
  
  if (!where) {
    throw new Error('Condição WHERE não especificada');
  }
  
  // Verificar se a conexão existe
  if (!activeConnections[connection_id]) {
    throw new Error(`Conexão '${connection_id}' não encontrada`);
  }
  
  const { type, connection } = activeConnections[connection_id];
  
  try {
    // Atualizar timestamp de último uso
    activeConnections[connection_id].lastUsed = new Date();
    
    // Atualizar dados usando o conector apropriado
    const result = await connectors[type].updateData(connection, table_name, data, where);
    
    return result;
  } catch (error) {
    throw new Error(`Erro ao atualizar dados: ${error.message}`);
  }
}

/**
 * Exclui dados de uma tabela/coleção
 * @param {object} args - Argumentos da operação
 * @returns {Promise<object>} - Resultado da exclusão
 */
async function deleteData(args) {
  const { connection_id, table_name, where } = args;
  
  if (!connection_id) {
    throw new Error('ID de conexão não especificado');
  }
  
  if (!table_name) {
    throw new Error('Nome da tabela não especificado');
  }
  
  if (!where) {
    throw new Error('Condição WHERE não especificada');
  }
  
  // Verificar se a conexão existe
  if (!activeConnections[connection_id]) {
    throw new Error(`Conexão '${connection_id}' não encontrada`);
  }
  
  const { type, connection } = activeConnections[connection_id];
  
  try {
    // Atualizar timestamp de último uso
    activeConnections[connection_id].lastUsed = new Date();
    
    // Excluir dados usando o conector apropriado
    const result = await connectors[type].deleteData(connection, table_name, where);
    
    return result;
  } catch (error) {
    throw new Error(`Erro ao excluir dados: ${error.message}`);
  }
}

/**
 * Fecha uma conexão com o banco de dados
 * @param {object} args - Argumentos da operação
 * @returns {Promise<object>} - Resultado do fechamento da conexão
 */
async function closeConnection(args) {
  const { connection_id } = args;
  
  if (!connection_id) {
    throw new Error('ID de conexão não especificado');
  }
  
  // Verificar se a conexão existe
  if (!activeConnections[connection_id]) {
    throw new Error(`Conexão '${connection_id}' não encontrada`);
  }
  
  const { type, connection } = activeConnections[connection_id];
  
  try {
    // Fechar conexão usando o conector apropriado
    await connectors[type].closeConnection(connection);
    
    // Remover conexão da lista de conexões ativas
    delete activeConnections[connection_id];
    
    return {
      message: `Conexão ${connection_id} fechada com sucesso`
    };
  } catch (error) {
    throw new Error(`Erro ao fechar conexão: ${error.message}`);
  }
}

module.exports = {
  connectToDatabase,
  listDatabases,
  listTables,
  getTableStructure,
  executeQuery,
  insertData,
  updateData,
  deleteData,
  closeConnection
};
