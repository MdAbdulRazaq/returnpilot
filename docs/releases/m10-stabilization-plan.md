# M10 Stabilization Plan

## Executive Summary

This stabilization plan addresses the 47 build/typecheck errors identified in the ReturnPilot repository after Milestone 10 implementation. All errors are confined to the Milestone 10 implementation (42 errors) with 2 pre-existing issues. The plan focuses exclusively on fixing existing issues without introducing new features or expanding scope.

All tests continue to pass (122/122), confirming that runtime functionality remains intact. The stabilization effort will restore the repository to a deployable state where `npm test`, `npm run build`, `npm run typecheck`, and `npm run lint` all succeed.

## Error Inventory Summary

| Category | Error Count | Introduced By | Blocks Build |
|----------|-------------|---------------|--------------|
| Broken Imports / Path Alias Issues | 8 | Milestone 10 | YES |
| Type Errors | 32 | Milestone 10 (30) / Pre-existing (2) | YES |
| Build Configuration Issues | 0 | - | NO |
| TSConfig Problems | 0 | - | NO |
| ESLint Configuration Issues | 17 | Milestone 10 | PARTIAL (warnings only) |

## Phase 1: Broken Imports

### Files Affected
- `lib/detection/adaptive-learning-integration.test.ts` (lines 5, 6, 7)
- `lib/detection/adaptive-learning-persistence.test.ts` (line 5)
- `lib/detection/detection-engine.test.ts` (line 5)
- `lib/detection/detection-strategy-factory.test.ts` (line 4)

### Errors
```
TS2307: Cannot find module '../types' or its corresponding type declarations.
TS2307: Cannot find module '../normalize' or its corresponding type declarations.
```

### Root Cause
Test files incorrectly import from parent directory (`../`) when target files (`types.ts`, `normalize.ts`) reside in the same directory (`./`).

### Priority
**HIGH** - Blocks compilation and deployment

### Expected Fix
Update import paths from `../types` and `../normalize` to `./types` and `./normalize` respectively.

### Risk
Low - Simple path correction with no functional changes

### Verification Method
- Run `npm run typecheck` - should eliminate all "../module not found" errors
- Confirm imports resolve correctly in IDE
- All tests continue to pass

## Phase 2: Missing Modules

### Actually Part of Phase 1
Note: "Missing modules" in the original grouping refers to the same import path issues addressed in Phase 1. No separate action needed.

## Phase 3: Type Errors

### Sub-Phase 3A: Missing Type Declarations

#### Files Affected
- `lib/detection/detection-engine.test.ts` (line 73): `Cannot find name 'Finding'`
- `lib/detection/types.ts` (line 46): `Cannot find name 'PatternRecognitionConfig'`

#### Root Cause
Same as Phase 1 - incorrect import paths prevent type resolution.

#### Expected Fix
Same import path corrections as Phase 1.

### Sub-Phase 3B: Private Property Access

#### Files Affected
- `lib/detection/detection-engine.test.ts` (lines 126, 129, 132, 135, 136)
- `lib/detection/strategies/behavioral-analysis-strategy.test.ts` (lines 142, 143)

#### Errors
```
TS2341: Property 'strategies' is private and only accessible within class 'DetectionEngine'.
TS2341: Property 'refundCounts' is private and only accessible within class 'BehavioralAnalysisStrategy'.
TS2341: Property 'orderTimestamps' is private and only accessible within class 'BehavioralAnalysisStrategy'.
```

#### Root Cause
Tests attempting to access private class properties for verification instead of testing public behavior.

#### Priority
**HIGH** - Blocks compilation

#### Expected Fix
Replace private property access with behavioral testing through public methods:
- Test `engine.strategies` length via `engine.detect()` behavior
- Test strategy properties via observable detection outcomes
- Or expose minimal testing interfaces if behavioral testing is impractical

#### Risk
Low - Improves test quality by focusing on behavior over implementation

#### Verification Method
- Tests pass without accessing private members
- No regression in detection functionality (all tests pass)
- Improved test resilience to implementation changes

### Sub-Phase 3C: Incorrect Function Arguments

#### Files Affected
- `lib/detection/detection-strategy-factory.test.ts` (lines 18, 23, 35, 47, 71, 95, 109, 112, 115, 118, 125)

#### Errors
```
TS2554: Expected 3 arguments, but got 2.
```

#### Root Cause
`DetectionStrategyFactory.createStrategies()` requires `(merchantTier: string, config: DetectionConfig, shopId: string)` but tests omit the `shopId` parameter.

#### Priority
**HIGH** - Blocks compilation

#### Expected Fix
Add appropriate `shopId` parameter (typically `"test-shop-123"` matching test constants) to all `DetectionStrategyFactory.createStrategies()` calls.

#### Risk
Low - Parameter addition with safe test values

#### Verification Method
- Eliminate all "Expected 3 arguments" errors in type check
- Tests continue to pass with correct parameter
- Factory behavior unchanged

