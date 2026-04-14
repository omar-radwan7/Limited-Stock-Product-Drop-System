export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  createdAt: string;
}

export interface PaginatedProducts {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReservationResponse {
  reservationId: string;
  expiresAt: string;
}

export interface CheckoutResponse {
  orderId: string;
  totalAmount: number;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  statusCode: number;
  details?: Array<{ field: string; message: string }>;
}
