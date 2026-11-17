import { Injectable, inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { AuthError } from '../auth/cognito';
import { AuthSession } from '../auth/auth-session';

/** A non-2xx answer. `code` is the envelope's `error.code`, null for API Gateway's bare `{"message"}` replies. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(message);
  }
}

interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string } | null;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly auth = inject(AuthSession);

  /** One refresh and one retry on 401. A second 401 means the session is dead, not stale. */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      return await this.send<T>(method, path, body, this.auth.accessToken());
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }

    let fresh: string;
    try {
      fresh = await this.auth.refresh();
    } catch (error) {
      if (error instanceof AuthError) throw new ApiError(401, 'signed_out', 'Signed out');
      throw error;
    }
    try {
      return await this.send<T>(method, path, body, fresh);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) this.auth.signOut();
      throw error;
    }
  }

  private async send<T>(
    method: string,
    path: string,
    body: unknown,
    token: string | null,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${environment.apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = (await response.json().catch(() => ({}))) as Envelope<T>;
    if (!response.ok) {
      const message = envelope.error?.message ?? envelope.message ?? response.statusText;
      throw new ApiError(response.status, envelope.error?.code ?? null, message);
    }
    if (envelope.data === undefined)
      throw new ApiError(response.status, 'malformed', 'Response had no data');
    return envelope.data;
  }
}
