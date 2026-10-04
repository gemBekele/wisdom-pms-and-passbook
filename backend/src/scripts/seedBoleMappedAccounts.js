import 'dotenv/config';
import prisma from '../config/database.js';

const BRANCH_CODE = 'BR-001';

// Customer accounts seeded at Bole Branch and mapped to the branch's staff.
const ACCOUNTS = [
  { accountNumber: 'BOL-1001', customerName: 'Hanna Tesfaye', phoneNumber: '0911223344', product: 'Gihon Regular Saving', accountType: 'Savings', balance: 18450.5, monthsAgo: 26 },
  { accountNumber: 'BOL-1002', customerName: 'Dawit Mekonnen', phoneNumber: '0912345670', product: 'Michu Current Saving', accountType: 'Current', balance: 73200.0, monthsAgo: 34 },
  { accountNumber: 'BOL-1003', customerName: 'Selam Alemu', phoneNumber: '0913456781', product: 'Mothers Saving', accountType: 'Savings', balance: 9875.25, monthsAgo: 15 },
  { accountNumber: 'BOL-1004', customerName: 'Yonas Bekele', phoneNumber: '0914567892', product: 'Gihon Regular Saving', accountType: 'Savings', balance: 43100.0, monthsAgo: 41 },
  { accountNumber: 'BOL-1005', customerName: 'Marta Girma', phoneNumber: '0915678903', product: 'Wadiah IFB Deposit', accountType: 'Savings', balance: 26400.75, monthsAgo: 9 },
  { accountNumber: 'BOL-1006', customerName: 'Bereket Hailu', phoneNumber: '0916789014', product: 'Fixed Time Deposit', accountType: 'Fixed_Deposit', balance: 150000.0, monthsAgo: 7 },
  { accountNumber: 'BOL-1007', customerName: 'Rahel Assefa', phoneNumber: '0917890125', product: 'Special Saving', accountType: 'Savings', balance: 15750.0, monthsAgo: 19 },
  { accountNumber: 'BOL-1008', customerName: 'Kalkidan Desta', phoneNumber: '0918901236', product: 'Children Saving', accountType: 'Savings', balance: 6240.5, monthsAgo: 12 },
  { accountNumber: 'BOL-1009', customerName: 'Tewodros Nigussie', phoneNumber: '0919012347', product: 'Premium Saving Deposit', accountType: 'Savings', balance: 58230.0, monthsAgo: 30 },
  { accountNumber: 'BOL-1010', customerName: 'Genet Worku', phoneNumber: '0910123458', product: 'Fixed Time Deposit', accountType: 'Fixed_Deposit', balance: 220000.0, monthsAgo: 5 },
  // Loans
  { accountNumber: 'BOL-2001', customerName: 'Solomon Gebre', phoneNumber: '0912233440', product: 'Loan Account', accountType: 'Loan', balance: 96400.0, monthsAgo: 18, loan: { principal: 150000, termMonths: 24, frequency: 'Monthly', interestRate: 15, disbursedMonthsAgo: 8 } },
  { accountNumber: 'BOL-2002', customerName: 'Hiwot Abebe', phoneNumber: '0913344551', product: 'Loan Account', accountType: 'Loan', balance: 43250.0, monthsAgo: 10, loan: { principal: 80000, termMonths: 18, frequency: 'Monthly', interestRate: 12, disbursedMonthsAgo: 5 } },
  // Solomon's savings account (same owner as his loan for consistency)
  { accountNumber: 'BOL-3001', customerName: 'Solomon Gebre', phoneNumber: '0912233440', product: 'Gihon Regular Saving', accountType: 'Savings', balance: 18450.0, monthsAgo: 20, owner: 'staff@sako.com' },
];

const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

