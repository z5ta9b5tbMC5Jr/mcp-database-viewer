/**
 * Script de inicialização simplificado para o MCP Database Viewer
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Verificar versão do Node.js
const nodeVersion = process.version;
const versionMatch = nodeVersion.match(/v(\d+)\./i);
const majorVersion = versionMatch ? parseInt(versionMatch[1]) : 0;

if (majorVersion < 14) {
  console.error('\x1b[31mErro: O MCP Database Viewer requer Node.js v14 ou superior.\x1b[0m');
  console.error(`Versão atual: ${nodeVersion}`);
  console.error('Por favor, atualize o Node.js e tente novamente.');
  process.exit(1);
}

// Verificar se package.json existe
if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
  console.error('\x1b[31mErro: Arquivo package.json não encontrado.\x1b[0m');
  console.error('Verifique se você está no diretório correto do projeto.');
  process.exit(1);
}

// Verificar se mcp-config.json existe
if (!fs.existsSync(path.join(__dirname, 'mcp-config.json'))) {
  console.error('\x1b[31mErro: Arquivo mcp-config.json não encontrado.\x1b[0m');
  console.error('Este arquivo é necessário para a configuração do MCP.');
  process.exit(1);
}

// Verificar se node_modules existe, caso contrário instalar dependências
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('\x1b[33mDiretório node_modules não encontrado. Instalando dependências...\x1b[0m');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('\x1b[32mDependências instaladas com sucesso.\x1b[0m');
  } catch (error) {
    console.error('\x1b[31mErro ao instalar dependências:\x1b[0m', error.message);
    process.exit(1);
  }
}

console.log('\x1b[36mIniciando MCP Database Viewer...\x1b[0m');

// Iniciar o servidor MCP
try {
  require('./index.js');
} catch (error) {
  console.error('\x1b[31mErro ao iniciar o servidor MCP:\x1b[0m', error);
  process.exit(1);
}
