1. **Identify the Bottleneck**: In `BlockPipeline.tsx`, `sinusoidalPE(T, D)` is called inside a `useMemo` block that runs when `sentence` changes, and again within the component body during render (`values: sinusoidalPE(T, D)`). `T` and `D` are module-level constants (4 and 8, respectively). Since they are constant, `sinusoidalPE(T, D)` evaluates to the exact same matrix every time, but because it is not pre-computed at the module level, it reconstructs the matrix on each render and recalculation.

2. **Refactor `BlockPipeline.tsx`**:
    * Extract `const PE_MATRIX = sinusoidalPE(T, D);` to the module level.
    * Replace all inline `sinusoidalPE(T, D)` calls inside `BlockPipeline` and `DepthView` with `PE_MATRIX`.

3. **Refactor `BlockDepth.tsx`**:
    * Similar to `BlockPipeline`, `BlockDepth` calls `sinusoidalPE(T, D)` inside a `useMemo` block. `T` and `D` are local variables that act as constants (both are 4 and 8, respectively).
    * Extract `const PE_MATRIX = sinusoidalPE(4, 8);` to the module scope in `BlockDepth.tsx`.
    * Replace `const pe = sinusoidalPE(T, D);` with `PE_MATRIX`.

4. **Verify the Fix**:
    * Run format and linter.
    * Run test suite in `tensor-dojo`.

5. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
