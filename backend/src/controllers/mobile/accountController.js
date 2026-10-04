import prisma from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import {
  findAccountsForMember,
  mapAccount,
  getAccountTransactions,
} from '../../services/memberAccountService.js';

const ownsAccount = async (member, accountNumber) => {
  const accounts = await findAccountsForMember(member);
  return accounts.find(a => a.accountNumber === accountNumber) || null;
};

// @desc    List member accounts
// @route   GET /api/v1/mobile/accounts
// @access  Private (mobile)
export const getAccounts = asyncHandler(async (req, res) => {
  const accounts = await findAccountsForMember(req.member);
  res.status(200).json({ success: true, data: accounts.map(mapAccount) });
});

// @desc    Get a single account
// @route   GET /api/v1/mobile/accounts/:accountNumber
// @access  Private (mobile)
export const getAccount = asyncHandler(async (req, res) => {
  const account = await ownsAccount(req.member, req.params.accountNumber);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }
  res.status(200).json({ success: true, data: mapAccount(account) });
});

// @desc    Get transactions for an account
// @route   GET /api/v1/mobile/accounts/:accountNumber/transactions
// @access  Private (mobile)
export const getTransactions = asyncHandler(async (req, res) => {
  const account = await ownsAccount(req.member, req.params.accountNumber);
  if (!account) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  const entries = await getAccountTransactions(req.params.accountNumber);
  res.status(200).json({ success: true, data: entries || [] });
});
