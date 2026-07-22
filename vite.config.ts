// vite.config.ts — substituição do @lovable.dev/vite-tanstack-config
// Config vanilla do TanStack Start, com alvo de deploy Vercel.
//
// ⚠️ NOTA PARA O DEV: a opção de target do TanStack Start mudou entre
// versões. Se `target: "vercel"` não for aceito no build, use uma destas
// alternativas equivalentes:
//   a) variável de ambiente NITRO_PRESET=vercel no projeto da Vercel
//   b) mover o preset para as opções do nitro
// Validar com `bun run build` local antes do primeiro deploy.

import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      target: "vercel",
      // Mantém o wrapper SSR de erros (src/server.ts) como entry do servidor,
      // igual fazia a config do Lovable.
      server: { entry: "server" },
    }),
    // viteReact precisa vir DEPOIS do tanstackStart
    viteReact(),
  ],
});
