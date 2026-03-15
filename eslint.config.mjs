import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prisma/**",
    "tests/**",
    "src/__tests__/**",
  ]),
  {
    rules: {
      // any kullanımı hata yerine uyarı — eski kodla uyumluluk için
      "@typescript-eslint/no-explicit-any": "warn",
      // Kullanılmayan değişkenler — uyarı
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // img etiketi — uyarı
      "@next/next/no-img-element": "warn",
      // @ts-ignore yerine @ts-expect-error önerisi — uyarı
      "@typescript-eslint/ban-ts-comment": ["warn", { "ts-ignore": "allow-with-description" }],
      // React bileşenlerinde impure function — uyarı (Date.now() render içinde kabul edilebilir)
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
