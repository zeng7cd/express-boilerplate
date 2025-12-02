import { StatusCodes } from 'http-status-codes';
import type { InsertDetectors, SelectDetectors } from '@/api/largeScreen/models/detectors.model';
import type { SelectVehicle } from '@/api/largeScreen/models/vehicles.model';
import { DetectorsRepository } from '@/api/largeScreen/repositories/detectors.repo';
import { vehicleService } from '@/api/largeScreen/services/vehicle.service';
import { ServiceResponse } from '@/common/serviceResponse';
import type { PinoLogger } from '@/utils/pino';
import { createModulePinoLogger } from '@/utils/pino';

type VehicleService = typeof vehicleService;

class DetectorsService {
  private detectorsRepository: DetectorsRepository;
  private vehicleService: VehicleService;
  private logger: PinoLogger;

  constructor(
    repository: DetectorsRepository = new DetectorsRepository(),
    vehicleServiceInstance: VehicleService = vehicleService,
  ) {
    this.detectorsRepository = repository;
    this.vehicleService = vehicleServiceInstance;
    this.logger = createModulePinoLogger('detectors-service');
  }

  /**
   * 初始化所有检测器
   */
  async initAllDetectors(): Promise<ServiceResponse<InsertDetectors[] | null>> {
    try {
      const vehiclesResponse = await this.vehicleService.findAll();

      if (!vehiclesResponse.success || !vehiclesResponse.data) {
        this.logger.error({ error: vehiclesResponse }, '获取车辆信息失败');
        return ServiceResponse.failure('获取车辆信息失败', null, StatusCodes.INTERNAL_SERVER_ERROR);
      }
      const vehicles: SelectVehicle[] = vehiclesResponse.data;
      const detectorsToInsert: InsertDetectors[] = [];

      for (const vehicle of vehicles) {
        const totalDetectors = vehicle.totalDetectors || 96;
        for (let detectorNum = 1; detectorNum <= totalDetectors; detectorNum++) {
          detectorsToInsert.push({
            vehicleId: vehicle.vehicleId,
            vehicleNumber: vehicle.vehicleNumber,
            detectorNumber: detectorNum,
            type: getDetectorType(),
            createdTime: new Date(),
          });
        }
      }
      await this.detectorsRepository.initAllDetectors(detectorsToInsert);
      return ServiceResponse.success('检测器初始化成功', detectorsToInsert);
    } catch (error) {
      this.logger.error({ err: error }, '检测器初始化失败');
      return ServiceResponse.failure('检测器初始化失败', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 获取所有检测器信息
   */
  async findAll(): Promise<ServiceResponse<SelectDetectors[] | null>> {
    try {
      const detectors = await this.detectorsRepository.findAll();
      return ServiceResponse.success('获取检测器信息成功', detectors);
    } catch (error) {
      this.logger.error({ err: error }, '获取检测器信息失败');
      return ServiceResponse.failure('获取检测器信息失败', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 根据车辆ID获取检测器信息
   */
  async findById(vehicleId: string): Promise<ServiceResponse<SelectDetectors[] | null>> {
    try {
      const detectors = await this.detectorsRepository.findById(vehicleId);
      return ServiceResponse.success('获取车辆检测器信息成功', detectors);
    } catch (error) {
      this.logger.error({ err: error, vehicleId }, '获取车辆检测器信息失败');
      return ServiceResponse.failure('获取车辆检测器信息失败', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
}

// 返回探测器类型
function getDetectorType(): number {
  // 75% 概率返回 1，25% 概率返回 2
  return Math.random() < 0.75 ? 1 : 2;
}

export const detectorsService = new DetectorsService();
export { DetectorsService };
