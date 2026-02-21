import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('📄 API Documentation Generator - Starting...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EndpointSpec {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  requestSchema?: z.ZodSchema;
  responseSchema?: z.ZodSchema;
  errorCodes?: number[];
}

interface OpenAPIComponent {
  schemas: Record<string, any>;
  responses: Record<string, any>;
  securitySchemes: Record<string, any>;
}

class APIDocumentationGenerator {
  private endpoints: EndpointSpec[] = [];
  private components: OpenAPIComponent = {
    schemas: {},
    responses: {},
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      SupabaseAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization'
      }
    }
  };

  registerEndpoint(spec: EndpointSpec): void {
    this.endpoints.push(spec);
  }

  private zodToOpenAPI(schema: z.ZodSchema): any {
    if (schema instanceof z.ZodString) {
      return { type: 'string' };
    } else if (schema instanceof z.ZodNumber) {
      return { type: 'number' };
    } else if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean' };
    } else if (schema instanceof z.ZodObject) {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(schema.shape)) {
        properties[key] = this.zodToOpenAPI(value as z.ZodSchema);
        
        // Check if field is optional
        if (!(value as any).isOptional?.()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    } else if (schema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodToOpenAPI(schema.element)
      };
    } else if (schema instanceof z.ZodEnum) {
      return {
        type: 'string',
        enum: schema.options
      };
    } else if (schema instanceof z.ZodOptional) {
      return this.zodToOpenAPI(schema.unwrap());
    } else if (schema instanceof z.ZodNullable) {
      const innerSchema = this.zodToOpenAPI(schema.unwrap());
      return {
        ...innerSchema,
        nullable: true
      };
    }

    return { type: 'object' };
  }

  private generatePaths(): Record<string, any> {
    const paths: Record<string, any> = {};

    for (const endpoint of this.endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      const operation: any = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: endpoint.responseSchema 
                  ? this.zodToOpenAPI(endpoint.responseSchema)
                  : {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { type: 'object' }
                    }
                  }
              }
            }
          }
        }
      };

      // Add error responses
      if (endpoint.errorCodes) {
        for (const code of endpoint.errorCodes) {
          operation.responses[code.toString()] = {
            description: this.getErrorDescription(code),
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                        code: { type: 'string' },
                        details: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          };
        }
      }

      // Add request body for POST/PUT/PATCH
      if (['post', 'put', 'patch'].includes(endpoint.method.toLowerCase()) && endpoint.requestSchema) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: this.zodToOpenAPI(endpoint.requestSchema)
            }
          }
        };
      }

      // Add security for protected endpoints
      if (endpoint.tags.includes('protected')) {
        operation.security = [{ BearerAuth: [] }];
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    }

    return paths;
  }

  private getErrorDescription(code: number): string {
    const descriptions: Record<number, string> = {
      400: 'Bad Request - Invalid input data',
      401: 'Unauthorized - Authentication required',
      403: 'Forbidden - Insufficient permissions',
      404: 'Not Found - Resource not found',
      409: 'Conflict - Resource already exists',
      422: 'Validation Error - Input validation failed',
      429: 'Rate Limited - Too many requests',
      500: 'Internal Server Error - Server error'
    };

    return descriptions[code] || 'Error';
  }

  generateOpenAPISpec(): any {
    return {
      openapi: '3.0.3',
      info: {
        title: 'MVP Vídeos TécnicoCursos API',
        version: '1.0.0',
        description: `
          API para sistema de criação de vídeos educacionais com IA.
          
          ## Funcionalidades
          - 🎬 Renderização de vídeos a partir de PPTX
          - 📊 Analytics em tempo real  
          - 🎤 Text-to-Speech com IA
          - 📚 Compliance com Normas Regulamentadoras
          - 🔒 Autenticação via Supabase
          
          ## Autenticação
          Use o header \`Authorization: Bearer <token>\` para endpoints protegidos.
        `,
        contact: {
          name: 'Suporte TécnicoCursos',
          email: 'suporte@cursostecno.com.br'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Ambiente de Desenvolvimento'
        },
        {
          url: 'https://cursostecno.com.br',
          description: 'Ambiente de Produção'
        }
      ],
      paths: this.generatePaths(),
      components: this.components,
      tags: [
        { name: 'render', description: 'Renderização de vídeos' },
        { name: 'projects', description: 'Gerenciamento de projetos' },
        { name: 'analytics', description: 'Métricas e analytics' },
        { name: 'auth', description: 'Autenticação e autorização' },
        { name: 'nr', description: 'Normas Regulamentadoras' },
        { name: 'protected', description: 'Endpoints que requerem autenticação' }
      ]
    };
  }

  async generateDocumentation(): Promise<void> {
    // Register all our API endpoints
    this.registerCoreEndpoints();

    const spec = this.generateOpenAPISpec();
    
    // Save OpenAPI spec
    const outputPath = path.resolve(__dirname, '../../../docs/api-spec.json');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(spec, null, 2));

    // Generate HTML documentation
    await this.generateHTMLDocs(spec);

    console.log('✅ API documentation generated:');
    console.log(`   OpenAPI Spec: ${outputPath}`);
    console.log(`   HTML Docs: ${path.resolve(__dirname, '../../../docs/api-docs.html')}`);
  }

  private async generateHTMLDocs(spec: any): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MVP Vídeos API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
      html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
      *, *:before, *:after { box-sizing: inherit; }
      body { margin:0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            spec: ${JSON.stringify(spec)},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            tryItOutEnabled: true,
            filter: true,
            supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
            onComplete: function(swaggerApi, swaggerUi){
              console.log("Loaded SwaggerUI");
            },
            onFailure: function(data) {
              console.log("Unable to Load SwaggerUI");
            }
          })
        }
    </script>
