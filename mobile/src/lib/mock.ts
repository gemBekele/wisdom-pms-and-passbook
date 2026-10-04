import type {
  Account,
  CustomerProfile,
  LoanEligibility,
  LoanProduct,
  LoanRequest,
  TransactionEntry,
} from '@/types';

export const mockCustomer: CustomerProfile = {
  fullName: 'Abebe Kebede',
  phone: '0912345678',
};

export const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    accountNumber: 'GH0012345',
    product: 'Gihon Regular Saving',
    accountType: 'Savings',
    balance: 25840.75,
    lastActivity: '2026-09-05',
  },
  {
    id: 'acc-2',
    accountNumber: 'GH0016789',
    product: 'Medbegna Saving',
    accountType: 'Savings',
    balance: 41200.0,
    lastActivity: '2026-09-04',
  },
  {
    id: 'acc-3',
    accountNumber: 'GH0023456',
    product: 'Fixed Time Deposit',
    accountType: 'Fixed_Deposit',
    balance: 87500.0,
    lastActivity: '2026-08-30',
  },
  {
    id: 'acc-4',
    accountNumber: 'GH0045678',
    product: 'Loan Account',
    accountType: 'Loan',
    balance: 0,
    lastActivity: '2026-09-06',
    loan: {
      principal: 120000,
      outstanding: 82350.5,
      nextPaymentDate: '2026-09-25',
      nextPaymentAmount: 6250,
      repaid: 37649.5,
    },
  },
];

export const mockTransactionsByAccount: Record<string, TransactionEntry[]> = {
  'acc-1': [
    { id: 't1', date: '2026-09-05', description: 'Deposit · Gihon Regular Saving', amount: 1500, balanceAfter: 25840.75 },
    { id: 't2', date: '2026-09-02', description: 'Deposit · Gihon Regular Saving', amount: 2500, balanceAfter: 24340.75 },
    { id: 't3', date: '2026-08-28', description: 'Withdrawal · ATM', amount: -2000, balanceAfter: 21840.75 },
    { id: 't4', date: '2026-08-22', description: 'Salary deposit', amount: 12500, balanceAfter: 23840.75 },
    { id: 't5', date: '2026-08-15', description: 'Deposit · Gihon Regular Saving', amount: 1000, balanceAfter: 11340.75 },
    { id: 't6', date: '2026-08-10', description: 'Transfer to Loan Account', amount: -6250, balanceAfter: 10340.75 },
    { id: 't7', date: '2026-08-03', description: 'Deposit · Gihon Regular Saving', amount: 1800, balanceAfter: 16590.75 },
  ],
  'acc-2': [
    { id: 'm1', date: '2026-09-04', description: 'Deposit · Medbegna Saving', amount: 3200, balanceAfter: 41200 },
    { id: 'm2', date: '2026-08-20', description: 'Deposit · Medbegna Saving', amount: 1500, balanceAfter: 38000 },
    { id: 'm3', date: '2026-08-12', description: 'Deposit · Medbegna Saving', amount: 2500, balanceAfter: 36500 },
    { id: 'm4', date: '2026-08-01', description: 'Deposit · Medbegna Saving', amount: 1000, balanceAfter: 34000 },
  ],
  'acc-3': [
    { id: 'f1', date: '2026-08-30', description: 'Fixed deposit opened · 12 months', amount: 50000, balanceAfter: 87500 },
    { id: 'f2', date: '2026-08-01', description: 'Fixed deposit top-up', amount: 37500, balanceAfter: 37500 },
  ],
  'acc-4': [
    { id: 'l1', date: '2026-09-06', description: 'Loan repayment', amount: -6250, balanceAfter: 82350.5 },
    { id: 'l2', date: '2026-08-25', description: 'Loan repayment', amount: -6250, balanceAfter: 88600.5 },
    { id: 'l3', date: '2026-07-25', description: 'Loan repayment', amount: -6250, balanceAfter: 94850.5 },
    { id: 'l4', date: '2026-06-25', description: 'Loan repayment', amount: -6250, balanceAfter: 101100.5 },
  ],
};

export const mockLoanEligibility: LoanEligibility = {
  status: 'eligible',
  maxAmount: 150000,
};

export const mockLoanProducts: LoanProduct[] = [
  {
    id: 'lp-1',
    name: 'Conventional Loan',
    minAmount: 5000,
    maxAmount: 150000,
    maxTermMonths: 24,
    interestRate: 15,
  },
  {
    id: 'lp-2',
    name: 'IFB Financing',
    minAmount: 5000,
    maxAmount: 120000,
    maxTermMonths: 24,
    interestRate: 12,
  },
];

export const mockLoanRequests: LoanRequest[] = [
  {
    id: 'lr-1',
    product: 'Conventional Loan',
    amount: 60000,
    termMonths: 12,
    monthlyInstallment: 5425,
    status: 'pending',
    submittedAt: '2026-09-03',
  },
];