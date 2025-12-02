import { eq } from 'drizzle-orm';
import type { InsertDetectors } from '@/api/largeScreen/models/detectors.model';
import { db } from '@/database/index';
import { detectors } from '@/database/schema';

export class DetectorsRepository {
  async initAllDetectors(detectorsToInsert: InsertDetectors[]) {
    return await db.insert(detectors).values(detectorsToInsert);
  }

  async findAll() {
    return await db.select().from(detectors);
  }

  async findById(vehicleId: string) {
    return await db.select().from(detectors).where(eq(detectors.vehicleId, vehicleId));
  }
}

export const detectorsRepository = new DetectorsRepository();
