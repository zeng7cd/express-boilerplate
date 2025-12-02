import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';
import { detectors } from '@/database/schema';

export const SelectDetectorsSchema = createSelectSchema(detectors);
export const InsertDetectorsSchema = createInsertSchema(detectors);

// export const GetDetectorByNumSchema = z.object({
// 	query: z.object({
// 		number: z.string().min(1, "Detector number is required"),
// 	}),
// });

export type SelectDetectors = z.infer<typeof SelectDetectorsSchema>;
export type InsertDetectors = z.infer<typeof InsertDetectorsSchema>;
