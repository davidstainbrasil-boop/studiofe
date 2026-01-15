# Proposal: Fix Production Static Asset 404s

**Change ID**: `fix-prod-assets-404`
**Status**: DRAFT
**Created**: 2026-01-15

## Summary

The production environment (`cursostecno.com.br`) is currently unusable due to `404 Not Found` errors for static JavaScript assets (`_next/static/chunks/...`). This proposal aims to fix the root cause by removing the manual `assetPrefix` configuration in `next.config.mjs`, which is unnecessary on Vercel and prone to causing mismatches between the serving domain and the asset domain.

## Problem Statement

- **Symptoms**:
  - Homepage loads but layout is broken or blank.
  - Login page is completely empty.
  - Browser console shows multiple 404s for `.js` files.
  - MIME type errors (HTML served instead of JS).
- **Root Cause**:
  - The `next.config.mjs` file explicitly sets `assetPrefix` to `check process.env.NEXT_PUBLIC_VERCEL_URL`.
  - On Vercel, `NEXT_PUBLIC_VERCEL_URL` is the _deployment_ URL (e.g., `project-git-branch.vercel.app`), not necessarily the custom domain.
  - If there is any mismatch in availability, CORS, or if the variable is not set correctly during the specific build phase, the HTML will request assets from a path that fails to resolve.
  - Standard Next.js/Vercel deployments should use relative paths (default) to ensure assets are always requested from the same origin as the HTML.

## Plan

1.  **Remove `assetPrefix`**: Delete the manual configuration from `next.config.mjs`.
2.  **Clean Configuration**: Ensure no other build-time variables (like Source Maps/Sentry) are interfering with asset generation, though `assetPrefix` is the primary suspect.
3.  **Redeploy**: A new deployment is required to regenerate HTML with relative paths.

## Risks

- **Low Risk**: Removing `assetPrefix` restores standard Next.js behavior.
- **Verification**: Post-deployment, check that `<script src="...">` tags in the HTML start with `/_next/` (relative) rather than `https://...`.
