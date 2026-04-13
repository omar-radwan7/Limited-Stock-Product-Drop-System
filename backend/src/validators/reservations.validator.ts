import { z } from 'zod';

// Reservation endpoints
export const ReserveSchema = z.object({
  productId: z.string().uuid('productId must be a valid UUID'),
  quantity: z.number().int().min(1, 'quantity must be at least 1'),
});

export const CheckoutSchema = z.object({
  reservationId: z.string().uuid('reservationId must be a valid UUID'),
});

// Valid product fields for sorting — prevents injection via arbitrary field names
const VALID_SORT_FIELDS = ['name', 'price', 'stock', 'createdAt'] as const;
type ValidSortField = (typeof VALID_SORT_FIELDS)[number];

export const ProductsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
  sortBy: z
    .enum(VALID_SORT_FIELDS)
    .optional()
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ReserveInput = z.infer<typeof ReserveSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
export type ProductsQueryInput = z.infer<typeof ProductsQuerySchema>;
export type { ValidSortField };
