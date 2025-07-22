/**
 * Utilitários para o MCP Database Viewer
 */

/**
 * Formata o resultado de uma consulta para exibição
 * @param {Object} result - Resultado da consulta
 * @returns {Object} Resultado formatado
 */
function formatQueryResult(result) {
  // Se não houver resultado, retornar objeto vazio
  if (!result) return { success: false, message: 'Nenhum resultado retornado' };
  
  // Formatar o resultado para exibição
  const formatted = {
    success: true,
    ...result
  };
  
  return formatted;
}

/**
 * Valida os parâmetros de conexão para diferentes tipos de banco de dados
 * @param {string} dbType - Tipo de banco de dados (mysql, postgres, sqlite, mssql, mongodb)
 * @param {Object} params - Parâmetros de conexão
 * @returns {Object} Resultado da validação { valid: boolean, message: string }
 */
function validateConnectionParams(dbType, params) {
  if (!dbType) {
    return { valid: false, message: 'Tipo de banco de dados não especificado' };
  }
  
  switch (dbType.toLowerCase()) {
    case 'mysql':
    case 'postgres':
    case 'mssql':
      // Verificar se tem URL ou credenciais básicas
      if (!params.url && (!params.host || !params.user)) {
        return { 
          valid: false, 
          message: `Parâmetros insuficientes para conexão ${dbType}. Forneça uma URL ou host/user/password` 
        };
      }
      break;
      
    case 'sqlite':
      // SQLite precisa de um caminho de arquivo de banco de dados
      if (!params.database) {
        return { 
          valid: false, 
          message: 'Caminho do banco de dados SQLite não especificado' 
        };
      }
      break;
      
    case 'mongodb':
      // MongoDB precisa de URL ou host
      if (!params.url && !params.host) {
        return { 
          valid: false, 
          message: 'URL ou host MongoDB não especificado' 
        };
      }
      break;
      
    default:
      return { 
        valid: false, 
        message: `Tipo de banco de dados não suportado: ${dbType}` 
      };
  }
  
  return { valid: true };
}

/**
 * Gera um ID único para uma conexão
 * @returns {string} ID único
 */
function generateConnectionId() {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitiza uma string para uso seguro em consultas SQL
 * @param {string} str - String a ser sanitizada
 * @returns {string} String sanitizada
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // Remover caracteres potencialmente perigosos
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, function (char) {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"": return "\\\"";
      case "'": return "\\'"; 
      case "\\": return "\\\\";
      case "%": return "\\%";
      default: return char;
    }
  });
}

/**
 * Valida uma consulta SQL básica para evitar operações perigosas
 * @param {string} query - Consulta SQL a ser validada
 * @returns {Object} Resultado da validação { valid: boolean, message: string }
 */
function validateSqlQuery(query) {
  if (typeof query !== 'string') {
    return { valid: false, message: 'A consulta deve ser uma string' };
  }
  
  // Verificar se a consulta está vazia
  if (!query.trim()) {
    return { valid: false, message: 'A consulta está vazia' };
  }
  
  // Lista de comandos potencialmente perigosos
  const dangerousCommands = [
    /\bDROP\s+DATABASE\b/i,
    /\bDROP\s+TABLE\b/i,
    /\bTRUNCATE\s+TABLE\b/i,
    /\bALTER\s+DATABASE\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bUPDATE\s+.+\s+SET\b/i
  ];
  
  // Verificar se a consulta contém comandos perigosos
  for (const pattern of dangerousCommands) {
    if (pattern.test(query)) {
      return { 
        valid: false, 
        message: 'A consulta contém operações potencialmente perigosas' 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Valida uma operação MongoDB para evitar operações perigosas
 * @param {Object} operation - Operação MongoDB a ser validada
 * @returns {Object} Resultado da validação { valid: boolean, message: string }
 */
function validateMongoOperation(operation) {
  if (typeof operation !== 'object' || operation === null) {
    return { valid: false, message: 'A operação deve ser um objeto' };
  }
  
  // Verificar se a coleção está especificada
  if (!operation.collection) {
    return { valid: false, message: 'Nome da coleção não especificado' };
  }
  
  // Verificar se a ação está especificada
  if (!operation.action) {
    return { valid: false, message: 'Ação não especificada' };
  }
  
  // Lista de ações permitidas
  const allowedActions = [
    'find', 'findOne', 'insertOne', 'insertMany', 
    'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
    'aggregate', 'count', 'distinct'
  ];
  
  // Verificar se a ação é permitida
  if (!allowedActions.includes(operation.action)) {
    return { 
      valid: false, 
      message: `Ação não suportada: ${operation.action}` 
    };
  }
  
  // Validações específicas para cada ação
  switch (operation.action) {
    case 'insertOne':
      if (!operation.document || typeof operation.document !== 'object') {
        return { valid: false, message: 'Documento não especificado para insertOne' };
      }
      break;
      
    case 'insertMany':
      if (!Array.isArray(operation.documents) || operation.documents.length === 0) {
        return { valid: false, message: 'Lista de documentos inválida para insertMany' };
      }
      break;
      
    case 'updateOne':
    case 'updateMany':
      if (!operation.update || typeof operation.update !== 'object') {
        return { valid: false, message: `Atualização não especificada para ${operation.action}` };
      }
      break;
      
    case 'aggregate':
      if (!Array.isArray(operation.pipeline)) {
        return { valid: false, message: 'Pipeline de agregação inválido' };
      }
      break;
      
    case 'distinct':
      if (!operation.field || typeof operation.field !== 'string') {
        return { valid: false, message: 'Campo não especificado para distinct' };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * Formata uma mensagem de erro para exibição
 * @param {Error} error - Objeto de erro
 * @returns {Object} Erro formatado
 */
function formatError(error) {
  return {
    success: false,
    error: error.message || 'Erro desconhecido',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
}

/**
 * Verifica se uma string é um JSON válido
 * @param {string} str - String a ser verificada
 * @returns {boolean} true se for um JSON válido, false caso contrário
 */
function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Converte uma string para um objeto JSON se for válida
 * @param {string} str - String a ser convertida
 * @returns {Object|null} Objeto JSON ou null se inválido
 */
function parseJsonSafe(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

module.exports = {
  formatQueryResult,
  validateConnectionParams,
  generateConnectionId,
  sanitizeString,
  validateSqlQuery,
  validateMongoOperation,
  formatError,
  isValidJson,
  parseJsonSafe
};
