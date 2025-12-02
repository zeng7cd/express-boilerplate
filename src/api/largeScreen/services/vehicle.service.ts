import { nanoid } from "nanoid";
import type { InsertVehicle, SelectVehicle } from "@/api/largeScreen/models/vehicles.model";
import { VehicleRepository } from "@/api/largeScreen/repositories/vehicle.repo";
import { ServiceResponse } from "@/common/serviceResponse";
import { StatusCodes } from "http-status-codes";
import { createModulePinoLogger, type PinoLogger } from "@/utils/pino";

class VehicleService {
	private vehicleRepository: VehicleRepository;
	private logger: PinoLogger;

	constructor(repository: VehicleRepository = new VehicleRepository()) {
		this.vehicleRepository = repository;
		this.logger = createModulePinoLogger("vehicle-service");
	}

	async init(): Promise<ServiceResponse<InsertVehicle[] | null>> {
		try {
			this.logger.info("开始初始化车辆数据");
			
			const vehiclesToInsert = Array.from({ length: 30 }).map((_, i) => ({
				vehicleId: nanoid(),
				vehicleNumber: (i + 1).toString().padStart(2, "0"),
			}));

			await this.vehicleRepository.init(vehiclesToInsert);
			
			this.logger.info({ count: vehiclesToInsert.length }, "车辆数据初始化成功");
			return ServiceResponse.success("车辆初始化成功", vehiclesToInsert);
		} catch (error) {
			this.logger.error({ err: error }, "车辆数据初始化失败");
			return ServiceResponse.failure("车辆初始化失败", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async findAll(): Promise<ServiceResponse<SelectVehicle[] | null>> {
		try {
			const res = await this.vehicleRepository.findAll();
			this.logger.debug({ count: res.length }, "获取所有车辆信息成功");
			return ServiceResponse.success("操作成功", res);
		} catch (error) {
			this.logger.error({ err: error }, "获取所有车辆信息失败");
			return ServiceResponse.failure("获取车辆信息失败", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async findById(number: string): Promise<ServiceResponse<SelectVehicle | null>> {
		try {
			const res = await this.vehicleRepository.findById(number);
			this.logger.debug({ vehicleNumber: number }, "根据编号获取车辆信息成功");
			return ServiceResponse.success("操作成功", res[0] || null);
		} catch (error) {
			this.logger.error({ err: error, vehicleNumber: number }, "根据编号获取车辆信息失败");
			return ServiceResponse.failure("获取车辆信息失败", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}

	async getIdByNumber(vehicleNumber: string): Promise<ServiceResponse<string | null>> {
		try {
			const res = await this.vehicleRepository.getIdByNumber(vehicleNumber);

			if (res.length > 0) {
				this.logger.debug({ vehicleNumber, vehicleId: res[0].vehicleId }, "根据车辆编号获取ID成功");
				return ServiceResponse.success("操作成功", res[0].vehicleId);
			} else {
				this.logger.warn({ vehicleNumber }, "车辆不存在");
				return ServiceResponse.failure("车辆不存在", null);
			}
		} catch (error) {
			this.logger.error({ err: error, vehicleNumber }, "根据车辆编号获取ID失败");
			return ServiceResponse.failure("获取车辆ID失败", null, StatusCodes.INTERNAL_SERVER_ERROR);
		}
	}
}

export const vehicleService = new VehicleService();
