'use client';

import { useEffect } from 'react';

/**
 * API Documentation Page
 * Renders Swagger UI for the OpenAPI specification
 */
export default function APIDocsPage() {
    useEffect(() => {
        // Load Swagger UI
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js';
        script.async = true;
        script.onload = () => {
            // @ts-ignore
            window.SwaggerUIBundle({
                url: '/openapi.json',
                dom_id: '#swagger-ui',
                presets: [
                    // @ts-ignore
                    window.SwaggerUIBundle.presets.apis,
                    // @ts-ignore
                    window.SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: 'StandaloneLayout',
                deepLinking: true,
                displayRequestDuration: true,
                filter: true,
                showExtensions: true,
                showCommonExtensions: true
            });
        };
        document.body.appendChild(script);

        // Load Swagger UI CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
        document.head.appendChild(link);

        return () => {
            document.body.removeChild(script);
            document.head.removeChild(link);
        };
    }, []);

    return (
        <div className="min-h-screen bg-white">
            <div className="bg-gray-900 text-white py-4 px-6">
                <h1 className="text-2xl font-bold">📚 CursosTecno API Documentation</h1>
                <p className="text-gray-400 text-sm mt-1">
                    OpenAPI 3.0 Specification •
                    <a href="/openapi.json" className="text-blue-400 hover:underline ml-2">
                        Download JSON
                    </a>
                </p>
            </div>
            <div id="swagger-ui" />
        </div>
    );
}