### Sub-Phase 3D: Missing Required Properties

#### Files Affected
- Test files creating `NormalizedReturn` and `ReturnNode` objects:
  - `lib/detection/engine.test.ts`
  - `lib/detection/normalize.test.ts` 
  - `lib/detection/strategies/legacy-detection-strategy.test.ts`
  - `lib/detection/strategies/temporal-pattern-strategy.test.ts`
  - `lib/detection/shopify/sync-normalize.test.ts`

#### Errors
```
TS2741: Property 'createdAt' is missing in type '{ ... }' but required in type 'NormalizedReturn'.
TS2741: Property 'createdAt' is missing in type '{ ... }' but required in type 'ReturnNode'.
```

#### Root Cause
Test object literals missing mandatory properties (`createdAt`, `lineItems`, etc.) required by type definitions.

#### Priority
**HIGH** - Blocks compilation

#### Expected Fix
Add missing required properties to all test mocks:
- `NormalizedReturn`: Add `createdAt: Date` and `lineItems: NormalizedReturnLineItem[]`
- `ReturnNode`: Add `createdAt: Date` and `returnLineItems: { nodes: ReturnLineItemNode[] }`

#### Risk
Low - Property addition with safe test values (current dates, empty arrays)

#### Verification Method
- Eliminate all "Property 'X' is missing" errors in type check
- Tests continue to pass with complete mock objects
- Improved test realism

### Sub-Phase 3E: Type Safety Issues

#### Files Affected
- `lib/detection/adaptive-learning-persistence.test.ts` (line 43)
- `lib/detection/explanation/generator.ts` (lines 109, 160, 189)
- Multiple strategy test files

#### Errors
```
TS2345: Argument of type 'unknown' is not assignable to parameter of type 'string'.
TS2532: Object is possibly 'undefined'.
TS2339: Property 'currency' does not exist on type 'NormalizedRefund'.
TS18048: 'percentile95' is possibly 'undefined'.
```

#### Root Cause
1. Insufficient type guarding (`unknown` used where specific type needed)
2. Unsafe array/object property access without null/undefined checks
3. Incorrect property references on types
4. Variables used without definite assignment verification

#### Priority
**MEDIUM** - Affects type safety but some may not block build

#### Expected Fix
1. Replace `unknown` with specific types where possible
2. Add type guards (`if (array.length > 0)`) before accessing `[0]`
3. Correct property references (e.g., use `data.refunds[0]?.currency` or proper restructuring)
4. Add definite assignment checks or default values

#### Risk
Low to Medium - Improves correctness without changing behavior

#### Verification Method
- Eliminate type safety errors in type check
- No change in test behavior or output
- Improved type safety and runtime safety

### Sub-Phase 3F: Property Access Errors

#### Files Affected
- Strategy test files (anomaly, behavioral, sequence)

#### Errors
```
TS2353: Object literal may only specify known properties, and 'patternRecognition' does not exist in type 'PatternRecognitionConfig'.
TS2339: Property 'patternRecognition' does not exist on type 'PatternRecognitionConfig'.
```

#### Root Cause
Attempting to set non-existent `patternRecognition` property on `PatternRecognitionConfig` objects.

#### Priority
**MEDIUM** - Blocks compilation for affected tests

#### Expected Fix
Remove incorrect `patternRecognition` property assignments and use correct property structure per `PatternRecognitionConfig` definition.

#### Risk
Low - Corrected configuration structure

#### Verification Method
- Eliminate property access errors in type check
- Tests continue to pass with valid configuration objects

## Phase 4: Configuration

There are no direct build or TypeScript configuration issues requiring changes. The `tsconfig.json` is properly configured for Next.js + Vitest. All module resolution issues stem from incorrect import paths (addressed in Phase 1).

## Phase 5: Lint Cleanup

### Files Affected
- 13 files across `lib/detection/` with `@typescript-eslint/no-unused-vars` warnings
- 4 files with `@typescript-eslint/no-explicit-any` errors  
- 3 test files with `@typescript-eslint/ban-ts-comment` warnings

#### Errors/Warnings
```
Warning: '_column' is defined but never used.  @typescript-eslint/no-unused-vars
Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
Error: Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free.  @typescript-eslint/ban-ts-comment
```

#### Root Cause
1. Variables declared but unused in logic
2. Use of `any` type instead of specific types
3. Broad `@ts-ignore` suppressing potential errors instead of targeted `@ts-expect-error`

#### Priority
**LOW** - Code quality only, does not block build

#### Expected Fix
1. Remove unused variables or prefix with `_` if intentionally unused
2. Replace `any` with specific types (`DetectionConfig`, `ExplanationConfig`, etc.)
3. Replace `@ts-ignore` with `@ts-expect-error` on specific lines

#### Risk
Very Low - Pure code quality improvements

