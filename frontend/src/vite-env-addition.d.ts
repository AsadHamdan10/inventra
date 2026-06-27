// Ambient declaration for the build-time constant injected via
// `define` in vite.config.ts. Without this, TypeScript would error
// on the reference in src/config/version.ts.
declare const __APP_BUILD_TIME__: string;
