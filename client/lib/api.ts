const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.3:3001';

export interface Case {
  _id: string;
  fullName: string;
  age: string;
  gender: "male" | "female" | "other";
  status: "missing" | "found" | "closed";
  city: string;
  state: string;
  dateMissingFound: string;
  reward?: number;
  reportedBy: "individual" | "police" | "NGO";
  imageUrls?: string[];
}

// Detail view may have partial/missing fields from legacy or incomplete entries
export interface CaseDetail {
  _id: string;
  fullName?: string;
  age?: string | number;
  gender?: "male" | "female" | "other";
  status?: "missing" | "found" | "closed";
  city?: string;
  state?: string;
  country?: string;
  dateMissingFound?: string;
  description?: string;
  contactNumber?: string;
  reward?: number | string;
  reportedBy?: "individual" | "police" | "NGO";
  imageUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
  // Extended fields from mongoose schema
  height?: string;
  complexion?: string;
  identificationMark?: string;
  pincode?: string;
  landMark?: string;
  FIRNumber?: string;
  policeStationState?: string;
  policeStationCity?: string;
  policeStationName?: string;
  isAssigned?: boolean;
  addedBy?: string;
  lastSearched?: string;
  lastSearchedTime?: string;
  notifications?: any[];
  sections?: { title: string; items: { label: string; value: string }[] }[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCases: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

export interface CasesResponse {
  success: boolean;
  data: Case[];
  pagination: PaginationInfo;
  filters: {
    country: string;
    state: string;
    city: string | null;
  };
}

export interface CasesParams {
  page?: number;
  country?: string;
  state?: string | null;
  city?: string | null;
  status?: string;
  gender?: string;
  dateFrom?: Date;
  dateTo?: Date;
  keyword?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const fetchCases = async (params: CasesParams = {}): Promise<CasesResponse> => {
  try {
    const searchParams = new URLSearchParams();
    
    // Add parameters to URL
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.country) searchParams.append('country', params.country);
    if (params.state && params.state !== "all") searchParams.append('state', params.state);
    if (params.city && params.city !== "all") searchParams.append('city', params.city);
    if (params.state === "all") searchParams.append('state', 'null');
    if (params.city === "all") searchParams.append('city', 'null');
    if (params.status && params.status !== "all") searchParams.append('status', params.status);
    if (params.gender && params.gender !== "all") searchParams.append('gender', params.gender);
    if (params.keyword) searchParams.append('keyword', params.keyword);
    
    // Convert Date objects to ISO strings
    if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom.toISOString());
    if (params.dateTo) searchParams.append('dateTo', params.dateTo.toISOString());

    const response = await fetch(`${API_BASE_URL}/cases?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP error! status: ${response.status}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to fetch cases',
      0
    );
  }
};

export interface CaseResponse {
  success: boolean;
  data: CaseDetail;
}

export const fetchCaseById = async (id: string): Promise<CaseResponse> => {
  try {
    // Dedupe burst requests to the same resource
    const cacheKey = `case:${id}`;
    if (!(globalThis as any).__caseFetchCache) {
      (globalThis as any).__caseFetchCache = new Map<string, Promise<CaseResponse>>();
    }
    const cache: Map<string, Promise<CaseResponse>> = (globalThis as any).__caseFetchCache;
    if (cache.has(cacheKey)) {
      return await cache.get(cacheKey)!;
    }

    const pending = (async () => {
    const response = await fetch(`${API_BASE_URL}/cases/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Invalidate caches to always get fresh data when navigating to detail
      cache: 'no-store' as RequestCache,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP error! status: ${response.status}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
      return data as CaseResponse;
    })();

    cache.set(cacheKey, pending);
    try {
      const result = await pending;
      return result;
    } finally {
      // Clear so subsequent navigations can refetch fresh data
      cache.delete(cacheKey);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Failed to fetch case by id',
      0
    );
  }
};
