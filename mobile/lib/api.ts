export type TimedLog = {
  id: string;
  text: string;
  at: string;
};

export type DiaryEntry = {
  id: string;
  date: string;
  title: string;
  body: string;
  logs: TimedLog[];
  mood: number | null;
  tags: string[];
  people: string[];
  favorite: boolean;
  /** Custom calendar legend id (user-defined). */
  legendId: string;
  photoIds: string[];
  voiceIds: string[];
  weatherNote: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DayMarker = {
  favorite: boolean;
  photoCount: number;
  mood: number | null;
  hasEntry: boolean;
  legendId?: string;
};

export type Stats = {
  totalEntries: number;
  favorites: number;
  daysWithPhotos: number;
  streak: number;
  newestDate: string | null;
  oldestDate: string | null;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** User-facing copy for network / Render cold starts */
export function friendlyApiMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return (
        err.message ||
        'Cannot reach the diary server. If you use Render free tier, the first open can take up to a minute while it wakes up.'
      );
    }
    if (err.status === 401 || err.status === 403) {
      return 'Server rejected this request. Check the wired API secret.';
    }
    if (err.status >= 500) {
      return 'Server error. Please try again in a moment.';
    }
    return err.message;
  }
  if (err instanceof TypeError || (err instanceof Error && /network|fetch|failed/i.test(err.message))) {
    return 'Network issue or free server waking up. Wait ~30–60s and try again.';
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export function createApi(apiUrl: string, apiSecret: string) {
  const base = apiUrl.replace(/\/$/, '');

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!base) throw new ApiError(0, 'API URL is not configured');
    if (!apiSecret) throw new ApiError(0, 'API secret is not configured');

    const headers: Record<string, string> = {
      'x-api-secret': apiSecret,
    };

    let body: BodyInit | undefined;
    if (options.formData) {
      body = options.formData;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method: options.method || 'GET',
        headers,
        body,
        signal: options.signal,
      });
    } catch (e: unknown) {
      const tip =
        'Cannot reach diary API (often a free Render cold start — wait ~1 min and retry).';
      throw new ApiError(0, e instanceof Error && e.name === 'AbortError' ? 'Request cancelled' : tip);
    }

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // ignore
      }
      throw new ApiError(res.status, message);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    health: () => fetch(`${base}/health`).then((r) => r.json()),
    listEntries: (limit = 30, skip = 0) =>
      request<DiaryEntry[]>(`/entries?limit=${limit}&skip=${skip}`),
    listFavorites: () => request<DiaryEntry[]>('/entries?favorites=1&limit=50'),
    getEntry: (date: string) => request<DiaryEntry>(`/entries/${date}`),
    saveEntry: (date: string, payload: Partial<DiaryEntry>) =>
      request<DiaryEntry>(`/entries/${date}`, { method: 'PUT', body: payload }),
    addLog: (date: string, text: string, at: string) =>
      request<DiaryEntry>(`/entries/${date}/logs`, {
        method: 'POST',
        body: { text, at },
      }),
    deleteLog: (date: string, logId: string) =>
      request<DiaryEntry>(`/entries/${date}/logs/${logId}`, { method: 'DELETE' }),
    deleteEntry: (date: string) =>
      request<{ ok: boolean }>(`/entries/${date}`, { method: 'DELETE' }),
    search: (q: string) => request<DiaryEntry[]>(`/entries/search?q=${encodeURIComponent(q)}`),
    onThisDay: (month: number, day: number) =>
      request<DiaryEntry[]>(
        `/entries/on-this-day?month=${String(month).padStart(2, '0')}&day=${String(day).padStart(2, '0')}`
      ),
    markers: (from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return request<Record<string, DayMarker>>(`/entries/markers${qs ? `?${qs}` : ''}`);
    },
    stats: () => request<Stats>('/entries/stats'),
    uploadPhoto: (date: string, uri: string, caption = '') => {
      const form = new FormData();
      const name = uri.split('/').pop() || `photo-${Date.now()}.jpg`;
      form.append('photo', {
        uri,
        name,
        type: 'image/jpeg',
      } as unknown as Blob);
      if (caption) form.append('caption', caption);
      return request<{ id: string; entry: DiaryEntry }>(`/entries/${date}/photos`, {
        method: 'POST',
        formData: form,
      });
    },
    uploadVoice: (date: string, uri: string, durationMs = 0) => {
      const form = new FormData();
      const raw = uri.split('/').pop() || `voice-${Date.now()}.m4a`;
      const name = raw.includes('.') ? raw : `${raw}.m4a`;
      form.append('voice', {
        uri,
        name,
        type: 'audio/mp4',
      } as unknown as Blob);
      form.append('durationMs', String(Math.round(durationMs)));
      return request<{ id: string; durationMs: number; entry: DiaryEntry }>(
        `/entries/${date}/voices`,
        {
          method: 'POST',
          formData: form,
        }
      );
    },
    deletePhoto: (id: string) => request<{ ok: boolean }>(`/photos/${id}`, { method: 'DELETE' }),
    deleteVoice: (id: string) => request<{ ok: boolean }>(`/photos/${id}`, { method: 'DELETE' }),
    photoUrl: (id: string) => `${base}/photos/${id}`,
    voiceUrl: (id: string) => `${base}/photos/${id}`,

    /** Diary lock (server mirror for recovery) */
    getLock: () => request<LockRemoteSettings>('/lock'),
    enableLock: (body: {
      pin: string;
      securityQuestion?: string;
      securityAnswer?: string;
      recoveryEmail?: string;
      fingerprintEnabled?: boolean;
    }) => request<LockRemoteSettings>('/lock', { method: 'PUT', body }),
    updateLock: (body: {
      currentPin?: string;
      pin?: string;
      securityQuestion?: string;
      securityAnswer?: string;
      recoveryEmail?: string;
      fingerprintEnabled?: boolean;
      lockEnabled?: boolean;
    }) => request<LockRemoteSettings>('/lock', { method: 'PATCH', body }),
    verifyLockPin: (pin: string) =>
      request<{ ok: boolean; lockEnabled: boolean }>('/lock/verify', {
        method: 'POST',
        body: { pin },
      }),
    recoverLock: (answer: string, newPin: string) =>
      request<{ ok: boolean } & LockRemoteSettings>('/lock/recover', {
        method: 'POST',
        body: { answer, newPin },
      }),
  };
}

export type LockRemoteSettings = {
  lockEnabled: boolean;
  hasPin: boolean;
  hasSecurityQuestion: boolean;
  securityQuestion: string;
  hasEmail: boolean;
  recoveryEmailMasked: string;
  fingerprintEnabled: boolean;
  updatedAt?: string;
};

export type DiaryApi = ReturnType<typeof createApi>;
