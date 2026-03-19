import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import "dotenv/config";
import bcrypt from "bcrypt";
import Fastify, { FastifyInstance } from "fastify";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { track } from "./lib/hog";
import { getEmails } from "./lib/imap";
import { checkToken } from "./lib/jwt";
import { prisma } from "./prisma";
import { registerRoutes } from "./routes";

// Ensure the directory exists
const logFilePath = "./logs.log"; // Update this path to a writable location

// Create a writable stream
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

// Initialize Fastify with logger
const server: FastifyInstance = Fastify({
  logger: {
    stream: logStream, // Use the writable stream
  },
  disableRequestLogging: true,
  trustProxy: true,
});

const publicRoutes = new Set([
  "/",
  "/api/v1/auth/login",
  "/api/v1/auth/user/register/external",
  "/api/v1/ticket/public/create",
  "/docs",
  "/docs/json",
  "/docs/yaml",
]);

function normalizeUrl(url: string) {
  const parts = url.split("/").filter(Boolean);

  // Handle language-prefixed routes like /en/... or /en-US/...
  if (parts.length > 0 && /^[a-z]{2}(-[A-Z]{2})?$/.test(parts[0])) {
    const withoutLang = "/" + parts.slice(1).join("/");
    return withoutLang.startsWith("//") ? withoutLang.slice(1) : withoutLang;
  }

  return url;
}

function isPublicRoute(url: string) {
  const normalized = normalizeUrl(url);
  return (
    publicRoutes.has(normalized) ||
    // Allow slight variations (trailing slashes, query strings) for known public endpoints
    normalized.startsWith("/api/v1/auth/user/register/external") ||
    normalized.startsWith("/docs/") ||
    normalized.startsWith("/api/v1/knowledge-base/public") ||
    normalized.startsWith("/api/v1/storage/public/")
  );
}

function inferTag(url: string) {
  if (url === "/") {
    return "health";
  }
  const parts = url.split("/").filter(Boolean);
  const resource = parts[2] || "general";
  const tagMap: Record<string, string> = {
    auth: "auth",
    ticket: "tickets",
    tickets: "tickets",
    client: "clients",
    clients: "clients",
    config: "config",
    data: "data",
    notebook: "notebook",
    queue: "queue",
    webhooks: "webhooks",
    storage: "storage",
    roles: "roles",
    users: "users",
    time: "time",
    "knowledge-base": "knowledge-base",
  };
  return tagMap[resource] || "general";
}

