import express, { type Router } from "express";
import { detectorsController } from "@/api/largeScreen/controllers/detectors.controller";
import { vehicleController } from "@/api/largeScreen/controllers/vehicles.controller";
import { registerRoute } from "@/utils/routeRegistry";

export const router: Router = express.Router();
/**
 * 车辆管理模块路由
 */
router.post("/vehicle/init", vehicleController.init);
router.get("/vehicle/list", vehicleController.list);

/**
 * 探测器模块路由
 */
router.post("/detector/init", detectorsController.init);
router.get("/detector/list", detectorsController.list);

// 自动注册车辆管理路由
registerRoute("/largeScreen", router, "大屏可视化模块");
