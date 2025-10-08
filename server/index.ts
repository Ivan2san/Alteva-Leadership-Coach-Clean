import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes.ts";
import { setupVite, serveStatic, log } from "./vite.ts";
import { seedAdminUser, migrateExistingData } from "./seed-admin";

const app = express();

// CORS (dev-friendly)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin as string | undefined);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Compact API logging (TS-safe res.json override)
app.use((req, res, next) => {
  const start = Date.now();
  let captured: unknown;
  const origJson = res.json.bind(res);
  (res as any).json = (body: unknown) => {
    captured = body;
    return origJson(body);
  };
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      let line = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
      if (captured !== undefined) line += ` :: ${JSON.stringify(captured)}`;
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
    }
  });
  next();
});

// Health endpoints early
app.get("/health", (_req, res) => res.status(200).send("OK"));
app.get("/", (req, res, next) => {
  // Non-browser health checks (no HTML accept) get OK
  if (!req.get("Accept")?.includes("text/html")) return res.status(200).send("OK");
  next();
});

// Process diagnostics
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at:", p, "reason:", reason);
  process.exit(1);
});

console.log("Starting server initialization...");

async function startServer() {
  try {
    // Register routes; some setups return an http.Server
    let server: import("http").Server | undefined = (await registerRoutes(app)) as any;

    // Fallback: ensure we have an http.Server to listen on
    if (!server || typeof (server as any).listen !== "function") {
      const { createServer } = await import("node:http");
      server = createServer(app);
    }

    // Error middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      await setupVite(app, server); // dev middleware
    } else {
      serveStatic(app); // serve built assets
    }

    // Single, consistent port
    const port = Number(process.env.PORT ?? 5000);

    const serverInstance = server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server successfully started on port ${port}`);
      log(`serving on port ${port}`);

      // Seed/migrate in background
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

    serverInstance.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} in use. Try a different PORT (e.g. 5001).`);
        process.exit(1);
      }
      console.error("Server error:", err);
    });

    serverInstance.on("listening", () => {
      console.log("Server listening event fired");
    });
  } catch (error) {
    console.error("Fatal server startup error:", error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error("Unhandled server error:", error);
  process.exit(1);
});
