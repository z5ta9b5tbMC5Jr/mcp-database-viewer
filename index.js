const express = require('express');
const { createDatabaseConnector } = require('./connectors');
const { registerMCPTools } = require('./mcp-tools');
const { processMCPToolCall } = require('./mcp-implementation');
const routes = require('./routes');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Rota para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.json({ status: 'MCP Database Viewer está funcionando!' });
});

// Usar as rotas da API
app.use('/api', routes);

// Rota para processar chamadas de ferramentas MCP
app.post('/mcp/tool', async (req, res) => {
  try {
    const { tool, args } = req.body;
    
    if (!tool) {
      return res.status(400).json({
        success: false,
        error: 'Nome da ferramenta MCP não fornecido'
      });
    }
    
    const result = await processMCPToolCall(tool, args || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Erro ao processar chamada MCP: ${error.message}`
    });
  }
});

// Verificar se o arquivo de configuração MCP existe
const mcpConfigPath = path.join(__dirname, 'mcp-config.json');
if (!fs.existsSync(mcpConfigPath)) {
  console.error('Arquivo de configuração MCP não encontrado:', mcpConfigPath);
  process.exit(1);
}

// Carregar a configuração MCP
const mcpConfig = require('./mcp-config.json');
console.log(`MCP carregado: ${mcpConfig.server_name}`);
console.log(`Ferramentas disponíveis: ${mcpConfig.tools.map(tool => tool.name).join(', ')}`);

// Iniciar o servidor com tratamento de erro
const server = app.listen(PORT, () => {
  console.log(`MCP Database Viewer rodando na porta ${PORT}`);
  console.log('Ferramentas MCP registradas e prontas para uso');
  console.log(`Arquivo de configuração MCP: ${mcpConfigPath}`);
  console.log(`Acesse o servidor em: http://localhost:${PORT}`);
  
  // Registrar as ferramentas MCP
  registerMCPTools();
});

// Tratamento de erro para porta ocupada
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Erro: A porta ${PORT} já está sendo usada por outro processo.`);
    console.error('\n💡 Soluções:');
    console.error('   1. Pare o processo que está usando a porta 3000');
    console.error('   2. Use uma porta diferente: PORT=3001 node start.js');
    console.error('   3. Ou defina PORT no arquivo .env');
    console.error('\n🔍 Para encontrar o processo: netstat -ano | findstr :3000');
    process.exit(1);
  } else {
    console.error('Erro ao iniciar o servidor:', err.message);
    process.exit(1);
  }
});

module.exports = app;