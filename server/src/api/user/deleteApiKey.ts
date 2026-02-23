import { FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../../lib/auth.js";

export const deleteApiKey = async (
  request: FastifyRequest<{ Params: { keyId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { keyId } = request.params;

    if (!keyId) {
      return reply.status(400).send({ error: "Key ID is required" });
    }

    const result = await auth.api.deleteApiKey({
      body: { keyId },
      headers: request.headers as any,
    });

    return reply.send(result);
  } catch (error: any) {
    console.error("Error deleting API key:", error);
    if (typeof error?.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 500) {
      const message =
        typeof error?.body?.message === "string" ? error.body.message : typeof error?.message === "string" ? error.message : "API key not found";
      return reply.status(error.statusCode).send({ error: message });
    }
    return reply.status(500).send({ error: "Failed to delete API key" });
  }
};
