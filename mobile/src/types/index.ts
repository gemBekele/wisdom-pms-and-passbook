export type Language = 'en' | 'am';

export type AccountType = 'Savings' | 'Current' | 'Fixed_Deposit' | 'Recurring_Deposit' | 'Loan';

export interface LoanSummary {
  principal: number;
  outstanding: number;
  nextPaymentDate: string;
  nextPaymentAmount: number;
  repaid: number;
}

export interface Account {
  id: string;
  accountNumber: string;
  product: string;
  accountType: AccountType;
  balance: number;
  lastActivity: string;
  loan?: LoanSummary;
}

export interface TransactionEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  balanceAfter: number;
}

export interface CustomerProfile {
  fullName: string;
  phone: string;
}

export type LoanEligibilityStatus = 'eligible' | 'checking' | 'not_eligible';

export interface LoanEligibility {
  status: LoanEligibilityStatus;
  maxAmount: number;
  reason?: string;
}

export type LoanRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LoanRequest {
  id: string;
  product: string;
  amount: number;
  termMonths: number;
  monthlyInstallment: number;
  status: LoanRequestStatus;
  submittedAt: string;
}

export interface LoanProduct {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  maxTermMonths: number;
  interestRate: number;
}