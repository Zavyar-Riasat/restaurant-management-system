import { AxiosError } from 'axios';
import { db } from '@/lib/localDb';

const NETWORK_TIMEOUT_CODES = new Set(['ECONNABORTED', 'ERR_NETWORK']);
const APP_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface QueuePayload {
  method: HttpMethod;
  url: string;
  body?: any;
}

function safeParseUrl(input: string): URL {
  return new URL(input, APP_BASE_URL);
}

export function toApiCacheKey(url: string): string {
  const parsed = safeParseUrl(url);
  return `${parsed.pathname}${parsed.search}`;
}

function toApiCollectionKey(url: string): string {
  const parsed = safeParseUrl(url);
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 2 || segments[0] !== 'api') return parsed.pathname;
  return `/${segments.slice(0, 2).join('/')}`;
}

function getResourceAndId(url: string): { resource: string | null; id: string | null } {
  const parsed = safeParseUrl(url);
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments[0] !== 'api' || !segments[1]) return { resource: null, id: null };
  return {
    resource: segments[1],
    id: segments[2] ?? null,
  };
}

function withQueuedMeta(payload: any) {
  return {
    ...payload,
    _queuedOffline: true,
    _queuedAt: new Date().toISOString(),
  };
}

function makeTempId(prefix: string) {
  return `local-${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function applyPaymentMutation(existing: any, amount: number) {
  const amountPaid = Number(existing?.amountPaid ?? 0) + amount;
  const balanceDue = Math.max(0, Number(existing?.balanceDue ?? 0) - amount);
  return {
    ...existing,
    amountPaid,
    balanceDue,
    paymentStatus: balanceDue === 0 ? 'Paid' : 'Partially Paid',
    balancePaidDate: balanceDue === 0 ? new Date().toISOString() : existing?.balancePaidDate,
    paymentHistory: [
      ...(Array.isArray(existing?.paymentHistory) ? existing.paymentHistory : []),
      { amount, date: new Date().toISOString() },
    ],
  };
}

function applyMutationToList(list: any[], method: HttpMethod, itemId: string | null, body: any, resource: string | null) {
  const current = Array.isArray(list) ? [...list] : [];

  if (method === 'POST') {
    const generatedId = makeTempId(resource || 'item');
    const payload = withQueuedMeta({
      ...body,
      _id: body?._id || generatedId,
      createdAt: body?.createdAt || new Date().toISOString(),
    });

    if (resource === 'orders') {
      payload.orderNumber = payload.orderNumber || `OFFLINE-${generatedId.slice(-6).toUpperCase()}`;
      const amountPaid = Number(payload.amountPaid ?? payload.grandTotal ?? 0);
      const grandTotal = Number(payload.grandTotal ?? 0);
      payload.amountPaid = amountPaid;
      payload.balanceDue = Math.max(0, grandTotal - amountPaid);
      payload.paymentStatus = payload.balanceDue === 0 ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : 'Unpaid';
      payload.status = payload.status || 'Pending';
    }

    return [payload, ...current];
  }

  if (!itemId) return current;

  if (method === 'DELETE') {
    return current.filter((item) => item?._id !== itemId);
  }

  return current.map((item) => {
    if (item?._id !== itemId) return item;

    if ((resource === 'orders' || resource === 'customers') && body?.action === 'pay_balance') {
      const paymentAmount = Number(body.paymentAmount || 0);
      if (paymentAmount > 0) {
        return withQueuedMeta(applyPaymentMutation(item, paymentAmount));
      }
    }

    return withQueuedMeta({
      ...item,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function persistGetCache(url: string, data: any) {
  const key = toApiCacheKey(url);
  await db.apiCache.put({
    key,
    data,
    updatedAt: new Date().toISOString(),
  });
}

export async function readGetCache(url: string) {
  const key = toApiCacheKey(url);
  const entry = await db.apiCache.get(key);
  return entry?.data;
}

export async function queueMutation(payload: QueuePayload) {
  await db.syncQueue.add({
    ...payload,
    createdAt: new Date().toISOString(),
  });
}

export async function applyOptimisticMutation(url: string, method: HttpMethod, body?: any) {
  const collectionKey = toApiCollectionKey(url);
  const { resource, id } = getResourceAndId(url);

  const cacheKeys = await db.apiCache
    .where('key')
    .startsWith(collectionKey)
    .primaryKeys();

  if (cacheKeys.length === 0) {
    return;
  }

  for (const key of cacheKeys) {
    const existing = await db.apiCache.get(key as string);
    if (!existing) continue;

    if (!Array.isArray(existing.data)) continue;

    const updated = applyMutationToList(existing.data, method, id, body, resource);
    await db.apiCache.put({
      key: existing.key,
      data: updated,
      updatedAt: new Date().toISOString(),
    });
  }
}

export function isOfflineLikeError(error: unknown) {
  const axiosError = error as AxiosError;
  if (!axiosError) return false;

  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;

  if (axiosError.code && NETWORK_TIMEOUT_CODES.has(axiosError.code)) return true;

  if (!axiosError.response) return true;

  const status = axiosError.response.status;
  return status >= 502 && status <= 504;
}

export function buildQueuedResponse(url: string, method: HttpMethod, body?: any) {
  const { resource, id } = getResourceAndId(url);
  const fakeId = id || makeTempId(resource || 'item');

  const payload = withQueuedMeta({
    _id: fakeId,
    ...(body || {}),
  });

  if (resource === 'orders' && method === 'POST') {
    payload.orderNumber = payload.orderNumber || `OFFLINE-${fakeId.slice(-6).toUpperCase()}`;
    const amountPaid = Number(payload.amountPaid ?? payload.grandTotal ?? 0);
    const grandTotal = Number(payload.grandTotal ?? 0);
    payload.amountPaid = amountPaid;
    payload.balanceDue = Math.max(0, grandTotal - amountPaid);
    payload.paymentStatus = payload.balanceDue === 0 ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : 'Unpaid';
  }

  return {
    status: 202,
    statusText: 'Accepted (queued offline)',
    data: payload,
    headers: {
      'x-offline-queued': 'true',
    },
  };
}

export async function replayQueuedMutations(
  sendRequest: (item: { method: HttpMethod; url: string; body?: any }) => Promise<void>
) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;

  const queued = await db.syncQueue.orderBy('createdAt').toArray();
  let synced = 0;

  for (const item of queued) {
    try {
      await sendRequest({ method: item.method, url: item.url, body: item.body });
      if (item.id !== undefined) {
        await db.syncQueue.delete(item.id);
      }
      synced += 1;
    } catch {
      // Stop at first failing item to preserve operation ordering.
      break;
    }
  }

  return synced;
}
