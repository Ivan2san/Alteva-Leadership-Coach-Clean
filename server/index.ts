import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { createServer } from "node:http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedAdminUser, migrateExistingData } from "./seed-admin";
import { createServer } from "node:http";

const app = express();

// CORS (dev-friendly)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin as string | undefined);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

<<<<<<< HEAD
// Compact API logging (TS-safe override)
=======
// Compact API logging (TS-safe override of res.json)
>>>>>>> a5f48d0 (feat(journey): add v2 router gate + dashboard stub; fix single listen; add free-ports script)
app.use((req, res, next) => {
  const start = Date.now();
  let captured: unknown;
  const origJson = res.json.bind(res);
  (res as any).json = (body: unknown) => {
    captured = body;
    return origJson(body as any);
  };
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      let line = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
      if (captured) line += ` :: ${JSON.stringify(captured)}`;
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
    }
  });
  next();
});

// Health endpoints early
app.get("/health", (_req, res) => res.status(200).send("OK"));
app.get("/", (req, res, next) => {
  if (!req.get("Accept")?.includes("text/html")) return res.status(200).send("OK");
  next();
});

console.log("Starting server initialization...");

async function startServer() {
  try {
<<<<<<< HEAD
    // Register routes; prefer an http.Server if provided
    let server = (await registerRoutes(app)) as any;
    if (!server || typeof server.listen !== "function") {
      server = createServer(app);
    }

    // Error middleware
=======
    // Register routes; some setups may return an http.Server (e.g., websockets)
    let server: import("http").Server | undefined = (await registerRoutes(app)) as any;
    if (!server || typeof (server as any).listen !== "function") {
      server = createServer(app);
    }

    // Error handler (after routes)
>>>>>>> a5f48d0 (feat(journey): add v2 router gate + dashboard stub; fix single listen; add free-ports script)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = Number(process.env.PORT ?? 5000);
<<<<<<< HEAD

    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server successfully started on port ${port}`);
      log(`serving on port ${port}`);

=======
    const serverInstance = server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server successfully started on port ${port}`);
      log(`serving on port ${port}`);

>>>>>>> a5f48d0 (feat(journey): add v2 router gate + dashboard stub; fix single listen; add free-ports script)
      if (process.env.NODE_ENV !== "test") {
        setImmediate(async () => {
          try {
            console.log("Starting background database initialization...");
            const adminUser = await seedAdminUser();
            if (adminUser) await migrateExistingData(adminUser.id);
            console.log("Background database initialization completed");
          } catch (error) {
            console.error("Background database initialization failed:", error);
          }
        });
      }
    });

<<<<<<< HEAD
    server.on("error", (err: NodeJS.ErrnoException) => {
=======
    serverInstance.on("error", (err: NodeJS.ErrnoException) => {
>>>>>>> a5f48d0 (feat(journey): add v2 router gate + dashboard stub; fix single listen; add free-ports script)
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} in use. Try a different PORT (e.g. 5001).`);
        process.exit(1);
      }
      console.error("Server error:", err);
    });

<<<<<<< HEAD
    server.on("listening", () => {
      console.log("Server listening event fired");
    });
=======
>>>>>>> a5f48d0 (feat(journey): add v2 router gate + dashboard stub; fix single listen; add free-ports script)
  } catch (error) {
    console.error("Fatal server startup error:", error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error("Unhandled server error:", error);
  process.exit(1);
});

