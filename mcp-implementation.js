/**
 * Implementação das ferramentas MCP para o Database Viewer
 * Este arquivo conecta as ferramentas definidas em mcp-config.json com as funções implementadas em mcp-tools.js
 */

const mcpTools = require('./mcp-tools');

/**
 * Processa uma chamada de ferramenta MCP
 * @param {string} toolName - Nome da ferramenta a ser executada
 * @param {object} args - Argumentos para a ferramenta
 * @returns {Promise<object>} - Resultado da execução da ferramenta
 */
async function processMCPToolCall(toolName, args) {
  try {
    // Mapear o nome da ferramenta para a função correspondente
    const toolFunctions = {
      'connect_to_database': mcpTools.connectToDatabase,
      'list_databases': mcpTools.listDatabases,
      'list_tables': mcpTools.listTables,
      'get_table_structure': mcpTools.getTableStructure,
      'execute_query': mcpTools.executeQuery,
      'insert_data': mcpTools.insertData,
      'update_data': mcpTools.updateData,
      'delete_data': mcpTools.deleteData,
      'close_connection': mcpTools.closeConnection
    };
    
    // Verificar se a ferramenta existe
    if (!toolFunctions[toolName]) {
      throw new Error(`Ferramenta '${toolName}' não implementada`);
    }
    
    // Executar a função correspondente à ferramenta
    const result = await toolFunctions[toolName](args);
    
    // Adicionar flag de sucesso ao resultado
    return {
      success: true,
      ...result
    };
  } catch (error) {
    // Em caso de erro, retornar objeto com flag de erro
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processMCPToolCall
};
