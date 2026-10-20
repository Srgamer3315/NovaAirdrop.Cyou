import express from "express";
import { createServer as createViteServer } from "vite";
import apiApp from "./artifacts/api-server/src/app";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

async function startServer(): Promise<void> {
  const app = express();

  // Mount API server for /api and session handling
  app.use(apiApp);

  if (process.env.NODE_ENV === "production") {
    const distCandidates = [
      path.resolve(__dirname, "artifacts/nova-airdrop/dist/public"),
      path.resolve(__dirname, "artifacts/nova-airdrop/dist"),
    ];
    const staticDir = distCandidates.find((dir) => fs.existsSync(dir));

    if (staticDir) {
      app.use(express.static(staticDir));
      app.get("*", (_req, res) => {
        res.sendFile(path.resolve(staticDir, "index.html"));
      });
    }
  } else {
    // Development mode: Vite middleware mounted on Express
    const vite = await createViteServer({
      root: path.resolve(__dirname, "artifacts/nova-airdrop"),
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
        allowedHosts: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Nova Airdrop server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err: unknown) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
