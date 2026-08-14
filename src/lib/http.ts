import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  applyOptimisticMutation,
  buildQueuedResponse,
  isOfflineLikeError,
  persistGetCache,
  queueMutation,
  readGetCache,
} from '@/lib/offlineSync';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

function parsePayload(data: any) {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function isApiUrl(url?: string) {
  return typeof url === 'string' && (url.startsWith('/api/') || url.includes('/api/'));
}

function isMutation(method?: string): method is 'post' | 'put' | 'patch' | 'delete' {
  return method === 'post' || method === 'put' || method === 'patch' || method === 'delete';
}

function normalizeMethod(method?: string): Method {
  const normalized = (method || 'get').toLowerCase() as Method;
  return normalized;
}

const http = axios.create({
  timeout: 12000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = normalizeMethod(config.method);
  if (method === 'get') {
    // Use tighter timeout for reads so the app can quickly fallback to local cache on bad connections.
    config.timeout = typeof config.timeout === 'number' ? Math.min(config.timeout, 8000) : 8000;
  }
  return config;
});

http.interceptors.response.use(
  async (response) => {
    const method = normalizeMethod(response.config.method);
    if (method === 'get' && isApiUrl(response.config.url)) {
      await persistGetCache(response.config.url as string, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config;
    if (!config) {
      return Promise.reject(error);
    }

    const method = normalizeMethod(config.method);
    const url = config.url;

    if (!isApiUrl(url)) {
      return Promise.reject(error);
    }

    if (method === 'get' && isOfflineLikeError(error)) {
      const cached = await readGetCache(url as string);
      if (cached !== undefined) {
        return {
          ...error.response,
          config,
          status: 200,
          statusText: 'OK (offline cache)',
          headers: {
            ...(error.response?.headers || {}),
            'x-offline-cache': 'true',
          },
          data: cached,
        };
      }
      return Promise.reject(error);
    }

    if (isMutation(method) && isOfflineLikeError(error)) {
      const upperMethod = method.toUpperCase() as 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      const payload = parsePayload(config.data);
      await queueMutation({
        method: upperMethod,
        url: url as string,
        body: payload,
      });

      await applyOptimisticMutation(url as string, upperMethod, payload);

      return {
        ...error.response,
        config,
        ...buildQueuedResponse(url as string, upperMethod, payload),
      };
    }

    return Promise.reject(error);
  }
);

export default http;