</body>
</html>
    `;

    const htmlPath = path.resolve(__dirname, '../../../docs/api-docs.html');
    await fs.writeFile(htmlPath, html);
  }

  private registerCoreEndpoints(): void {
    // Render endpoints
    this.registerEndpoint({
      path: '/api/render/start',
      method: 'POST',
      summary: 'Iniciar renderização de vídeo',
      description: 'Cria um novo job de renderização para um projeto',
      tags: ['render', 'protected'],
      requestSchema: z.object({
        projectId: z.string().uuid(),
        slides: z.array(z.object({
          id: z.string(),
          content: z.string(),
          audioUrl: z.string().optional(),
          imageUrl: z.string().optional()
        }))
      }),
      responseSchema: z.object({
        success: z.boolean(),
        data: z.object({
          jobId: z.string().uuid(),
          status: z.enum(['pending', 'queued', 'processing']),
          createdAt: z.string()
        })
      }),
      errorCodes: [400, 401, 422, 500]
    });

    this.registerEndpoint({
      path: '/api/render/jobs',
      method: 'GET',
      summary: 'Listar jobs de renderização',
      description: 'Retorna lista paginada de jobs de renderização do usuário',
      tags: ['render', 'protected'],
      errorCodes: [401, 500]
    });

    this.registerEndpoint({
      path: '/api/render/progress/{jobId}',
      method: 'GET',
      summary: 'Verificar progresso de renderização',
      description: 'Retorna o progresso atual de um job específico',
      tags: ['render', 'protected'],
      errorCodes: [401, 404, 500]
    });

    // Projects endpoints
    this.registerEndpoint({
      path: '/api/projects',
      method: 'POST',
      summary: 'Criar novo projeto',
      description: 'Cria um novo projeto de vídeo',
      tags: ['projects', 'protected'],
      requestSchema: z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional()
      }),
      errorCodes: [400, 401, 422, 500]
    });

    this.registerEndpoint({
      path: '/api/projects',
      method: 'GET',
      summary: 'Listar projetos',
      description: 'Retorna lista paginada de projetos do usuário',
      tags: ['projects', 'protected'],
      errorCodes: [401, 500]
    });

    // Analytics endpoints
    this.registerEndpoint({
      path: '/api/analytics/render-stats',
      method: 'GET',
      summary: 'Estatísticas de renderização',
      description: 'Retorna métricas de performance do sistema de renderização',
      tags: ['analytics', 'protected'],
      errorCodes: [401, 500]
    });

    // NR endpoints
    this.registerEndpoint({
      path: '/api/nr/courses',
      method: 'GET',
      summary: 'Listar cursos NR',
      description: 'Retorna lista de cursos das Normas Regulamentadoras disponíveis',
      tags: ['nr'],
      errorCodes: [500]
    });
  }
}

// Export for use in build scripts
export { APIDocumentationGenerator };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting API documentation generation...');
  
  const generator = new APIDocumentationGenerator();
  generator.generateDocumentation()
    .then(() => {
      console.log('🎉 API documentation generation completed!');
    })
    .catch((error) => {
      console.error('❌ Error generating API documentation:', error);
      process.exit(1);
    });
}