server.register(async (app) => {
  app.addHook("onRoute", (routeOptions: any) => {
    const url = routeOptions.url as string;
    if (!url.startsWith("/api") && url !== "/") {
      return;
    }
    const method = Array.isArray(routeOptions.method)
      ? routeOptions.method.join(",")
      : routeOptions.method;

    const schema = routeOptions.schema ?? {};
    if (!schema.tags) {
      schema.tags = [inferTag(url)];
    }
    if (!schema.summary) {
      schema.summary = `${method} ${url}`;
    }
    if (!schema.security && !isPublicRoute(url)) {
      schema.security = [{ bearerAuth: [] }];
    }
    routeOptions.schema = schema;
  });

  app.register(cors, {
    origin: "*",

    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });

  app.register(multipart, {
    limits: {
      // 50MB per file by default; adjust if you want bigger
      fileSize: 50 * 1024 * 1024,
    },
  });

  registerRoutes(app);

  app.get(
    "/",
    {
      schema: {
        tags: ["health"], // This groups the endpoint under a category
        description: "Health check endpoint",
        response: {
          200: {
            type: "object",
            properties: {
              healthy: { type: "boolean" },
            },
          },
        },
      },
    },
    async function (request, response) {
      response.send({ healthy: true });
    }
  );

  // JWT authentication hook
  app.addHook("preHandler", async function (request: any, reply: any) {
    try {
      if (isPublicRoute(request.url)) {
        return true;
      }
      const bearer = request.headers.authorization?.split(" ")[1];

      // Allow cookie-based auth for same-origin browser requests (e.g. images/downloads)
      const cookieHeader = request.headers.cookie || "";
      const cookieMatch = cookieHeader
        .split(";")
        .map((v: string) => v.trim())
        .find((v: string) => v.startsWith("session="));
      const cookieToken = cookieMatch
        ? decodeURIComponent(cookieMatch.slice("session=".length))
        : null;

      const token = bearer || cookieToken;
      if (!token) {
        throw new Error("missing token");
      }

      // Normalize so downstream handlers that read Authorization still work
      request.headers.authorization = `Bearer ${token}`;

      checkToken(token);
    } catch (err) {
      reply.status(401).send({
        message: "Unauthorized",
        success: false,
      });
    }
  });

  app.register(swagger, {
    openapi: {
      info: {
        title: "Pepperminto API",
        description: "Pepperminto API documentation",
        version: "0.1.3",
      },
      servers: [
        {
          url: process.env.API_BASE_URL || "http://localhost:3001",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  app.register(swaggerUI, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    staticCSP: true,
  });
});

const start = async () => {
  try {
    // Run prisma generate and migrate commands before starting the server
    const cwd = process.cwd();
    const prismaCwd = process.env.PRISMA_CWD
      ? path.resolve(process.env.PRISMA_CWD)
      : cwd.endsWith(`${path.sep}apps${path.sep}api`)
      ? cwd
      : path.resolve(cwd, "apps/api");
    const prismaBin = process.env.PRISMA_CLI_PATH
      ? path.resolve(process.env.PRISMA_CLI_PATH)
      : path.join(prismaCwd, "node_modules/.bin/prisma");
    const prismaCmd = fs.existsSync(prismaBin)
      ? prismaBin
      : `node ${path.join(prismaCwd, "node_modules/prisma/build/index.js")}`;
    const prismaSchema =
      process.env.PRISMA_SCHEMA_PATH ??
      path.join(prismaCwd, "src/prisma/schema.prisma");

    await new Promise<void>((resolve, reject) => {
      execFile(
        prismaCmd,
        ["migrate", "deploy", "--schema", prismaSchema],
        { cwd: prismaCwd, env: process.env },
        (err, stdout, stderr) => {
          if (err) {
            console.error(err);
            reject(err);
          }
          console.log(stdout);
          console.error(stderr);

          execFile(
            prismaCmd,
            ["generate", "--schema", prismaSchema],
            { cwd: prismaCwd, env: process.env },
            (err, stdout, stderr) => {
              if (err) {
                console.error(err);
                reject(err);
              }
              console.log(stdout);
              console.error(stderr);
            }
          );

          execFile(
            prismaCmd,
            ["db", "seed", "--schema", prismaSchema],
            { cwd: prismaCwd, env: process.env },
            (err, stdout, stderr) => {
              if (err) {
                console.error(err);
                reject(err);
              }
              console.log(stdout);
              console.error(stderr);
              resolve();
            }
          );
        }
      );
    });

    // connect to database
    await prisma.$connect();
    server.log.info("Connected to Prisma");

    // Ensure a config row exists (fresh DBs may not have one).
    const existingConfig = await prisma.config.findFirst();
    if (!existingConfig) {
      await prisma.config.create({
        data: {
          sso_active: false,
          roles_active: false,
          feature_previews: false,
          first_time_setup: true,
        },
      });
      server.log.info("Created default config row");
    }

    // Bootstrap default admin user for fresh installs.
    // If no admin exists yet, we create one so users can log in immediately.
    // Not configurable via env (to avoid leaking credentials via environment/config).
    const initEmail = "admin@admin.com";
    const initPassword = "1234";
    const initName = "Admin";

    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    if (adminCount === 0) {
      const existing = await prisma.user.findUnique({
        where: { email: initEmail },
      });
      if (!existing) {
        await prisma.user.create({
          data: {
            email: initEmail,
            name: initName,
            password: await bcrypt.hash(initPassword, 10),
            isAdmin: true,
            external_user: false,
            firstLogin: true,
          },
        });
        server.log.info(`Bootstrapped initial admin user: ${initEmail}`);
      }
    }

    server.listen(
      { port: 3001, host: "0.0.0.0" },
      async (err, address) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }

        const client = track();

        client.capture({
          event: "server_started",
          distinctId: "uuid",
        });

        client.shutdown();
        console.info(`Server listening on ${address}`);
      }
    );

    setInterval(() => getEmails(), 10000); // Call getEmails every minute
  } catch (err) {
    server.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
