# Capability: Build Configuration

## MODIFIED Requirements

### Requirement: Use Relative Asset Paths

The build configuration SHALL ensure that all static assets are referenced using relative paths to support flexible deployment domains.

#### Scenario: Production Deployment

Given the application is deployed to Vercel
When the build process generates HTML
Then script and style references MUST use relative paths (e.g., `/_next/static/...`)
And `assetPrefix` MUST NOT be manually configured to a specific domain
To ensure assets are loaded correctly regardless of the accessing domain (custom domain vs vercel.app).

#### Scenario: Asset Availability

Given a user accesses `http://cursostecno.com.br`
When the browser requests static chunks
Then the server MUST respond with the correct JavaScript file (200 OK)
And MUST NOT return the HTML 404 page (MIME type error).
