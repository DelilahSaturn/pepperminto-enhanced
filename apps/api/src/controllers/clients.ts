import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { track } from "../lib/hog";
import { requirePermission } from "../lib/roles";
import { prisma } from "../prisma";

export function clientRoutes(fastify: FastifyInstance) {
  // Register a new client
  fastify.post(
    "/api/v1/client/create",
    {
      preHandler: requirePermission(["client::create"]),
      schema: {
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            number: { type: ["string", "number"] },
            contactName: { type: "string" },
          },
          required: ["name", "email", "number", "contactName"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, email, number, contactName }: any = request.body;

      const client = await prisma.client.create({
        data: {
          name,
          contactName,
          email,
          number: String(number),
        },
      });

      const hog = track();

      hog.capture({
        event: "client_created",
        distinctId: client.id,
      });

      reply.send({
        success: true,
      });
    }
  );

  // Update client
  fastify.post(
    "/api/v1/client/update",
    {
      preHandler: requirePermission(["client::update"]),
      schema: {
        body: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            number: { type: ["string", "number"] },
            contactName: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, email, number, contactName, id }: any = request.body;

      await prisma.client.update({
        where: { id: id },
        data: {
          name,
          contactName,
          email,
          number: String(number),
        },
      });

      reply.send({
        success: true,
      });
    }
  );

  // Get all clients
  fastify.get(
    "/api/v1/clients/all",
    {
      // Allow either explicit client read permission OR ticket transfer permission
      // (needed for assigning clients to tickets).
      preHandler: requirePermission(["client::read", "issue::transfer"], false),
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              clients: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Best-effort backfill: ensure every external user has a matching Client row,
      // so existing portal users appear in the admin client list.
      const [existingClients, externalUsers] = await Promise.all([
        prisma.client.findMany({ select: { email: true } }),
        prisma.user.findMany({
          where: { external_user: true },
          select: { email: true, name: true },
        }),
      ]);

      const existingEmails = new Set(
        existingClients
          .map((c) => String(c.email || "").trim().toLowerCase())
          .filter(Boolean)
      );

      for (const u of externalUsers) {
        const email = String(u.email || "").trim().toLowerCase();
        if (!email || existingEmails.has(email)) continue;
        const displayName =
          (u.name && u.name.trim().length > 0
            ? u.name.trim()
            : email.split("@")[0]) || "Customer";
        try {
          await prisma.client.create({
            data: {
              email,
              name: displayName,
              contactName: displayName,
            },
          });
          existingEmails.add(email);
        } catch {
          // ignore races/unique conflicts
        }
      }

      const clients = await prisma.client.findMany({});

      reply.send({
        success: true,
        clients: clients,
      });
    }
  );

  // Delete client
  fastify.delete(
    "/api/v1/clients/:id/delete-client",
    {
      preHandler: requirePermission(["client::delete"]),
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id }: any = request.params;

      const client = await prisma.client.findUnique({
        where: { id },
        select: { email: true },
      });

      if (client?.email) {
        const email = String(client.email).trim().toLowerCase();

        // Best-effort: delete any external users with the same email and their sessions/notifications.
        const externalUsers = await prisma.user.findMany({
          where: { email, external_user: true },
          select: { id: true },
        });

        for (const u of externalUsers) {
          await prisma.notes.deleteMany({ where: { userId: u.id } });
          await prisma.session.deleteMany({ where: { userId: u.id } });
          await prisma.notifications.deleteMany({ where: { userId: u.id } });
          await prisma.user.delete({ where: { id: u.id } });
        }
      }

      await prisma.client.delete({ where: { id } });

      reply.send({
        success: true,
      });
    }
  );
}
