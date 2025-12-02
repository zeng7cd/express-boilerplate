import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { SelectVehicle } from "@/api/largeScreen/models/vehicles.model";
import { GetListByNumSchema } from "@/api/largeScreen/models/vehicles.model";
import { vehicleService } from "@/api/largeScreen/services/vehicle.service";
import type { ServiceResponse } from "@/common/serviceResponse";
import { validateRequest } from "@/middleware/httpHandlers";

class VehicleController {
	/**
	 *  初始化所有车辆
	 */
	public init: RequestHandler = async (_req: Request, res: Response) => {
		const serviceResponse = await vehicleService.init();
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	/**
	 *  获取车辆信息
	 */
	public list: RequestHandler = async (req: Request, res: Response, _next: NextFunction) => {
		const { vehicleNumber } = req.query as { vehicleNumber?: string };

		if (vehicleNumber) {
			await validateRequest(GetListByNumSchema)(req, res, (err?: any) => {
				if (err) return;
			});
		}

		let serviceResponse: ServiceResponse<SelectVehicle | SelectVehicle[] | null>;
		if (vehicleNumber) {
			serviceResponse = await vehicleService.findById(vehicleNumber.trim());
		} else {
			serviceResponse = await vehicleService.findAll();
		}

		res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const vehicleController = new VehicleController();
