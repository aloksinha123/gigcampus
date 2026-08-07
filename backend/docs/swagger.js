import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { openapiDefinition } from './openapi.js';

const options = {
    definition: openapiDefinition,
    apis: [
        './routes/*.js',
        './routes/**/*.js',
        './controllers/*.js',
        './backend/routes/*.js'
    ]
};

export const swaggerSpec = swaggerJSDoc(options);

/**
 * Setup Swagger UI middleware on Express app
 * Exposes API documentation at /api/docs
 */
export const serveSwagger = (app) => {
    // Serve OpenAPI JSON definition endpoint
    app.get('/api/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    // Custom CSS for dark/clean modern UI
    const customUiOptions = {
        customSiteTitle: 'GigCampus API Documentation 🚀',
        customCss: '.swagger-ui .topbar { display: none } .swagger-ui { font-family: Inter, sans-serif; }',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'list',
            filter: true
        }
    };

    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, customUiOptions));
    console.log('📑 Swagger API Documentation initialized at /api/docs');
};

export default serveSwagger;
