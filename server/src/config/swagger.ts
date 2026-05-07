import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI 效率助手 API',
      version: '2.0.0',
      description: 'AI 效率助手完整后端 API 文档',
    },
    servers: [
      { url: 'http://localhost:3001', description: '开发环境' },
      { url: 'https://your-domain.com', description: '生产环境' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./dist/routes/*.js', './src/routes/*.ts'], // Path to route files with JSDoc comments
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: express.Application) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  app.get('/api-docs.json', (req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}
