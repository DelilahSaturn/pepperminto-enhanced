//@ts-nocheck
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { checkSession } from "../lib/session";

export function objectStoreRoutes(fastify: FastifyInstance) {
  const uploadsBaseDir =
    process.env.UPLOADS_DIR?.trim() ||
    path.join(process.cwd(), "uploads");

  const resolveStoredPath = (storedPath: string) => {
    if (path.isAbsolute(storedPath)) return storedPath;

    // Historically we stored paths like "uploads/<id>" relative to CWD.
    // In Docker, CWD may be /app/apps/api while the volume is mounted at /app/uploads.
    // Prefer resolving relative paths against UPLOADS_DIR's parent so persistence works.
    if (storedPath.startsWith(`uploads${path.sep}`) || storedPath.startsWith("uploads/")) {
      const rel = storedPath.replace(/^uploads[\\/]/, "");
      return path.join(uploadsBaseDir, rel);
    }

    return path.join(process.cwd(), storedPath);
  };

  //
  fastify.post(
    "/api/v1/storage/ticket/:id/upload/single",
    {
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
              file: { type: "object", additionalProperties: true },
            },
            additionalProperties: true,
          },
        },
      },
    },

    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await checkSession(request);
      if (!user) {
        return reply.code(401).send({ success: false, message: "Unauthorized" });
      }

      // @fastify/multipart API
      const part: any = await (request as any).file?.();
      if (!part) {
        return reply.code(400).send({ success: false, message: "Missing file" });
      }

      if (!fs.existsSync(uploadsBaseDir)) {
        fs.mkdirSync(uploadsBaseDir, { recursive: true });
      }

      const safeId = crypto.randomUUID();
      const relativePath = path.join("uploads", safeId);
      const absPath = path.join(uploadsBaseDir, safeId);

      let size = 0;
      await new Promise<void>((resolve, reject) => {
        const out = fs.createWriteStream(absPath);
        part.file.on("data", (chunk: any) => {
          size += chunk.length || 0;
        });
        part.file.on("error", reject);
        out.on("error", reject);
        out.on("finish", resolve);
        part.file.pipe(out);
      });

      const uploadedFile = await prisma.ticketFile.create({
        data: {
          ticketId: request.params.id,
          filename: part.filename,
          path: relativePath,
          mime: part.mimetype,
          size,
          encoding: part.encoding,
          userId: user.id,
        },
      });

      reply.send({
        success: true,
        file: {
          id: uploadedFile.id,
          filename: uploadedFile.filename,
          mime: uploadedFile.mime,
          size: uploadedFile.size,
          url: `/api/v1/storage/ticket-file/${uploadedFile.id}`,
        },
      });
    }
  );

  // Guest upload: accepts a short-lived upload token (no session required)
  fastify.post(
    "/api/v1/storage/public/ticket/:id/upload/single",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ticketId = (request.params as any).id as string;
      const token =
        (request.headers["x-upload-token"] as string) ||
        ((request.query as any)?.token as string) ||
        "";

      if (!token) {
        return reply.code(401).send({ success: false, message: "Unauthorized" });
      }

      try {
        const b64string = process.env.SECRET;
        const secret = Buffer.from(b64string!, "base64");
        const verified: any = jwt.verify(token, secret);
        if (
          !verified ||
          verified.kind !== "guest_ticket_upload" ||
          verified.ticketId !== ticketId
        ) {
          return reply.code(401).send({ success: false, message: "Unauthorized" });
        }
      } catch (_e) {
        return reply.code(401).send({ success: false, message: "Unauthorized" });
      }

      const part: any = await (request as any).file?.();
      if (!part) {
        return reply.code(400).send({ success: false, message: "Missing file" });
      }

      if (!fs.existsSync(uploadsBaseDir)) {
        fs.mkdirSync(uploadsBaseDir, { recursive: true });
      }

      const safeId = crypto.randomUUID();
      const relativePath = path.join("uploads", safeId);
      const absPath = path.join(uploadsBaseDir, safeId);

      let size = 0;
      await new Promise<void>((resolve, reject) => {
        const out = fs.createWriteStream(absPath);
        part.file.on("data", (chunk: any) => {
          size += chunk.length || 0;
        });
        part.file.on("error", reject);
        out.on("error", reject);
        out.on("finish", resolve);
        part.file.pipe(out);
      });

      // Ensure a shared "Guest" user exists to attribute uploads as client-side.
      const guestEmail = "guest@pepperminto.local";
      let guest = await prisma.user.findUnique({ where: { email: guestEmail } });
      if (!guest) {
        guest = await prisma.user.create({
          data: {
            name: "Guest",
            email: guestEmail,
            isAdmin: false,
            external_user: true,
            firstLogin: false,
          },
        });
      }

      const uploadedFile = await prisma.ticketFile.create({
        data: {
          ticketId,
          filename: part.filename,
          path: relativePath,
          mime: part.mimetype,
          size,
          encoding: part.encoding,
          userId: guest.id,
        },
      });

      return reply.send({
        success: true,
        file: {
          id: uploadedFile.id,
          filename: uploadedFile.filename,
          mime: uploadedFile.mime,
          size: uploadedFile.size,
          url: `/api/v1/storage/ticket-file/${uploadedFile.id}`,
        },
      });
    }
  );

  // List ticket attachments (auth required)
  fastify.get(
    "/api/v1/storage/ticket/:id/files",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await checkSession(request);
      if (!user) {
        return reply.code(401).send({ success: false, message: "Unauthorized" });
      }

      const { id }: any = request.params;

      const files = await prisma.ticketFile.findMany({
        where: { ticketId: id },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              isAdmin: true,
              external_user: true,
            },
          },
        },
      });

      const existingFiles = [];

      for (const f of files) {
        const absPath = resolveStoredPath(f.path);

        if (!fs.existsSync(absPath)) {
          try {
            await prisma.ticketFile.delete({ where: { id: f.id } });
          } catch {
            // ignore cleanup failure
          }
          continue;
        }

        existingFiles.push(f);
      }

      return reply.send({
        success: true,
        files: existingFiles.map((f) => ({
          id: f.id,
          filename: f.filename,
          mime: f.mime,
          size: f.size,
          createdAt: f.createdAt,
          user: f.user,
          url: `/api/v1/storage/ticket-file/${f.id}`,
        })),
      });
    }
  );

  // Download/serve an attachment (auth required). If the backing file
  // is missing on disk, clean up the database record as well.
  fastify.get(
    "/api/v1/storage/ticket-file/:fileId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await checkSession(request);
      if (!user) {
        return reply.code(401).send({ success: false, message: "Unauthorized" });
      }

      const { fileId }: any = request.params;
      const file = await prisma.ticketFile.findUnique({ where: { id: fileId } });
      if (!file) {
        return reply.code(404).send({ success: false, message: "Not found" });
      }

      const absPath = resolveStoredPath(file.path);

      if (!fs.existsSync(absPath)) {
        try {
          await prisma.ticketFile.delete({
            where: { id: fileId },
          });
        } catch {
          // ignore cleanup failure
        }
        return reply
          .code(404)
          .send({ success: false, message: "Missing file on disk" });
      }

      reply.header("Content-Type", file.mime || "application/octet-stream");
      reply.header(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(file.filename || "file")}"`
      );
      return reply.send(fs.createReadStream(absPath));
    }
  );

  // Delete an attachment (admin or file owner)
  fastify.delete(
    "/api/v1/storage/ticket-file/:fileId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await checkSession(request);
      if (!user) {
        return reply.code(401).send({ success: false, message: "Unauthorized" });
      }

      const { fileId }: any = request.params;
      const file = await prisma.ticketFile.findUnique({ where: { id: fileId } });
      if (!file) {
        return reply.code(404).send({ success: false, message: "Not found" });
      }

      // Only allow admins or the user who uploaded the file
      if (!user.isAdmin && file.userId !== user.id) {
        return reply.code(403).send({ success: false, message: "Forbidden" });
      }

      const absPath = resolveStoredPath(file.path);

      try {
        if (fs.existsSync(absPath)) {
          fs.unlinkSync(absPath);
        }
      } catch {
        // ignore fs errors, we still remove the DB record
      }

      await prisma.ticketFile.delete({
        where: { id: fileId },
      });

      return reply.send({ success: true });
    }
  );
}
