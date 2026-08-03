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
  photoIds: string[];
  weatherNote: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DayMarker = {
  favorite: boolean;
  photoCount: number;
  mood: number | null;
  hasEntry: boolean;
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

export function createApi(apiUrl: string, apiSecret: string) {
  const base = apiUrl.replace(/\/$/, '');

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!base) throw new ApiError(0, 'Set your API URL in Settings');
    if (!apiSecret) throw new ApiError(0, 'Set your API secret in Settings');

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

    const res = await fetch(`${base}${path}`, {
      method: options.method || 'GET',
      headers,
      body,
      signal: options.signal,
    });

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
    listEntries: (limit = 30) => request<DiaryEntry[]>(`/entries?limit=${limit}`),
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
    deletePhoto: (id: string) => request<{ ok: boolean }>(`/photos/${id}`, { method: 'DELETE' }),
    photoUrl: (id: string) => `${base}/photos/${id}`,
  };
}

export type DiaryApi = ReturnType<typeof createApi>;
