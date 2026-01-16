# Proposal: Fix CSS Delivery on Custom Domain

**Change ID**: `fix-css-delivery`
**Status**: DRAFT
**Created**: 2026-01-15

## Summary
The application's CSS is failing to load correctly on the custom domain `cursostecno.com.br`, impeding the visual experience. While the `vercel.app` URL appears functional, the custom domain users report issues, potentially related to MIME types, caching, or proxy configurations.

## Problem Statement
- **Symptoms**:
  - Application functionality works (JS loads).
  - UI is unstyled or broken on `cursostecno.com.br`.
  - Reports of MIME type mismatches (e.g., CSS served as JS/HTML) or effective 404s.
- **Context**:
  - Recent deployment fixed failing JS assets by removing `assetPrefix`.
  - The domain `cursostecno.com.br` returns `Server: nginx`, suggesting a proxy layer in front of Vercel or a separate hosting environment (VPS) that might not be fully synchronized or correctly configured for the Vercel deployment.

## Plan
1.  **Analyze Infrastructure**: Determine if `cursostecno.com.br` is a Vercel Custom Domain or a VPS Proxy.
2.  **Verify Headers**: Ensure correct `Content-Type: text/css` is served for all `.css` files on the custom domain.
3.  **Cache/Proxy Flush**: If a proxy is in use, flush its cache to ensure it serves the latest Vercel assets.
4.  **CORS/Origin Config**: Verify if Cross-Origin headers are required if assets are being fetched from a different origin (though unlikely for standard CSS).

## Risks
- **Low Risk**: Investigation and header adjustments are generally safe.
- **Dependency**: If the domain is managed outside Vercel (e.g., Hostinger VPS Nginx), access to that infrastructure is required.
