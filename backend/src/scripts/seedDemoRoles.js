import 'dotenv/config';
import prisma from '../config/database.js';
import { hashPassword } from '../utils/prismaHelpers.js';

// Simple, memorable credentials used by the login page's demo panel.
const DEMO_PASSWORD = 'demo1234';

const DEMO_USERS = [
  { employeeId: 'DEMO-AM', name: 'Demo Area Manager', email: 'area@sako.com', role: 'areaManager', position: 'Area_Manager' },
  { employeeId: 'DEMO-BM', name: 'Demo Branch Manager', email: 'branch@sako.com', role: 'branchManager', position: 'Branch_Manager' },
  { employeeId: 'DEMO-SUP', name: 'Demo Supervisor', email: 'supervisor@sako.com', role: 'supervisor', position: 'Operation_Supervisor' },
  { employeeId: 'DEMO-STAFF', name: 'Demo Staff', email: 'staff@sako.com', role: 'staff', position: 'Customer_Service_Officer_I' },
];

const run = async () => {
  await prisma.$connect();

  const branch = await prisma.branch.findFirst({ orderBy: { code: 'asc' } });
  const branchId = branch?.id ?? null;
  const areaId = branch?.areaId ?? null;
  const branchCode = branch?.code ?? null;

  const hashed = await hashPassword(DEMO_PASSWORD);

  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hashed, role: u.role, position: u.position, isActive: true },
      create: {
        employeeId: u.employeeId,
        name: u.name,
        email: u.email,
        password: hashed,
        role: u.role,
        position: u.position,
        isActive: true,
        branchId,
        areaId,
        branch_code: branchCode,
      },
    });
    console.log(`✅ ${u.role.padEnd(14)} ${u.email} / ${DEMO_PASSWORD}`);
  }

  console.log(`\n🎉 Demo role users ready (branch: ${branchCode ?? 'none'})`);
};

run()
  .catch((err) => {
    console.error('❌ Seed demo roles failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
