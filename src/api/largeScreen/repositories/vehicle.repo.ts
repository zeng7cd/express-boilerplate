import { eq } from "drizzle-orm";
import type { InsertVehicle } from "@/api/largeScreen/models/vehicles.model";
import { db } from "@/database/index";
import { vehicles } from "@/database/schema";

export class VehicleRepository {
	async init(vehiclesToInsert: InsertVehicle[]) {
		return await db.insert(vehicles).values(vehiclesToInsert);
	}
	async findAll() {
		return await db.select().from(vehicles);
	}

	async findById(number: string) {
		return await db.select().from(vehicles).where(eq(vehicles.vehicleNumber, number));
	}

	async getIdByNumber(number: string) {
		return await db.select().from(vehicles).where(eq(vehicles.vehicleNumber, number));
	}
}
