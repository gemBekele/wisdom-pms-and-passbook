import 'dotenv/config';
import prisma from '../config/database.js';
import { hashPassword } from '../utils/prismaHelpers.js';
import { normalizePhone } from '../services/otpService.js';

const DEMO_PHONE = normalizePhone(process.env.MOBILE_DEMO_PHONE || '0912345678');
const DEMO_PIN = process.env.MOBILE_DEMO_PIN || '1234';

const ACCOUNTS = [
  { accountNumber: 'GH0012345', product: 'Gihon Regular Saving', accountType: 'Savings', balance: 25840.75, daysAgo: 5 },
  { accountNumber: 'GH0016789', product: 'Medbegna Saving', accountType: 'Savings', balance: 41200.0, daysAgo: 6 },
  { accountNumber: 'GH0023456', product: 'Fixed Time Deposit', accountType: 'Fixed_Deposit', balance: 87500.0, daysAgo: 11 },
];

const TRANSACTIONS = {
  GH0012345: [
    { daysAgo: 35, credit: 1800, description: 'Deposit · Gihon Regular Saving' },
    { daysAgo: 28, credit: 1000, description: 'Deposit · Gihon Regular Saving' },
    { daysAgo: 21, debit: 6250, description: 'Transfer to Loan Account' },
    { daysAgo: 14, credit: 12500, description: 'Salary deposit' },
    { daysAgo: 7, debit: 2000, description: 'Withdrawal · ATM' },
    { daysAgo: 3, credit: 2500, description: 'Deposit · Gihon Regular Saving' },
    { daysAgo: 0, credit: 1500, description: 'Deposit · Gihon Regular Saving' },
  ],
  GH0016789: [
    { daysAgo: 30, credit: 1000, description: 'Deposit · Medbegna Saving' },
    { daysAgo: 19, credit: 2500, description: 'Deposit · Medbegna Saving' },
    { daysAgo: 11, credit: 1500, description: 'Deposit · Medbegna Saving' },
    { daysAgo: 2, credit: 3200, description: 'Deposit · Medbegna Saving' },
  ],
  GH0023456: [
    { daysAgo: 40, credit: 37500, description: 'Fixed deposit top-up' },
    { daysAgo: 12, credit: 50000, description: 'Fixed deposit opened · 12 months' },
  ],
  GH0045678: [
    { daysAgo: 78, debit: 6250, description: 'Loan repayment' },
    { daysAgo: 48, debit: 6250, description: 'Loan repayment' },
    { daysAgo: 18, debit: 6250, description: 'Loan repayment' },
    { daysAgo: 0, debit: 6250, description: 'Loan repayment' },
  ],
};