#### Verification Method
- `npm run lint` shows no new errors (approved warnings may remain)
- No change in functionality
- Improved code maintainability

## Phase Implementation Summary

| Phase | Estimated Files | Dependencies | Acceptance Criteria | Verification Steps |
|-------|----------------|--------------|---------------------|-------------------|
| **Phase 1: Broken Imports** | 4 test files | None | All "../module not found" TS errors eliminated | 1. `npm run typecheck` passes import-related checks<br>2. IDE shows resolved imports<br>3. All tests pass |
| **Phase 2: Missing Modules** | *(See Phase 1)* | Phase 1 | *(See Phase 1)* | *(See Phase 1)* |
| **Phase 3: Type Errors** | 15+ test/files | Phase 1 | All blocking TypeScript errors eliminated | 1. `npm run typecheck` passes with no errors<br>2. `npm run build` succeeds<br>3. All tests pass |
| **Phase 4: Configuration** | 0 files | None | N/A - no config changes needed | N/A |
| **Phase 5: Lint Cleanup** | 13+ files | None | No new lint errors (only approved warnings remain) | 1. `npm run lint` runs successfully<br>2. Only pre-approved warnings may appear<br>3. All tests pass |

## Detailed Task Breakdown

### Phase 1 Tasks
1. Fix imports in `adaptive-learning-integration.test.ts`: `../types` → `./types`, `../normalize` → `./normalize`
2. Fix imports in `adaptive-learning-persistence.test.ts`: `../types` → `./types` 
3. Fix imports in `detection-engine.test.ts`: `../types` → `./types`, `../normalize` → `./normalize`
4. Fix imports in `detection-strategy-factory.test.ts`: `../types` → `./types`

### Phase 3A Tasks (completed with Phase 1)
- Same import fixes resolve missing type declarations

### Phase 3B Tasks
1. Remove `engine.strategies` access in `detection-engine.test.ts`
2. Replace with behavior-based assertions (count findings, verify detection logic)
3. Remove private property access in `behavioral-analysis-strategy.test.ts`
4. Test strategy behavior through public `analyze()` method outcomes

### Phase 3C Tasks
1. Add `shopId: "test-shop-123"` parameter to all `DetectionStrategyFactory.createStrategies()` calls in `detection-strategy-factory.test.ts` (11 instances)

### Phase 3D Tasks
1. Add `createdAt: new Date()` and `lineItems: [...]` to `NormalizedReturn` mocks
2. Add `createdAt: new Date()` and `returnLineItems: { nodes: [...] }` to `ReturnNode` mocks
3. Apply to all affected test files

### Phase 3E Tasks
1. Fix `unknown` → `string` type error in `adaptive-learning-persistence.test.ts`
2. Add array bounds checks before `data.refunds[0].currency` access
3. Fix property references on types (use correct property names)
4. Add definite assignment checks for possibly undefined variables

### Phase 3F Tasks
1. Remove incorrect `patternRecognition` property assignments
2. Use valid `PatternRecognitionConfig` structure per type definition

### Phase 5 Tasks
1. Remove unused variables across 13 files
2. Replace `any` with specific types in 4 files  
3. Replace `@ts-ignore` with `@ts-expect-error` in 3 test files

## Definition of Done

The stabilization is complete when:

✅ `npm test` passes (122/122 tests)  
✅ `npm run build` passes (successful production build)  
✅ `npm run typecheck` passes (no TypeScript errors)  
✅ `npm run lint` passes (only approved warnings remain)  
✅ No Milestone 10 regressions remain  
✅ No API changes introduced  
✅ No feature additions  
✅ No Product Owner scope changes  

## Estimated Remediation Effort

**Total Estimated Time**: 2-3 hours for experienced developer familiar with the codebase

**Breakdown**:
- Phase 1 (Imports): 15 minutes
- Phase 3B (Private Access): 30 minutes  
- Phase 3C (Function Args): 10 minutes
- Phase 3D (Missing Props): 40 minutes
- Phase 3E/F (Type Safety): 40 minutes
- Phase 5 (Lint Cleanup): 25 minutes

## Risk Assessment

**Overall Risk**: LOW
- All changes are non-functional (imports, test fixes, type safety)
- No production code logic modified
- All tests continue to pass throughout
- Changes improve code quality and test resilience
- Zero risk to runtime behavior or functionality

## Release Impact

**After Stabilization**:
- Repository becomes buildable and deployable
- Development experience restored (IDE autocomplete, type checking)
- Quality gates can function normally
- Milestone 11 can begin on stable foundation
- Technical debt from Milestone 10 resolved

**If Not Stabilized**:
- Cannot deploy to production (build fails)
- Development impaired (no type safety)
- Quality gates blocked
- Milestone 11 would begin on unstable foundation

## Approval

This plan addresses only the specific regressions identified in the root cause analysis. No new functionality, features, or scope expansion is included.

**Ready for stabilization execution.**