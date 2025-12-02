import { char, integer, pgTable, serial, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const detectors = pgTable(
  'detectors',
  {
    detectorId: serial('detector_id').primaryKey(),
    vehicleId: char('vehicle_id', { length: 36 }).notNull(),
    detectorNumber: integer('detector_number').notNull(),
    type: integer('type').notNull(),
    createdTime: timestamp('created_time').notNull().defaultNow(),
    vehicleNumber: varchar('vehicle_number', { length: 20 }).unique().notNull(),
  },
  (table) => ({
    ukVehicleDetector: uniqueIndex('uk_vehicle_detector').on(table.vehicleId, table.detectorNumber),
  }),
);
