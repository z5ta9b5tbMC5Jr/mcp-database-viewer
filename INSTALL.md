# Instruções de Instalação do MCP Database Viewer

Este documento fornece instruções detalhadas para instalar, configurar e usar o MCP Database Viewer.

## Requisitos

- Node.js (v14 ou superior)
- NPM (v6 ou superior)
- Acesso aos bancos de dados que deseja conectar (MySQL, PostgreSQL, SQLite, SQL Server, MongoDB)

## Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/mcp-database-viewer.git
cd mcp-database-viewer
```

2. Instale as dependências:

```bash
npm install
```

3. Configure o ambiente:

```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas configurações específicas.

## Execução

Para iniciar o servidor MCP:

```bash
node start.js
```

Ou, alternativamente:

```bash
npm start
```

O servidor será iniciado na porta especificada no arquivo `.env` (padrão: 3000).

## Configuração para Integração com IA

Para configurar o MCP para uso com sistemas de IA:

1. Verifique se o arquivo `mcp-config.json` está corretamente configurado com as ferramentas necessárias.

2. Certifique-se de que o endpoint `/mcp/tool` está acessível para sua aplicação de IA.

3. Use o seguinte formato para chamadas de ferramentas MCP:

```json
{
  "server_name": "mcp-database-viewer",
  "tool_name": "connect_to_database",
  "args": {
    "type": "sqlite",
    "database": ":memory:"
  }
}
```

## Testando a Instalação

Para verificar se a instalação foi bem-sucedida:

```bash
node test-mcp.js
```

Este script executará uma série de testes básicos para garantir que o MCP está funcionando corretamente.

## Solução de Problemas

### Problemas de Conexão com Banco de Dados

- Verifique se as credenciais no arquivo `.env` estão corretas
- Confirme se o banco de dados está acessível a partir do servidor onde o MCP está sendo executado
- Verifique se as portas necessárias estão abertas em firewalls

### Erros de Dependência

- Execute `npm install` novamente para garantir que todas as dependências estejam instaladas
- Verifique se a versão do Node.js é compatível (v14+)

## Exemplos de Conexão

### MySQL

```javascript
const result = await mcp.connect_to_database({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'test_db'
});
```

### PostgreSQL

```javascript
const result = await mcp.connect_to_database({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'test_db'
});
```

### SQLite

```javascript
const result = await mcp.connect_to_database({
  type: 'sqlite',
  database: './data/database.sqlite' // ou ':memory:' para banco em memória
});
```

### SQL Server

```javascript
const result = await mcp.connect_to_database({
  type: 'mssql',
  server: 'localhost',
  port: 1433,
  user: 'sa',
  password: 'Password123!',
  database: 'test_db',
  options: {
    trustServerCertificate: true
  }
});
```

### MongoDB

```javascript
const result = await mcp.connect_to_database({
  type: 'mongodb',
  url: 'mongodb://localhost:27017',
  database: 'test_db'
});
```
