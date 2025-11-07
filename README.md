# Venda+ Agromarket — Backend

O **Venda+ Agromarket** é uma plataforma voltada para o comércio de **frutas e hortaliças**.  
O projeto busca tornar o processo de compra e venda de produtos agrícolas mais **eficiente, acessível e sustentável**, reduzindo desperdícios e ampliando o alcance dos produtores.

Este repositório contém o **backend** da aplicação, responsável por gerenciar toda a lógica de negócios, autenticação, controle de usuários, produtos, vendas e métodos de pagamento.

A API foi projetada para ser **completa, organizada e extensível**, sem se tornar complexa ou confusa, facilitando a integração com o frontend e futuras expansões do sistema.

---

## Arquitetura da API

A **API RESTful** do Venda+ Agromarket é o núcleo que conecta o banco de dados relacional ao frontend do marketplace.  
Entre suas principais responsabilidades, estão:

- **Cadastro e autenticação de usuários:** permite o registro e login de produtores, compradores.
- **Gerenciamento de produtos:** controla o cadastro, atualização e exclusão de frutas, verduras e hortaliças disponíveis para venda.
- **Processamento de vendas e pedidos:** relaciona compradores e vendedores e produtos armazenando informações completas de cada transação.
- **Sugestão de precificação:** utiliza dados coletados em tabelas de referência para recomendar valores que conciliem acessibilidade para os compradores e rentabilidade para os vendedores.
O backend foi desenvolvido para servir como uma base sólida para o marketplace, priorizando **organização, clareza e facilidade de manutenção**.

---

## Tecnologias Utilizadas

- **Node.js** 
- **TypeScript** 
- **Express.js**
- **Prisma ORM**
- **PostgreSQL**


---

## Configuração do Ambiente

### 1. **Instalar o Node.js e o NPM**

1. Acesse o site oficial do Node.js:  
   [https://nodejs.org/](https://nodejs.org/)
2. Baixe e instale a versão **LTS (Long Term Support)**.  
3. Após a instalação, verifique as versões com:
   ```sh
   node -v
   npm -v
### 2. **Instalar o PostgreSQL**

1. Acesse o site oficial:  
   [https://www.postgresql.org/download/](https://www.postgresql.org/download/)

2. Baixe o instalador compatível com o seu sistema operacional.  

3. Durante a instalação:
   - Defina uma **senha** para o usuário padrão `postgres`.  
   - Mantenha a **porta padrão 5432** (ou anote se alterá-la).  

4. Após a instalação, abra o **PgAdmin** (instalado junto com o PostgreSQL).  

5. Crie um novo banco de dados:
   - Clique com o botão direito em **Databases → Create → Database**.  
   - Nomeie como **vendaplus_agromarket**.  
   - Clique em **Save**.

**Credenciais do banco de dados (necessárias para o arquivo `.env`):**
- **Usuário:** `postgres` (ou outro definido durante a instalação)  
- **Senha:** senha criada no setup  
- **Porta:** `5432` (padrão)  
- **Banco:** `vendaplus_agromarket`

---

### 3. **Clonar o Repositório**

Clone o repositório do projeto para sua máquina local:

```sh
git clone https://github.com/MateusTG/vendaplus-agromarket-back.git
cd vendaplus-agromarket-back

```

### 4. **Configurar o Banco de Dados**
   - Certifique-se de que o **PostgreSQL** está instalado e em execução.
   - Acesse o **PgAdmin** e confirme que o banco de dados `vendaplus_agromarket` foi criado conforme os passos anteriores.
   - Dentro do projeto, instale o **Prisma** e o cliente do banco de dados:

     ```sh
     npm install @prisma/client prisma
     ```

   - Execute as migrações para criar as tabelas definidas no schema Prisma:

     ```sh
     npx prisma migrate dev --schema=./prisma/schema.prisma --name=first-migration
     ```

   - Gere o cliente Prisma para permitir a comunicação entre a aplicação Node.js e o banco de dados:

     ```sh
     npx prisma generate
     ```

   - Caso deseje visualizar o banco e suas tabelas pelo Prisma Studio (interface visual):

     ```sh
     npx prisma studio
     ```

     > O Prisma Studio será aberto em `http://localhost:5555`.

### 5. **Compilar e Executar o Servidor**
   - Com todas as dependências instaladas e o banco de dados configurado, inicie o servidor em modo de desenvolvimento:

     ```sh
     npm run dev
     ```

   - O servidor será executado, por padrão, na porta definida no arquivo `.env` (exemplo: `http://localhost:5000`).


### 6. **Testar a API**
   - Após iniciar o servidor, acesse a API em:

     ```text
     http://localhost:5000
     ```

   - Utilize ferramentas como **Postman**, **Insomnia** ou **cURL** para testar os endpoints.

   - Exemplos de endpoints disponíveis:

     ```bash
     GET /products    → Lista todos os produtos cadastrados
     POST /users      → Cria um novo usuário
     POST /login      → Realiza a autenticação e retorna o token JWT
     ```

 

### 7. **Encerrando a Sessão**
   - Para encerrar o servidor, pressione `CTRL + C` no terminal em que ele está sendo executado.
   - Caso tenha iniciado o **Prisma Studio**, encerre-o também com `CTRL + C`.
   - Sempre que o banco de dados ou o schema do Prisma for alterado, execute novamente:

     ```sh
     npx prisma migrate dev
     npx prisma generate
     ```

     > Isso garante que o servidor e o banco estejam sincronizados corretamente.




