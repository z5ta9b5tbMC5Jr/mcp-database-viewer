/**
 * Script para testar a instalação e configuração do MCP Database Viewer
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Função para imprimir mensagens formatadas
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  
  switch (type) {
    case 'success':
      color = colors.green;
      break;
    case 'error':
      color = colors.red;
      break;
    case 'warning':
      color = colors.yellow;
      break;
    case 'info':
      color = colors.cyan;
      break;
    case 'title':
      color = colors.magenta;
      break;
  }
  
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// Função para verificar se o servidor está rodando
async function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.request({
      host: 'localhost',
      port: process.env.PORT || 3000,
      path: '/',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.end();
  });
}

// Função para verificar o arquivo mcp-config.json
function checkMCPConfig() {
  const configPath = path.join(__dirname, 'mcp-config.json');
  
  if (!fs.existsSync(configPath)) {
    log('Arquivo mcp-config.json não encontrado', 'error');
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (!config.tools || !Array.isArray(config.tools) || config.tools.length === 0) {
      log('Arquivo mcp-config.json não contém ferramentas configuradas', 'error');
      return false;
    }
    
    const requiredTools = [
      'connect_to_database',
      'list_tables',
      'get_table_structure',
      'execute_query',
      'close_connection'
    ];
    
    const configuredTools = config.tools.map(tool => tool.name);
    const missingTools = requiredTools.filter(tool => !configuredTools.includes(tool));
    
    if (missingTools.length > 0) {
      log(`Ferramentas necessárias não configuradas: ${missingTools.join(', ')}`, 'warning');
      return false;
    }
    
    log('Arquivo mcp-config.json válido', 'success');
    return true;
  } catch (error) {
    log(`Erro ao analisar mcp-config.json: ${error.message}`, 'error');
    return false;
  }
}

// Função para testar a API do MCP com SQLite em memória
async function testMCPAPI() {
  const baseUrl = `http://localhost:${process.env.PORT || 3000}/mcp/tool`;
  
  // Função para fazer requisições à API
  async function callMCPTool(toolName, args) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        server_name: 'mcp-database-viewer',
        tool_name: toolName,
        args: args
      });
      
      const req = http.request({
        host: 'localhost',
        port: process.env.PORT || 3000,
        path: '/mcp/tool',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            reject(new Error(`Falha ao analisar resposta: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
  }
  
  try {
    // Teste 1: Conectar ao SQLite em memória
    log('Testando conexão com SQLite em memória...', 'info');
    const connectionResult = await callMCPTool('connect_to_database', {
      type: 'sqlite',
      database: ':memory:'
    });
    
    if (!connectionResult.success || !connectionResult.connection_id) {
      log('Falha ao conectar ao banco de dados', 'error');
      return false;
    }
    
    const connectionId = connectionResult.connection_id;
    log(`Conexão estabelecida com ID: ${connectionId}`, 'success');
    
    // Teste 2: Criar uma tabela de teste
    log('Criando tabela de teste...', 'info');
    const createTableResult = await callMCPTool('execute_query', {
      connection_id: connectionId,
      query: `
        CREATE TABLE test_users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          age INTEGER
        )
      `
    });
    
    if (!createTableResult.success) {
      log('Falha ao criar tabela de teste', 'error');
      return false;
    }
    
    log('Tabela de teste criada com sucesso', 'success');
    
    // Teste 3: Inserir dados de teste
    log('Inserindo dados de teste...', 'info');
    const insertResult = await callMCPTool('execute_query', {
      connection_id: connectionId,
      query: `
        INSERT INTO test_users (name, email, age) VALUES
        ('John Doe', 'john@example.com', 30),
        ('Jane Smith', 'jane@example.com', 25),
        ('Bob Johnson', 'bob@example.com', 40)
      `
    });
    
    if (!insertResult.success) {
      log('Falha ao inserir dados de teste', 'error');
      return false;
    }
    
    log('Dados de teste inseridos com sucesso', 'success');
    
    // Teste 4: Listar tabelas
    log('Listando tabelas...', 'info');
    const listTablesResult = await callMCPTool('list_tables', {
      connection_id: connectionId
    });
    
    if (!listTablesResult.success || !listTablesResult.tables) {
      log('Falha ao listar tabelas', 'error');
      return false;
    }
    
    log(`Tabelas encontradas: ${listTablesResult.tables.join(', ')}`, 'success');
    
    // Teste 5: Obter estrutura da tabela
    log('Obtendo estrutura da tabela...', 'info');
    const tableStructureResult = await callMCPTool('get_table_structure', {
      connection_id: connectionId,
      table_name: 'test_users'
    });
    
    if (!tableStructureResult.success || !tableStructureResult.columns) {
      log('Falha ao obter estrutura da tabela', 'error');
      return false;
    }
    
    log('Estrutura da tabela obtida com sucesso', 'success');
    log(`Colunas: ${tableStructureResult.columns.map(col => col.name).join(', ')}`, 'info');
    
    // Teste 6: Executar consulta
    log('Executando consulta...', 'info');
    const queryResult = await callMCPTool('execute_query', {
      connection_id: connectionId,
      query: 'SELECT * FROM test_users WHERE age > 25'
    });
    
    if (!queryResult.success || !queryResult.results) {
      log('Falha ao executar consulta', 'error');
      return false;
    }
    
    log(`Consulta retornou ${queryResult.results.length} registros`, 'success');
    
    // Teste 7: Fechar conexão
    log('Fechando conexão...', 'info');
    const closeResult = await callMCPTool('close_connection', {
      connection_id: connectionId
    });
    
    if (!closeResult.success) {
      log('Falha ao fechar conexão', 'error');
      return false;
    }
    
    log('Conexão fechada com sucesso', 'success');
    
    return true;
  } catch (error) {
    log(`Erro durante o teste da API: ${error.message}`, 'error');
    return false;
  }
}

// Função principal de teste
async function runTests() {
  log('=== TESTE DE INSTALAÇÃO DO MCP DATABASE VIEWER ===', 'title');
  
  // Verificar se o servidor está rodando
  log('Verificando se o servidor MCP está em execução...', 'info');
  const isServerRunning = await checkServerRunning();
  
  if (!isServerRunning) {
    log('O servidor MCP não está em execução. Inicie-o com "node start.js" antes de executar este teste.', 'error');
    process.exit(1);
  }
  
  log('Servidor MCP está em execução', 'success');
  
  // Verificar configuração do MCP
  log('Verificando configuração do MCP...', 'info');
  const isConfigValid = checkMCPConfig();
  
  if (!isConfigValid) {
    log('A configuração do MCP não é válida. Verifique o arquivo mcp-config.json.', 'warning');
  }
  
  // Testar API do MCP
  log('Testando API do MCP...', 'info');
  const isAPIWorking = await testMCPAPI();
  
  if (!isAPIWorking) {
    log('Falha nos testes da API do MCP', 'error');
    process.exit(1);
  }
  
  log('Todos os testes foram concluídos com sucesso!', 'success');
  log('O MCP Database Viewer está corretamente instalado e configurado.', 'success');
}

// Executar testes
runTests().catch(error => {
  log(`Erro inesperado: ${error.message}`, 'error');
  process.exit(1);
});
