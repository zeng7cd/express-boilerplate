import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import * as z from "zod";
import { vehicles } from "@/database/schema";

const SelectVehiclesSchema = createSelectSchema(vehicles);
const InsertSVehiclesSchema = createInsertSchema(vehicles);

// export type NewUser = z.infer<typeof VehicleSchema>["body"];

// 定义车辆 Schema
export const VehicleSchema = z.object({
	vehicleId: z.string().describe("车辆唯一标识"),
	vehicleNumber: z.string().describe("车辆编号"),
	createdAt: z.date().optional().describe("创建时间"),
	updatedAt: z.date().optional().describe("更新时间"),
});

export const GetListByNumSchema = z.object({
	query: z.object({
		vehicleNumber: z.string().describe("车辆编号"),
	}),
});

export type SelectVehicle = z.infer<typeof SelectVehiclesSchema>;
export type InsertVehicle = z.infer<typeof InsertSVehiclesSchema>;
export type GetVehicleByNum = z.infer<typeof GetListByNumSchema>;
