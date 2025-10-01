import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
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

// API request logging (compact)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

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
    // Health checks first
    app.get("/health", (_req, res) => res.status(200).send("OK"));

    app.get("/", (req, res, next) => {
      if (req.path === "/" && req.method === "GET") {
        if (!req.get("Accept")?.includes("text/html")) {
          return res.status(200).send("OK");
        }
      }
      next();
    });

    // Register app routes; some setups return an http.Server (for websockets, etc.)
    let server: import("http").Server | undefined = (await registerRoutes(app)) as any;

    // Fallback: if routes did not create an http.Server, create one now.
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
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Single, consistent port variable
    const port = Number(process.env.PORT ?? 5000);

    // IMPORTANT: listen only once, on the http.Server we decided on above.
    const serverInstance = server.listen(port, "0.0.0.0", () => {
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

    console.log("Server setup complete, starting keep-alive loop");

    let isRunning = true;
    process.once("SIGTERM", () => {
      console.log("Received SIGTERM, shutting down gracefully");
      isRunning = false;
      serverInstance.close();
    });

    while (isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
    console.log("Server shutting down");
  } catch (error) {
    console.error("Fatal server startup error:", error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error("Unhandled server error:", error);
  process.exit(1);
});
