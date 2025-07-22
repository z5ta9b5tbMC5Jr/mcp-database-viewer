# MCP Database Viewer

Uma ferramenta para visualização e manipulação de bancos de dados através de uma interface MCP (Model-Controller-Plugin).

## Características

- **Suporte Multi-Banco**: Conecte-se a MySQL, PostgreSQL, SQLite, SQL Server e MongoDB
- **Visualização de Estrutura**: Explore tabelas, colunas, índices e relacionamentos
- **Execução de Consultas**: Execute consultas SQL ou operações NoSQL
- **Operações DML**: Insira, atualize e exclua dados facilmente

## Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/mcp-database-viewer.git

# Entre no diretório
cd mcp-database-viewer

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Inicie o servidor
node start.js
```

Para instruções detalhadas, consulte o arquivo [INSTALL.md](INSTALL.md).

## Uso

### Conectar a um banco de dados

```javascript
const result = await mcp.connect_to_database({
  type: 'sqlite',
  database: ':memory:'
});
console.log(result);
```

### Listar tabelas

```javascript
const tables = await mcp.list_tables({
  connection_id: 'conn_123'
});
console.log(tables);
```

### Obter estrutura da tabela

```javascript
const structure = await mcp.get_table_structure({
  connection_id: 'conn_123',
  table_name: 'users'
});
console.log(structure);
```

### Executar consulta

```javascript
const queryResult = await mcp.execute_query({
  connection_id: 'conn_123',
  query: 'SELECT * FROM users WHERE age > 18'
});
console.log(queryResult);
```

### Inserir dados

```javascript
const insertResult = await mcp.insert_data({
  connection_id: 'conn_123',
  table_name: 'users',
  data: { name: 'John Doe', email: 'john@example.com', age: 30 }
});
console.log(insertResult);
```

### Atualizar dados

```javascript
const updateResult = await mcp.update_data({
  connection_id: 'conn_123',
  table_name: 'users',
  data: { name: 'John Smith' },
  where: { id: 1 }
});
console.log(updateResult);
```

### Excluir dados

```javascript
const deleteResult = await mcp.delete_data({
  connection_id: 'conn_123',
  table_name: 'users',
  where: { id: 1 }
});
console.log(deleteResult);
```

### Fechar conexão

```javascript
const closeResult = await mcp.close_connection({
  connection_id: 'conn_123'
});
console.log(closeResult);
```

Para exemplos mais detalhados, consulte a pasta `examples/`.

## Créditos

Desenvolvido por Bypass-dev
