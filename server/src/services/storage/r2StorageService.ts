import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Readable } from "stream";
import { gunzipSync, gzipSync } from "zlib";
import { IS_CLOUD } from "../../lib/const.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

type ZstdModule = {
  compress: (input: Buffer, level?: number | null) => Promise<Buffer>;
  decompress: (input: Buffer) => Promise<Buffer>;
};

class R2StorageService {
  private client: S3Client | null = null;
  private bucketName: string = "";
  private enabled: boolean = false;
  private logger = createServiceLogger("r2-storage");
  private zstdModulePromise: Promise<ZstdModule | null> | null = null;
  private zstdUnavailableLogged = false;

  constructor() {
    // Only initialize R2 in cloud environment
    if (IS_CLOUD && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
      // Create a custom HTTP handler that strips checksum headers
      const httpHandler = new NodeHttpHandler();
      const originalHandle = httpHandler.handle.bind(httpHandler);

      httpHandler.handle = async (request: any, options?: any) => {
        const response = await originalHandle(request, options);

        // Wrap the response to strip checksum headers
        return {
          ...response,
          response: {
            ...response.response,
            headers: Object.fromEntries(
              Object.entries(response.response.headers).filter(([key]) => !key.toLowerCase().includes("checksum"))
            ),
          },
        };
      };

      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
        // Required for R2 compatibility
        forcePathStyle: true,
        // Use our custom HTTP handler
        requestHandler: httpHandler,
      });

      this.bucketName = process.env.R2_BUCKET_NAME || "pocketlytics";
      this.enabled = true;
      this.logger.info({ bucket: this.bucketName }, "R2Storage initialized");
    } else {
      this.logger.debug("R2Storage not enabled - missing IS_CLOUD or R2 credentials");
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async getZstdModule(): Promise<ZstdModule | null> {
    if (!this.zstdModulePromise) {
      this.zstdModulePromise = import("@mongodb-js/zstd")
        .then((mod) => ({
          compress: mod.compress,
          decompress: mod.decompress,
        }))
        .catch((error) => {
          if (!this.zstdUnavailableLogged) {
            this.zstdUnavailableLogged = true;
            this.logger.warn(
              { error: error instanceof Error ? error.message : String(error) },
              "zstd module unavailable, falling back to gzip where possible"
            );
          }
          return null;
        });
    }

    return this.zstdModulePromise;
  }

  /**
   * Store a batch of event data in R2
   * Returns the storage key if successful, null if R2 is disabled
   */
  async storeBatch(siteId: number, sessionId: string, eventDataArray: any[]): Promise<string | null> {
    if (!this.enabled || !this.client) {
      return null;
    }

    const timestamp = Date.now();

    try {
      const zstd = await this.getZstdModule();
      const jsonBuffer = Buffer.from(JSON.stringify(eventDataArray));
      const useZstd = zstd !== null;
      const key = `${siteId}/${sessionId}/${timestamp}.json.${useZstd ? "zst" : "gz"}`;
      const compressed = useZstd ? await zstd.compress(jsonBuffer, 3) : gzipSync(jsonBuffer);

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: compressed,
          ContentType: "application/octet-stream", // Binary data, not JSON
          // Don't set ContentEncoding - that triggers automatic decompression
          Metadata: {
            siteId: siteId.toString(),
            sessionId: sessionId,
            eventCount: eventDataArray.length.toString(),
            compression: useZstd ? "zstd" : "gzip",
          },
        })
      );

      return key;
    } catch (error) {
      console.error("[R2Storage] Failed to store batch:", error);
      throw error;
    }
  }

  /**
   * Retrieve a batch of event data from R2
   * Returns the decompressed event data array
   */
  async getBatch(key: string): Promise<any[]> {
    if (!this.enabled || !this.client) {
      throw new Error("R2 storage is not enabled");
    }

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );

      if (!response.Body) {
        throw new Error("Empty response body");
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      // Check if data is already JSON (uncompressed)
      // This happens when ContentEncoding was set to "zstd" and R2 auto-decompressed it
      const bufferStr = buffer.toString("utf8", 0, Math.min(buffer.length, 100));
      const isLikelyJSON = bufferStr.trimStart().startsWith("[") || bufferStr.trimStart().startsWith("{");

      if (isLikelyJSON) {
        try {
          // Try parsing as JSON first
          return JSON.parse(buffer.toString());
        } catch (e) {
          // Not valid JSON, proceed with decompression
        }
      }

      // Try to decompress based on file extension
      let decompressed: Buffer;
      const zstd = await this.getZstdModule();
      const compressionHint = (response.Metadata?.compression || "").toLowerCase();

      try {
        const isZstd = key.endsWith(".zst") || compressionHint === "zstd";
        const isGzip = key.endsWith(".gz") || compressionHint === "gzip";

        if (isZstd) {
          if (!zstd) {
            throw new Error("zstd-compressed payload cannot be read: @mongodb-js/zstd is unavailable");
          }
          decompressed = await zstd.decompress(buffer);
        } else if (isGzip) {
          decompressed = gunzipSync(buffer);
        } else {
          if (zstd) {
            decompressed = await zstd.decompress(buffer);
          } else {
            decompressed = gunzipSync(buffer);
          }
        }
        return JSON.parse(decompressed.toString());
      } catch (decompressionError: any) {
        // If decompression fails and we haven't tried JSON yet, try it now
        if (!isLikelyJSON) {
          try {
            return JSON.parse(buffer.toString());
          } catch (jsonError) {
            // Data is truly corrupted, throw the original error
            throw decompressionError;
          }
        }
        throw decompressionError;
      }
    } catch (error) {
      console.error("[R2Storage] Failed to retrieve batch:", error);
      throw error;
    }
  }

  /**
   * Delete a batch from R2 (for cleanup)
   */
  async deleteBatch(key: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        })
      );
    } catch (error) {
      console.error("[R2Storage] Failed to delete batch:", error);
      // Non-critical error, log but don't throw
    }
  }
}

// Singleton instance
export const r2Storage = new R2StorageService();