const daysAgoDate = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const run = async () => {
  await prisma.$connect();
  console.log('🌱 Seeding mobile demo data...');

  const region = await prisma.region.upsert({
    where: { code: 'AA' },
    update: {},
    create: { name: 'Addis Ababa', code: 'AA' },
  });

  const area = await prisma.area.upsert({
    where: { code: 'AA-01' },
    update: {},
    create: { name: 'Bole Area', code: 'AA-01', regionId: region.id },
  });

  const branch = await prisma.branch.upsert({
    where: { code: 'BR-001' },
    update: {},
    create: { name: 'Bole Branch', code: 'BR-001', areaId: area.id },
  });

  const member = await prisma.member.upsert({
    where: { phoneNumber: DEMO_PHONE },
    update: { fullName: 'Abebe Kebede', isActive: true },
    create: {
      phoneNumber: DEMO_PHONE,
      fullName: 'Abebe Kebede',
      pinHash: await hashPassword(DEMO_PIN),
      pinChangedAt: new Date(),
    },
  });

  for (const acc of ACCOUNTS) {
    await prisma.accountMapping.upsert({
      where: { accountNumber: acc.accountNumber },
      update: {
        phoneNumber: DEMO_PHONE,
        customerName: 'Abebe Kebede',
        product: acc.product,
        accountType: acc.accountType,
        balance: acc.balance,
        current_balance: acc.balance,
        active_status: true,
        status: 'Active',
        last_transaction_date: daysAgoDate(acc.daysAgo),
        branchId: branch.id,
      },
      create: {
        accountNumber: acc.accountNumber,
        customerName: 'Abebe Kebede',
        phoneNumber: DEMO_PHONE,
        product: acc.product,
        accountType: acc.accountType,
        balance: acc.balance,
        current_balance: acc.balance,
        active_status: true,
        status: 'Active',
        last_transaction_date: daysAgoDate(acc.daysAgo),
        branchId: branch.id,
      },
    });
  }

  // Loan account
  const loanAccount = await prisma.accountMapping.upsert({
    where: { accountNumber: 'GH0045678' },
    update: {
      phoneNumber: DEMO_PHONE,
      customerName: 'Abebe Kebede',
      product: 'Loan Account',
      accountType: 'Loan',
      balance: 82350.5,
      current_balance: 82350.5,
      loan_principal: 120000,
      loan_disbursement_date: daysAgoDate(120),
      loan_maturity_date: daysAgoDate(-240),
      next_payment_date: daysAgoDate(-15),
      last_payment_date: daysAgoDate(0),
      interest_rate: 15,
      payment_frequency: 'Monthly',
      active_status: true,
      status: 'Active',
      last_transaction_date: daysAgoDate(0),
      branchId: branch.id,
    },
    create: {
      accountNumber: 'GH0045678',
      customerName: 'Abebe Kebede',
      phoneNumber: DEMO_PHONE,
      product: 'Loan Account',
      accountType: 'Loan',
      balance: 82350.5,
      current_balance: 82350.5,
      loan_principal: 120000,
      loan_disbursement_date: daysAgoDate(120),
      loan_maturity_date: daysAgoDate(-240),
      next_payment_date: daysAgoDate(-15),
      last_payment_date: daysAgoDate(0),
      interest_rate: 15,
      payment_frequency: 'Monthly',
      active_status: true,
      status: 'Active',
      last_transaction_date: daysAgoDate(0),
      branchId: branch.id,
    },
  });

  // Loan schedule (past paid + upcoming)
  await prisma.loanSchedule.deleteMany({ where: { accountId: loanAccount.id } });
  const scheduleRows = [];
  for (let i = 0; i < 12; i += 1) {
    const due = daysAgoDate(90 - i * 30);
    const paid = i < 6;
    scheduleRows.push({
      accountId: loanAccount.id,
      expectedDate: due,
      expectedAmount: 6250,
      paidAmount: paid ? 6250 : 0,
      status: paid ? 'Paid' : 'Pending',
      paidDate: paid ? due : null,
    });
  }
  await prisma.loanSchedule.createMany({ data: scheduleRows });

  // Transactions
  const allAccounts = [...ACCOUNTS.map(a => a.accountNumber), 'GH0045678'];
  await prisma.transaction.deleteMany({ where: { account_no: { in: allAccounts } } });

  const txRows = [];
  for (const [accountNumber, list] of Object.entries(TRANSACTIONS)) {
    for (const tx of list) {
      txRows.push({
        account_no: accountNumber,
        transaction_type: tx.credit ? 'credit' : 'debit',
        credit: tx.credit || 0,
        debit: tx.debit || 0,
        description: tx.description,
        transaction_date: daysAgoDate(tx.daysAgo),
        branch_code: branch.code,
      });
    }
  }
  await prisma.transaction.createMany({ data: txRows });

  console.log(`✅ Mobile demo member ready: ${DEMO_PHONE} / PIN ${DEMO_PIN}`);
  console.log(`   Member id: ${member.id}`);
  console.log(`   Accounts: ${allAccounts.length}, Transactions: ${txRows.length}`);
};

run()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
