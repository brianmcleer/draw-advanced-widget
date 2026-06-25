// Global ambient declarations for this widget (script file: no top-level import/export).
// Pulled into the program via a triple-slash reference in widget.tsx so it is never
// skipped by tsconfig include rules.
declare module '*.svg' {
  const content: string;
  export default content;
}
