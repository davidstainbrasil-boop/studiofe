/**
 * 📚 OpenAPI Documentation Endpoint
 * Serves the OpenAPI specification and documentation UI
 */

import { readFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { logger } from '@lib/logger';

const SWAGGER_UI_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MVP Vídeos TécnicoCursos - API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin-bottom: 20px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/docs?format=json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  try {
    // Return raw OpenAPI spec
    if (format === 'json' || format === 'yaml') {
      const specPath = path.join(process.cwd(), 'app', 'api', 'openapi.yaml');
      const spec = await readFile(specPath, 'utf-8');

      if (format === 'yaml') {
        return new NextResponse(spec, {
          headers: {
            'Content-Type': 'text/yaml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // Convert YAML to JSON
      // Simple YAML parser for OpenAPI spec
      const yaml = await import('yaml');
      const jsonSpec = yaml.parse(spec) as Record<string, unknown>;

      return NextResponse.json(jsonSpec, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Return Swagger UI HTML
    return new NextResponse(SWAGGER_UI_HTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    logger.error('Erro ao carregar especificação OpenAPI', error instanceof Error ? error : new Error(String(error)), {
      component: 'API: docs'
    });
    return NextResponse.json({ error: 'Failed to load API documentation' }, { status: 500 });
  }
}
