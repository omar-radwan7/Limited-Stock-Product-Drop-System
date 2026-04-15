import { z } from 'zod';
export declare const ReserveSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
}, z.core.$strip>;
export declare const CheckoutSchema: z.ZodObject<{
    reservationId: z.ZodString;
}, z.core.$strip>;
declare const VALID_SORT_FIELDS: readonly ["name", "price", "stock", "createdAt"];
type ValidSortField = (typeof VALID_SORT_FIELDS)[number];
export declare const ProductsQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>, z.ZodNumber>;
    limit: z.ZodPipe<z.ZodPipe<z.ZodDefault<z.ZodOptional<z.ZodString>>, z.ZodTransform<number, string>>, z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        name: "name";
        price: "price";
        stock: "stock";
        createdAt: "createdAt";
    }>>>;
    order: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
}, z.core.$strip>;
export type ReserveInput = z.infer<typeof ReserveSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
export type ProductsQueryInput = z.infer<typeof ProductsQuerySchema>;
export type { ValidSortField };
