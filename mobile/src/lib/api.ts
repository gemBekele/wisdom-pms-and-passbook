import type {
  Account,
  CustomerProfile,
  LoanEligibility,
  LoanProduct,
  LoanRequest,
  TransactionEntry,
} from '@/types';
import {
  mockAccounts,
  mockCustomer,
  mockLoanEligibility,
  mockLoanProducts,
  mockLoanRequests,
  mockTransactionsByAccount,
} from './mock';
import { delay } from './format';
import { config } from './config';
import { request, setAuthToken } from './http';

export interface OtpRequestResult {
  sentTo: string;
  cooldownSeconds: number;
}

export interface VerifyOtpResult {
  needsPinSetup: boolean;
}

const mockApi = {
  async requestOtp(phone: string): Promise<OtpRequestResult> {
    await delay(900);
    return { sentTo: phone, cooldownSeconds: 60 };
  },
  async verifyOtp(_phone: string, otp: string): Promise<VerifyOtpResult> {
    await delay(800);
    if (otp !== '123456') throw new Error('WRONG_OTP');
    return { needsPinSetup: true };
  },
  async setPin(pin: string): Promise<void> {
    await delay(700);
    void pin;
  },
  async login(phone: string, pin: string): Promise<void> {
    await delay(700);
    void pin;
    void phone;
  },
  async getProfile(): Promise<CustomerProfile> {
    await delay(400);
    return mockCustomer;
  },
  async getAccounts(): Promise<Account[]> {
    await delay(600);
    return mockAccounts;
  },
  async getTransactions(accountNumber: string): Promise<TransactionEntry[]> {
    await delay(500);
    const account = mockAccounts.find(a => a.accountNumber === accountNumber);
    return (account && mockTransactionsByAccount[account.id]) ?? [];
  },
  async getLoanEligibility(): Promise<LoanEligibility> {
    await delay(900);
    return mockLoanEligibility;
  },
  async getLoanProducts(): Promise<LoanProduct[]> {
    await delay(400);
    return mockLoanProducts;
  },
  async getLoanRequests(): Promise<LoanRequest[]> {
    await delay(500);
    return mockLoanRequests;
  },
  async submitLoanRequest(input: {
    productId: string;
    amount: number;
    termMonths: number;
  }): Promise<LoanRequest> {
    await delay(900);
    const product = mockLoanProducts.find(p => p.id === input.productId) ?? mockLoanProducts[0];
    const rate = product.interestRate / 100 / 12;
    const factor = rate === 0 ? 1 : (rate * Math.pow(1 + rate, input.termMonths)) / (Math.pow(1 + rate, input.termMonths) - 1);
    const monthlyInstallment = Math.round(input.amount * factor);
    return {
      id: `lr-${Date.now()}`,
      product: product.name,
      amount: input.amount,
      termMonths: input.termMonths,
      monthlyInstallment,
      status: 'pending',
      submittedAt: new Date().toISOString().slice(0, 10),
    };
  },
  async logout(): Promise<void> {},
};

const realApi = {
  async requestOtp(phone: string): Promise<OtpRequestResult> {
    const res = await request<OtpRequestResult>('/auth/request-otp', {
      method: 'POST',
      body: { phone },
    });
    return res.data;
  },
  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
    const res = await request<{ needsPinSetup: boolean }>('/auth/verify-otp', {
      method: 'POST',
      body: { phone, otp },
    });
    if (res.token) await setAuthToken(res.token);
    return res.data;
  },
  async setPin(pin: string): Promise<void> {
    const res = await request('/auth/set-pin', { method: 'POST', body: { pin } });
    if (res.token) await setAuthToken(res.token);
  },
  async login(phone: string, pin: string): Promise<void> {
    const res = await request('/auth/login', { method: 'POST', body: { phone, pin } });
    if (res.token) await setAuthToken(res.token);
  },
  async getProfile(): Promise<CustomerProfile> {
    const res = await request<CustomerProfile>('/auth/me');
    return res.data;
  },
  async getAccounts(): Promise<Account[]> {
    const res = await request<Account[]>('/accounts');
    return res.data;
  },
  async getTransactions(accountNumber: string): Promise<TransactionEntry[]> {
    const res = await request<TransactionEntry[]>(`/accounts/${accountNumber}/transactions`);
    return res.data;
  },
  async getLoanEligibility(): Promise<LoanEligibility> {
    const res = await request<LoanEligibility>('/loans/eligibility');
    return res.data;
  },
  async getLoanProducts(): Promise<LoanProduct[]> {
    const res = await request<LoanProduct[]>('/loans/products');
    return res.data;
  },
  async getLoanRequests(): Promise<LoanRequest[]> {
    const res = await request<LoanRequest[]>('/loans/requests');
    return res.data;
  },
  async submitLoanRequest(input: {
    productId: string;
    amount: number;
    termMonths: number;
  }): Promise<LoanRequest> {
    const res = await request<LoanRequest>('/loans/requests', {
      method: 'POST',
      body: input,
    });
    return res.data;
  },
  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // best-effort; clear the local token regardless
    }
    await setAuthToken(null);
  },
};

export const api = config.useMock ? mockApi : realApi;

export const OTP_DEMO_HINT = '123456';
