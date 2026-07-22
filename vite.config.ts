// vite.config.ts — TanStack Start + Nitro (deploy oficial na Vercel)
// O plugin nitro() gera o output de servidor que a Vercel serve,
// substituindo o que o @lovable.dev/vite-tanstack-config fazia por baixo.
// Ref: https://vercel.com/docs/frameworks/full-stack/tanstack-start

import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Mantém o wrapper SSR de erros (src/server.ts) como entry do servidor
      server: { entry: "server" },
    }),
    nitro(),
    viteReact(),
  ],
});
