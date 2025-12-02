import type { Request, RequestHandler, Response } from "express";
import type { SelectDetectors } from "@/api/largeScreen/models/detectors.model";
import { GetListByNumSchema } from "@/api/largeScreen/models/vehicles.model";
import { detectorsService } from "@/api/largeScreen/services/detectors.service";
import { vehicleService } from "@/api/largeScreen/services/vehicle.service";
import { ServiceResponse } from "@/common/serviceResponse";
import { validateRequest } from "@/middleware/httpHandlers";

class DetectorsController {
	/**
	 * 初始化探测器
	 */
	public init: RequestHandler = async (_req: Request, res: Response) => {
		const serviceResponse = await detectorsService.initAllDetectors();
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	/**
	 * 获取探测器信息
	 */
	public list: RequestHandler = async (req: Request, res: Response) => {
		const { vehicleNumber } = req.query as { vehicleNumber?: string };
		let vehicleIdResponse: ServiceResponse<string | null> = ServiceResponse.success("操作成功", null);

		if (vehicleNumber) {
			await validateRequest(GetListByNumSchema)(req, res, (err?: any) => {
				if (err) return;
			});

			vehicleIdResponse = await vehicleService.getIdByNumber(vehicleNumber.trim());
		}

		// 新增：如果vehicleIdResponse.data为null，直接返回
		if (vehicleNumber && vehicleIdResponse.data === null) {
			res.status(vehicleIdResponse.statusCode).send(vehicleIdResponse);
			return;
		}

		let serviceResponse: ServiceResponse<SelectDetectors[] | null>;
		if (vehicleIdResponse.success && vehicleIdResponse.data) {
			serviceResponse = await detectorsService.findById(vehicleIdResponse.data);
		} else {
			serviceResponse = await detectorsService.findAll();
		}

		res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const detectorsController = new DetectorsController();
