# Build Production

**Trigger**: User wants to build/bundle/compile for production

## Description
Creates optimized production bundle with code splitting, minification, and tree-shaking.

## Prerequisites
- Dependencies installed
- TypeScript configurations valid
- No uncommitted critical changes

## Steps

1. Run type check: `npx tsc --noEmit`
2. Build with Vite: `npm run build`
3. Output directory: `dist/`
4. Generated files:
   - index.html (entry point)
   - js/ (bundled JavaScript)
   - assets/ (CSS, images)

## Output
- Build summary with file sizes
- dist/ directory ready to deploy
- Source maps excluded by default

## Deployment
```bash
# Serve locally to test
npm run preview

# Deploy dist/ to production
```

## Notes
- Production build enables optimizations
- JavaScript is minified
- CSS is tree-shaken
- Assets are hashed for caching
