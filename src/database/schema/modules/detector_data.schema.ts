import { bigserial, index, integer, jsonb, pgTable, timestamp } from 'drizzle-orm/pg-core';

export const detectorData = pgTable(
  'detector_data',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    vehicleId: integer('vehicle_id').notNull(),
    timestamp: timestamp('timestamp', { mode: 'date' }).notNull(),
    dataJson: jsonb('data_json').notNull(),
    createdTime: timestamp('created_time', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    idxVehicleTime: index('idx_vehicle_time').on(table.vehicleId, table.timestamp),
  }),
);
