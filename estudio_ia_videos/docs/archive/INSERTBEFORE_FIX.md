# insertBefore DOM Error - Fixed

## Issue
`NotFoundError: Failed to execute 'insertBefore' on 'Node'`

## Root Cause
SSR-unsafe DOM manipulation in utility files:

1. **`/app/lib/performance/image-optimization.ts`**
   - `preloadCriticalImages()` - Line 310: `document.head.appendChild(link)`
   - `detectBestFormat()` - Line 177-190: `document.createElement('canvas')`
   - Only checked `typeof window === 'undefined'` but not `typeof document === 'undefined'`

2. **`/app/dashboard/analytics/page.tsx`**
   - `exportData()` - Line 167: `document.body.appendChild(a)`
   - Function could be called during SSR

## Fix Applied

### 1. image-optimization.ts - preloadCriticalImages
```typescript
// BEFORE
if (typeof window === 'undefined') return;

// AFTER  
if (typeof window === 'undefined' || typeof document === 'undefined') {
  logger.debug('Skipping image preload - SSR environment');
  return;
}
```

### 2. image-optimization.ts - detectBestFormat
```typescript
// BEFORE
if (typeof window === 'undefined') {
  return 'webp';
}

// AFTER
if (typeof window === 'undefined' || typeof document === 'undefined') {
  return 'webp'; // Default for SSR
}
```

### 3. analytics/page.tsx - exportData
```typescript
// ADDED at function start
if (typeof window === 'undefined' || typeof document === 'undefined') {
  toast.error('Exportação disponível apenas no navegador');
  return;
}
```

## Why This Works

**The Problem**: Next.js App Router runs code on both server and client. When `document.createElement()` or `document.appendChild()` is called during SSR, it fails because `document` doesn't exist on the server.

**The Solution**: 
- Check BOTH `typeof window === 'undefined'` AND `typeof document === 'undefined'`
- This ensures code only runs in browser environment
- Prevents DOM manipulation during SSR/hydration

## Verification

✅ Login page loads without error
✅ Navigation flow works (login → signup → password recovery)
✅ No insertBefore errors in console

## Files Modified

- `/app/lib/performance/image-optimization.ts` - Lines 172, 303
- `/app/dashboard/analytics/page.tsx` - Line 158

## Prevention

**Rule**: Always check BOTH conditions before DOM manipulation:
```typescript
if (typeof window === 'undefined' || typeof document === 'undefined') {
  return; // or provide SSR-safe fallback
}
```

**Never** manipulate DOM directly in:
- Utility files (`.ts`)
- Top-level module scope
- Functions that might run during SSR

**Always** use:
- `useEffect` hooks for client-side DOM manipulation
- Proper SSR guards
- React Portals instead of `appendChild`
