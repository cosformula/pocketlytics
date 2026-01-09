import { authedFetch } from "../../utils";

export interface ApiKey {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  userId: string;
  enabled: boolean;
  rateLimitEnabled: boolean;
  rateLimitTimeWindow: number | null;
  rateLimitMax: number | null;
  requestCount: number;
  remaining: number | null;
  lastRequest: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyWithKey extends ApiKey {
  key: string; // The full API key, only returned on creation
}

export interface CreateApiKeyRequest {
  name: string;
  expiresIn?: number;
}

export function listApiKeys() {
  return authedFetch<ApiKey[]>("/user/api-keys");
}

export function createApiKey(data: CreateApiKeyRequest) {
  return authedFetch<ApiKeyWithKey>("/user/api-keys", undefined, {
    method: "POST",
    data,
  });
}

export function deleteApiKey(keyId: string) {
  return authedFetch<{ success: boolean }>(`/user/api-keys/${keyId}`, undefined, {
    method: "DELETE",
  });
}
