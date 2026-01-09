import type { FastifyBaseLogger } from "fastify";
import { pino } from "pino";
import { IS_CLOUD } from "../const.js";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const hasAxiom = !!(process.env.AXIOM_DATASET && process.env.AXIOM_TOKEN);

export const createLogger = (name: string): FastifyBaseLogger => {
  if (isProduction && hasAxiom && IS_CLOUD) {
    return pino({
      name,
      level: process.env.LOG_LEVEL || "info",
      transport: {
        targets: [
          {
            target: "@axiomhq/pino",
            level: process.env.LOG_LEVEL || "info",
            options: {
              dataset: process.env.AXIOM_DATASET,
              token: process.env.AXIOM_TOKEN,
            },
          },
          {
            target: "pino-pretty",
            level: process.env.LOG_LEVEL || "info",
            options: {
              colorize: true,
              singleLine: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname,name",
              destination: 1,
            },
          },
        ],
      },
    }) as FastifyBaseLogger;
  }

  if (isDevelopment) {
    return pino({
      name,
      level: process.env.LOG_LEVEL || "debug",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname,name",
        },
      },
    }) as FastifyBaseLogger;
  }

  return pino({
    name,
    level: process.env.LOG_LEVEL || "info",
  }) as FastifyBaseLogger;
};

export const logger = createLogger("rybbit");

export const createServiceLogger = (service: string) => {
  return logger.child({ service });
};
