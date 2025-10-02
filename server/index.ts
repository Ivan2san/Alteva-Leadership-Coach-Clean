import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { createServer, type Server as HttpServer } from "node:http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedAdminUser, migrateExistingData } from "./seed-admin";

const app = express();

// Enable CORS for development
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

// API request logging (compact, TS-safe res.json override)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJson: unknown;

  const originalResJson = res.json.bind(res);
  (res as any).json = (body: unknown) => {
    capturedJson = body;
    return originalResJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let line = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJson !== undefined) line += ` :: ${JSON.stringify(capturedJson)}`;
      if (line.length > 80) line = line.slice(0, 79) + "…";
      log(line);
    }
  });
  next();
});

// Health endpoints early
app.get("/health", (_req, res) => res.status(200).send("OK"));
app.get("/", (req, res, next) => {
  // If it's likely a health check (no HTML requested), answer OK
  if (!req.get("Accept")?.includes("text/html")) return res.status(200).send("OK");
  next();
});

// Process diagnostics
process.on("exit", (code) => console.log(`Process exiting with code: ${code}`));
process.on("beforeExit", (code) => console.log(`Process beforeExit with code: ${code}`));
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

console.log("Starting server initialization...");

async function startServer() {
  try {
    // Register app routes; some setups may return an http.Server (e.g. when wiring websockets)
    let server = (await registerRoutes(app)) as unknown as HttpServer | undefined;

    // Fallback: if routes didn’t create an http.Server, create one now.
    if (!server || typeof server.listen !== "function") {
      server = createServer(app);
    }

    // Error middleware (after routes)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Server error:", err);
      res.status(status).json({ message });
    });

    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
      await setupVite(app, server); // dev: Vite middleware
    } else {
      serveStatic(app); // prod: serve built assets
    }

    const port = Number(process.env.PORT ?? 5000);

    server.listen(port, "0.0.0.0", () => {
      console.log(`✅ Server successfully started on port ${port}`);
      log(`serving on port ${port}`);

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

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} in use. Try a different PORT (e.g. 5001).`);
        process.exit(1);
      }
      console.error("Server error:", err);
    });

    server.on("listening", () => {
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
