/**
 * Per-IP, per-API rate limiter for Express.
 *
 * Every (IP, API) pair gets its own counter, so hammering /login doesn't
 * eat into someone's allowance for /search.
 *
 * "API" is identified by (in priority order):
 *   1. the `api` option you pass in (e.g. api: 'login')
 *   2. METHOD + matched route pattern, e.g. "GET /users/:id"
 *      (so /users/1 and /users/2 share one bucket)
 *   3. METHOD + raw path, if no route matched yet
 *
 * In-memory store: fine for a single process.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface RateLimitEntry {
    count: number;
    resetAt: number;      // epoch ms when this entry expires
    blockedUntil: number; // epoch ms; 0 if not blocked
}

export interface RateLimiterOptions {
    /** Length of the counting window in ms. Default 60_000. */
    windowMs?: number;
    /** Requests allowed per window, per IP, per API. Default 100. */
    max?: number;
    /** If > 0, offenders are blocked for this long once they exceed the limit. */
    blockDurationMs?: number;
    /** Fixed label for the API. If omitted, derived from the matched route. */
    api?: string;
    /** Error message returned in the 429 body. */
    message?: string;
    /** Override the default `${ip}|${api}` key. */
    keyGenerator?: (req: Request) => string;
    /** Provide your own Map to share state between limiters. */
    store?: Map<string, RateLimitEntry>;
}

export interface RateLimiter extends RequestHandler {
    store: Map<string, RateLimitEntry>;
    /** Stops the background cleanup timer (useful in tests / graceful shutdown). */
    stop: () => void;
}

function getIp(req: Request): string {
    // Behind a proxy/load balancer, set app.set('trust proxy', 1) (or the
    // right hop count) so req.ip reflects the real client, not the proxy.
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip; // normalise IPv4-mapped IPv6
}

function getApiName(req: Request): string {
    const pattern = req.route
        ? req.baseUrl + (req.route.path as string)
        : req.baseUrl + req.path;
    return `${req.method} ${pattern}`;
}

function reject(res: Response, retryAfterMs: number, max: number, message: string): void {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    res.set({
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0',
    });
    res.status(429).json({ error: message, retryAfterSeconds: retryAfterSec });
}

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
    const {
        windowMs = 60_000,
        max = 100,
        blockDurationMs = 0,
        api,
        message = 'Too many requests, please try again later.',
        keyGenerator,
        store = new Map<string, RateLimitEntry>(),
    } = options;

    // Periodically drop expired entries so memory doesn't grow forever.
    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (entry.resetAt <= now) store.delete(key);
        }
    }, Math.max(windowMs, 1000));
    cleanup.unref(); // don't keep the process alive just for this

    const handler: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
        const now = Date.now();
        const key = keyGenerator
            ? keyGenerator(req)
            : `${getIp(req)}|${api ?? getApiName(req)}`;

        let entry = store.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs, blockedUntil: 0 };
            store.set(key, entry);
        }

        // Currently serving a block?
        if (entry.blockedUntil > now) {
            return reject(res, entry.blockedUntil - now, max, message);
        }

        entry.count += 1;

        if (entry.count > max) {
            if (blockDurationMs > 0) {
                entry.blockedUntil = now + blockDurationMs;
                entry.resetAt = entry.blockedUntil; // keep the entry alive for the block
                return reject(res, blockDurationMs, max, message);
            }
            return reject(res, entry.resetAt - now, max, message);
        }

        res.set({
            'X-RateLimit-Limit': String(max),
            'X-RateLimit-Remaining': String(Math.max(0, max - entry.count)),
            'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        });
        next();
    };

    return Object.assign(handler, {
        store,
        stop: () => clearInterval(cleanup),
    });
}