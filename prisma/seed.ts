import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function main() {
  console.log('开始数据库种子数据初始化...');

  // 清理现有数据（开发环境）
  if (process.env.NODE_ENV === 'development') {
    await prisma.eventDetail.deleteMany();
    await prisma.event.deleteMany();
    await prisma.detectorData.deleteMany();
    await prisma.detector.deleteMany();
    await prisma.vehicle.deleteMany();
    console.log('已清理现有数据');
  }

  // 创建车辆数据
  const vehicles = Array.from({ length: 30 }, (_, i) => ({
    vehicleId: nanoid(),
    vehicleNumber: (i + 1).toString().padStart(2, '0'),
    totalDetectors: 96,
    currentStatus: Math.floor(Math.random() * 3), // 0-2 随机状态
  }));

  await prisma.vehicle.createMany({
    data: vehicles,
  });

  console.log(`已创建 ${vehicles.length} 辆车辆`);

  // 为每辆车创建检测器
  for (const vehicle of vehicles) {
    const detectors = Array.from({ length: vehicle.totalDetectors }, (_, i) => ({
      vehicleId: vehicle.vehicleId,
      detectorNumber: i + 1,
      type: Math.floor(Math.random() * 3) + 1, // 1-3 随机类型
      vehicleNumber: `${vehicle.vehicleNumber}-${(i + 1).toString().padStart(3, '0')}`,
    }));

    await prisma.detector.createMany({
      data: detectors,
    });
  }

  console.log('已创建检测器数据');

  // 创建一些示例事件
  const sampleEvents = vehicles.slice(0, 5).map((vehicle, i) => ({
    eventId: `EVENT-${nanoid()}`,
    vehicleId: vehicle.vehicleId,
    eventName: `测试事件 ${i + 1}`,
    eventType: i % 2 === 0 ? 'FIRE_ALARM' : 'WARNING',
    startTime: new Date(Date.now() - Math.random() * 86400000), // 过去24小时内
    endTime: new Date(Date.now() - Math.random() * 43200000), // 过去12小时内
    durationSeconds: Math.floor(Math.random() * 3600), // 0-3600秒
  }));

  await prisma.event.createMany({
    data: sampleEvents,
  });

  console.log(`已创建 ${sampleEvents.length} 个示例事件`);

  console.log('数据库种子数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
