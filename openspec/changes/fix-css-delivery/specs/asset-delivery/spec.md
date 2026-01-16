# Capability: Asset Delivery

## MODIFIED Requirements

### Requirement: Correct CSS MIME Types

The web server (or proxy) SHALL serve stylesheets with the `Content-Type: text/css` header.

#### Scenario: Custom Domain Access
Given a user accesses a `.css` file via `cursostecno.com.br`
When the response is received
Then the `Content-Type` header MUST be `text/css`
And the content MUST be valid CSS
And the response MUST NOT be an HTML error page.

### Requirement: Proxy Transparency

If a reverse proxy is used, it SHALL transparently forward requests to the Vercel deployment without modifying critical headers or path resolution, unless explicitly configured for caching.

#### Scenario: Proxy Pass-through
Given a request for `/_next/static/...`
When the request is handled by the Nginx proxy
Then it SHOULD be forwarded to the Vercel origin
And the response headers SHOULD be preserved.
