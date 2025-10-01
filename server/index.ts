import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedAdminUser, migrateExistingData } from "./seed-admin";

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

// Compact API logging
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
    // Register routes; get a real http.Server back
    const server = await registerRoutes(app);

    // Error handler
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

    const PORT = Number(process.env.PORT || 5000);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server successfully started on port ${PORT}`);
      log(`serving on port ${PORT}`);

      // Seed/migrate in background
      if (process.env.NODE_ENV !== "test") {
        setImmediate(async () => {
          try {
            console.log("Starting background database initialization...");
            const admin = await seedAdminUser();
            if (admin) await migrateExistingData(admin.id);
            console.log("Background database initialization completed");
          } catch (e) {
            console.error("Background database initialization failed:", e);
          }
        });
      }
    });

    server.on("error", (err) => {
      console.error("Server error:", err);
    });

    process.once("SIGTERM", () => {
      console.log("Received SIGTERM, shutting down gracefully");
      server.close();
    });
  } catch (error) {
    console.error("Fatal server startup error:", error);
    process.exit(1);
  }
}

startServer().catch((err) => {
  console.error("Unhandled server error:", err);
  process.exit(1);
});