const run = async () => {
  await prisma.$connect();

  const branch = await prisma.branch.findUnique({ where: { code: BRANCH_CODE } });
  if (!branch) throw new Error(`Branch ${BRANCH_CODE} not found`);

  const staff = await prisma.user.findMany({ where: { branch_code: BRANCH_CODE } });
  const byEmail = Object.fromEntries(staff.map((u) => [u.email, u]));
  const owners = [byEmail['staff@sako.com'], byEmail['supervisor@sako.com']].filter(Boolean);
  if (owners.length === 0) owners.push(...staff);
  if (owners.length === 0) throw new Error('No staff users found at Bole branch');

  const mappedById = byEmail['branch@sako.com']?.id ?? owners[0].id;

  let i = 0;
  for (const a of ACCOUNTS) {
    const owner = (a.owner && byEmail[a.owner]) || owners[i % owners.length];
    i += 1;

    const base = {
      customerName: a.customerName,
      phoneNumber: a.phoneNumber,
      product: a.product,
      accountType: a.accountType,
      balance: a.balance,
      current_balance: a.balance,
      june_balance: Math.max(a.balance - 1500, 0),
      active_status: true,
      isProductive: a.balance >= 1000,
      status: 'Active',
      branchId: branch.id,
      mappedToId: owner.id,
      mappedById,
      mappedAt: daysAgo(2),
      last_transaction_date: daysAgo(1),
      ...(a.loan
        ? {
            loan_principal: a.loan.principal,
            payment_frequency: a.loan.frequency,
            interest_rate: a.loan.interestRate,
            loan_disbursement_date: daysAgo(a.loan.disbursedMonthsAgo * 30),
            loan_maturity_date: daysAgo(-(a.loan.termMonths - a.loan.disbursedMonthsAgo) * 30),
            next_payment_date: daysAgo(-15),
            last_payment_date: daysAgo(1),
          }
        : {}),
    };

    await prisma.accountMapping.upsert({
      where: { accountNumber: a.accountNumber },
      update: base,
      create: { accountNumber: a.accountNumber, ...base },
    });

    console.log(`✅ ${a.accountNumber}  ${a.customerName.padEnd(20)} ${a.accountType.padEnd(14)} → ${owner.email}`);
  }

  const total = await prisma.accountMapping.count({ where: { branchId: branch.id, mappedToId: { not: null } } });

  // Seed passbook transactions for each account (the mobile app reads these).
  const accountNumbers = ACCOUNTS.map((a) => a.accountNumber);
  await prisma.transaction.deleteMany({ where: { account_no: { in: accountNumbers } } });

  const txRows = ACCOUNTS.flatMap((a) => {
    const isLoan = a.accountType === 'Loan';
    const installment = isLoan ? Math.round(a.balance / 8) : 0;
    const patterns = isLoan
      ? [
          { days: 150, debit: installment, desc: 'Loan repayment' },
          { days: 120, debit: installment, desc: 'Loan repayment' },
          { days: 90, debit: installment, desc: 'Loan repayment' },
          { days: 60, debit: installment, desc: 'Loan repayment' },
          { days: 30, debit: installment, desc: 'Loan repayment' },
          { days: 1, debit: installment, desc: 'Loan repayment' },
        ]
      : [
          { days: 96, credit: 2500, desc: `Deposit · ${a.product}` },
          { days: 74, credit: 1500, desc: `Deposit · ${a.product}` },
          { days: 52, debit: 2000, desc: 'Withdrawal · ATM' },
          { days: 36, credit: 3000, desc: `Deposit · ${a.product}` },
          { days: 21, credit: 1200, desc: 'Salary deposit' },
          { days: 9, debit: 1500, desc: 'Transfer to Loan Account' },
          { days: 1, credit: 2200, desc: `Deposit · ${a.product}` },
        ];

    return patterns.map((p, i) => ({
      account_no: a.accountNumber,
      transaction_type: p.credit ? 'credit' : 'debit',
      credit: p.credit || 0,
      debit: p.debit || 0,
      description: p.desc,
      transaction_date: daysAgo(p.days),
      branch_code: branch.code,
      reference: `${a.accountNumber}-${String(i + 1).padStart(3, '0')}`,
    }));
  });

  await prisma.transaction.createMany({ data: txRows });

  console.log(`\n🎉 ${ACCOUNTS.length} accounts seeded at ${branch.name}; ${total} mapped accounts at this branch.`);
  console.log(`🧾 ${txRows.length} transactions seeded across ${accountNumbers.length} accounts.`);
};

run()
  .catch((err) => {
    console.error('❌ Seed mapped accounts failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
