/**
 * Arquivo principal do MCP Database Viewer
 */

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const winston = require('winston');

// Importar processador de chamadas MCP
const { processMCPToolCall } = require('./mcp-implementation');

// Configuração do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'mcp-database-viewer.log' })
  ]
});

// Carregar configuração MCP
let mcpConfig;
try {
  mcpConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'mcp-config.json'), 'utf8'));
  logger.info('Configuração MCP carregada com sucesso');
} catch (error) {
  logger.error(`Erro ao carregar configuração MCP: ${error.message}`);
  process.exit(1);
}

// Inicializar aplicação Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '100mb' }));

// Rota principal
app.get('/', (req, res) => {
  res.json({
    name: mcpConfig.name,
    description: mcpConfig.description,
    version: mcpConfig.version,
    status: 'running'
  });
});

// Rota para listar ferramentas disponíveis
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: mcpConfig.tools.map(tool => ({
      name: tool.name,
      description: tool.description
    }))
  });
});

// Rota para processar chamadas de ferramentas MCP
app.post('/mcp/tool', async (req, res) => {
  try {
    const { server_name, tool_name, args } = req.body;
    
    // Verificar se o servidor solicitado corresponde ao nosso MCP
    if (server_name !== mcpConfig.name) {
      return res.status(400).json({
        success: false,
        error: `Servidor MCP '${server_name}' não encontrado`
      });
    }
    
    // Verificar se a ferramenta existe
    const tool = mcpConfig.tools.find(t => t.name === tool_name);
    if (!tool) {
      return res.status(400).json({
        success: false,
        error: `Ferramenta '${tool_name}' não encontrada`
      });
    }
    
    logger.info(`Processando chamada de ferramenta: ${tool_name}`, { args });
    
    // Processar a chamada da ferramenta
    const result = await processMCPToolCall(tool_name, args);
    
    logger.info(`Chamada de ferramenta ${tool_name} processada com sucesso`);
    res.json(result);
  } catch (error) {
    logger.error(`Erro ao processar chamada de ferramenta: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Iniciar servidor
app.listen(port, () => {
  logger.info(`MCP Database Viewer iniciado na porta ${port}`);
  logger.info(`Nome: ${mcpConfig.name}`);
  logger.info(`Versão: ${mcpConfig.version}`);
  logger.info(`Ferramentas disponíveis: ${mcpConfig.tools.length}`);
  logger.info(`URL de acesso: http://localhost:${port}`);
});

module.exports = app;
