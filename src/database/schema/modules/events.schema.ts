import { index, integer, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// 定义事件类型枚举
export const eventTypeEnum = pgEnum("event_type", ["火警", "预警"]);

export const events = pgTable(
	"events",
	{
		eventId: varchar("event_id", { length: 50 }).primaryKey(),
		vehicleId: integer("vehicle_id").notNull(),
		eventName: varchar("event_name", { length: 100 }).notNull(),
		eventType: eventTypeEnum("event_type").notNull(),
		startTime: timestamp("start_time").notNull(),
		endTime: timestamp("end_time").notNull(),
		durationSeconds: integer("duration_seconds").notNull(),
		createdTime: timestamp("created_time").notNull().defaultNow(),
	},
	(table) => ({
		idxVehicleStart: index("idx_vehicle_start").on(table.vehicleId, table.startTime),
	}),
);
