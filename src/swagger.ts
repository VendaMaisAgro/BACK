import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VendaPlus Agromarket API',
      version: '1.0.0',
      description: 'Documentação da API do sistema VendaPlus Agromarket',
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    // Segurança global: todas as rotas exigem Bearer por padrão (pode ser sobrescrito por rota)
    security: [{ BearerAuth: [] }],
  },
  // Aponta para todas as rotas com anotações @swagger
  apis: ['src/modules/**/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;