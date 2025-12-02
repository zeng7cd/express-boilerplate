import { jsonb, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";

export const eventDetails = pgTable(
	"event_details",
	{
		eventId: varchar("event_id", { length: 50 }).notNull(),
		timestamp: timestamp("timestamp").notNull(),
		detectorData: jsonb("detector_data").notNull(),
		createdTime: timestamp("created_time").notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.eventId, table.timestamp] }),
	}),
);
