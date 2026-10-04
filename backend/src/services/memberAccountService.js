import prisma from '../config/database.js';
import { normalizePhone } from './otpService.js';

const ACCOUNT_TYPE_MAP = {
  Savings: 'Savings',
  Current: 'Current',
  Fixed_Deposit: 'Fixed_Deposit',
  Recurring_Deposit: 'Recurring_Deposit',
  Loan: 'Loan',
};

const phoneCandidates = (member) => {
  const n = normalizePhone(member.phoneNumber);
  return [n, `0${n}`, `251${n}`, `+251${n}`];
};

export const findAccountsForMember = async (member) => {
  const candidates = phoneCandidates(member);
  return prisma.accountMapping.findMany({
    where: {
      status: { not: 'Inactive' },
      OR: [
        ...candidates.map(phoneNumber => ({ phoneNumber })),
        { phoneNumber: { endsWith: normalizePhone(member.phoneNumber) } },
      ],
    },
    include: {
      loanSchedules: { orderBy: { expectedDate: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  });
};

const buildLoanSummary = (account) => {
  const schedules = account.loanSchedules || [];
  const principal = account.loan_principal || 0;
  const repaid = schedules.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  const outstanding = principal > 0 ? Math.max(principal - repaid, 0) : account.current_balance || account.balance || 0;

  const now = new Date();
  const upcoming = schedules.find(s => s.status !== 'Paid' && s.expectedDate >= now) || schedules.find(s => s.status !== 'Paid');

  return {
    principal,
    outstanding,
    repaid,
    nextPaymentDate: upcoming ? upcoming.expectedDate.toISOString().slice(0, 10) : null,
    nextPaymentAmount: upcoming ? Math.max((upcoming.expectedAmount || 0) - (upcoming.paidAmount || 0), 0) : 0,
  };
};

export const mapAccount = (account) => {
  const accountType = ACCOUNT_TYPE_MAP[account.accountType] || account.accountType;
  const mapped = {
    id: account.id,
    accountNumber: account.accountNumber,
    product: account.product || accountType,
    accountType,
    balance: account.current_balance || account.balance || 0,
    lastActivity: (account.last_transaction_date || account.updatedAt).toISOString().slice(0, 10),
  };

  if (accountType === 'Loan') {
    mapped.loan = buildLoanSummary(account);
  }

  return mapped;
};

export const getAccountTransactions = async (accountNumber) => {
  const account = await prisma.accountMapping.findUnique({ where: { accountNumber } });
  if (!account) return null;

  const rows = await prisma.transaction.findMany({
    where: { account_no: accountNumber },
    orderBy: { transaction_date: 'asc' },
  });

  const net = rows.reduce((sum, r) => sum + (r.credit || 0) - (r.debit || 0), 0);
  let running = (account.current_balance || account.balance || 0) - net;

  const entries = rows.map(r => {
    const amount = (r.credit || 0) - (r.debit || 0);
    running += amount;
    return {
      id: r.id,
      date: r.transaction_date.toISOString().slice(0, 10),
      description: r.description || r.transaction_type,
      amount,
      balanceAfter: running,
    };
  });

  // Most recent first for the UI.
  return entries.reverse();
};

export const summarizeAccounts = (accounts) => {
  const savings = accounts.filter(a => a.accountType !== 'Loan');
  const loans = accounts.filter(a => a.accountType === 'Loan');
  const totalBalance = savings.reduce((sum, a) => sum + a.balance, 0);
  const loanOutstanding = loans.reduce((sum, a) => sum + (a.loan?.outstanding || 0), 0);

  return {
    totalBalance,
    loanOutstanding,
    accountCount: accounts.length,
  };
};
