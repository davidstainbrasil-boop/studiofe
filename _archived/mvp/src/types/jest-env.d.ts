/**
 * Jest global type declarations.
 *
 * This file ensures Jest globals (describe, it, expect, jest, etc.) are
 * available to the TypeScript compiler for test files.
 * The @types/jest package is installed in the root node_modules.
 *
 * This is needed because the monorepo hoists @types/jest to the workspace root,
 * and the mvp/tsconfig.json doesn't always resolve it natively.
 *
 * After running `cd mvp && npm install`, this file can be simplified or removed
 * if @types/jest gets installed in mvp/node_modules/@types/.
 */
/// <reference types="jest" />
