import prisma from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { findAccountsForMember, mapAccount, summarizeAccounts } from '../../services/memberAccountService.js';

// Default loan catalog. Move to a Product/SystemSetting table when the business
// wants configurable mobile loan products.
const LOAN_PRODUCTS = [
  {
    id: 'lp-conventional',
    name: 'Conventional Loan',
    minAmount: 5000,
    maxAmount: 500000,
    maxTermMonths: 24,
    interestRate: 15,
  },
  {
    id: 'lp-ifb',
    name: 'IFB Financing',
    minAmount: 5000,
    maxAmount: 400000,
    maxTermMonths: 24,
    interestRate: 12,
  },
];

const MAX_MULTIPLE_OF_SAVINGS = 3;
const ABSOLUTE_CAP = 500000;

const monthlyInstallment = (amount, annualRate, termMonths) => {
  const rate = annualRate / 100 / 12;
  if (rate === 0) return amount / termMonths;
  const factor = (rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1);
  return amount * factor;
};

const mapRequest = (r) => ({
  id: r.id,
  product: r.productName,
  amount: r.amount,
  termMonths: r.termMonths,
  monthlyInstallment: r.monthlyInstallment,
  status: r.status,
  submittedAt: r.createdAt.toISOString().slice(0, 10),
});

// @desc    Get loan eligibility
// @route   GET /api/v1/mobile/loans/eligibility
// @access  Private (mobile)
export const getEligibility = asyncHandler(async (req, res) => {
  const accounts = (await findAccountsForMember(req.member)).map(mapAccount);
  const stats = summarizeAccounts(accounts);

  if (stats.accountCount === 0) {
    return res.status(200).json({
      success: true,
      data: { status: 'not_eligible', maxAmount: 0, reason: 'No accounts found on your profile yet.' },
    });
  }

  const maxAmount = Math.min(Math.floor(stats.totalBalance * MAX_MULTIPLE_OF_SAVINGS), ABSOLUTE_CAP);
  if (maxAmount < 5000) {
    return res.status(200).json({
      success: true,
      data: {
        status: 'not_eligible',
        maxAmount,
        reason: 'Keep saving to unlock a loan offer. A minimum balance is required.',
      },
    });
  }

  res.status(200).json({ success: true, data: { status: 'eligible', maxAmount } });
});

// @desc    Get loan products
// @route   GET /api/v1/mobile/loans/products
// @access  Private (mobile)
export const getProducts = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: LOAN_PRODUCTS });
});

// @desc    List member loan requests
// @route   GET /api/v1/mobile/loans/requests
// @access  Private (mobile)
export const getRequests = asyncHandler(async (req, res) => {
  const requests = await prisma.mobileLoanRequest.findMany({
    where: { memberId: req.member.id },
    orderBy: { createdAt: 'desc' },
  });
  res.status(200).json({ success: true, data: requests.map(mapRequest) });
});

// @desc    Submit a loan request
// @route   POST /api/v1/mobile/loans/requests
// @access  Private (mobile)
export const createRequest = asyncHandler(async (req, res) => {
  const { productId, amount, termMonths } = req.body;

  const product = LOAN_PRODUCTS.find(p => p.id === productId);
  if (!product) {
    return res.status(400).json({ success: false, message: 'Unknown loan product' });
  }

  const numericAmount = Number(amount);
  const term = Number(termMonths);
  if (!numericAmount || !Number.isFinite(numericAmount) || numericAmount < product.minAmount) {
    return res.status(400).json({ success: false, message: `Minimum amount is ${product.minAmount}` });
  }
  if (numericAmount > product.maxAmount) {
    return res.status(400).json({ success: false, message: `Maximum amount is ${product.maxAmount}` });
  }
  if (!Number.isInteger(term) || term < 1 || term > product.maxTermMonths) {
    return res.status(400).json({ success: false, message: `Term must be 1-${product.maxTermMonths} months` });
  }

  const created = await prisma.mobileLoanRequest.create({
    data: {
      memberId: req.member.id,
      productName: product.name,
      amount: numericAmount,
      termMonths: term,
      interestRate: product.interestRate,
      monthlyInstallment: Math.round(monthlyInstallment(numericAmount, product.interestRate, term)),
      status: 'pending',
    },
  });

  res.status(201).json({ success: true, data: mapRequest(created) });
});
