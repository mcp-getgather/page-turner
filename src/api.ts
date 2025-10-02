const API_BASE_URL = '/api';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type GetBookListResponse = {
  url?: string;
  link_id?: string;
};

type PollAuthResponse = {
  status?: string;
};

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }

    return result.data as T;
  }

  async getBookList(keywords: string[] = []): Promise<GetBookListResponse> {
    return this.request<GetBookListResponse>('/get-book-list', {
      method: 'POST',
      body: JSON.stringify({ keywords }),
    });
  }

  async pollAuth(sessionId: string): Promise<PollAuthResponse> {
    return this.request<PollAuthResponse>('/poll-signin', {
      method: 'POST',
      body: JSON.stringify({ link_id: sessionId }),
    });
  }
}

export const apiClient = new ApiClient();
