import express from 'express';
import {
  requestOtp,
  verifyOtpCode,
  setPin,
  login,
  getMe,
  getOverview,
  logout,
} from '../controllers/mobile/authController.js';
import {
  getAccounts,
  getAccount,
  getTransactions,
} from '../controllers/mobile/accountController.js';
import {
  getEligibility,
  getProducts,
  getRequests,
  createRequest,
} from '../controllers/mobile/loanController.js';
import { mobileProtect } from '../middleware/mobileAuth.js';
import { rateLimit, phoneKey } from '../middleware/rateLimit.js';

const router = express.Router();

// Auth (rate limited to slow brute force)
router.post('/auth/request-otp', rateLimit({ name: 'otp-request', windowMs: 60 * 1000, max: 10, keyFn: phoneKey }), requestOtp);
router.post('/auth/verify-otp', rateLimit({ name: 'otp-verify', windowMs: 60 * 1000, max: 50, keyFn: phoneKey }), verifyOtpCode);
router.post('/auth/login', rateLimit({ name: 'login', windowMs: 60 * 1000, max: 25, keyFn: phoneKey }), login);
router.post('/auth/set-pin', mobileProtect, setPin);
router.post('/auth/logout', mobileProtect, logout);
router.get('/auth/me', mobileProtect, getMe);

// Dashboard
router.get('/overview', mobileProtect, getOverview);

// Accounts
router.get('/accounts', mobileProtect, getAccounts);
router.get('/accounts/:accountNumber', mobileProtect, getAccount);
router.get('/accounts/:accountNumber/transactions', mobileProtect, getTransactions);

// Loans
router.get('/loans/eligibility', mobileProtect, getEligibility);
router.get('/loans/products', mobileProtect, getProducts);
router.get('/loans/requests', mobileProtect, getRequests);
router.post('/loans/requests', mobileProtect, createRequest);

export default router;
