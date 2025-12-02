import { char, index, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// import { relations } from 'drizzle-orm';
// import { detectors } from '../../detectors/schema/detectors.schema';

export const vehicles = pgTable(
	"vehicles",
	{
		vehicleId: char("vehicle_id", { length: 36 }).primaryKey().notNull(),
		vehicleNumber: varchar("vehicle_number", { length: 20 }).unique().notNull(),
		totalDetectors: integer("total_detectors").notNull().default(96),
		currentStatus: integer("current_status").notNull().default(0),
		createdTime: timestamp("created_time").notNull().defaultNow(),
		updatedTime: timestamp("updated_time")
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		// 添加复合索引以优化查询性能
		statusCreatedIdx: index("idx_vehicle_status_created").on(table.currentStatus, table.createdTime),
		numberIdx: index("idx_vehicle_number").on(table.vehicleNumber),
		statusIdx: index("idx_vehicle_status").on(table.currentStatus),
		createdTimeIdx: index("idx_vehicle_created_time").on(table.createdTime),
	}),
);
