import prisma from '../../config/database.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { generateMobileToken } from '../../utils/mobileToken.js';
import { hashPassword, comparePassword } from '../../utils/prismaHelpers.js';
import { issueOtp, verifyOtp, normalizePhone } from '../../services/otpService.js';
import { findAccountsForMember, mapAccount, summarizeAccounts } from '../../services/memberAccountService.js';

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;

const publicMember = (member) => ({
  id: member.id,
  fullName: member.fullName,
  phone: member.phoneNumber,
});

const findOrCreateMember = async (phone) => {
  let member = await prisma.member.findUnique({ where: { phoneNumber: phone } });
  if (member) return member;

  // Onboard a member if they own at least one account in the CBS mapping.
  const account = await prisma.accountMapping.findFirst({
    where: {
      OR: [
        { phoneNumber: phone },
        { phoneNumber: `0${phone}` },
        { phoneNumber: `251${phone}` },
        { phoneNumber: `+251${phone}` },
        { phoneNumber: { endsWith: phone } },
      ],
    },
  });

  if (!account) return null;

  member = await prisma.member.create({
    data: {
      phoneNumber: phone,
      fullName: account.customerName || 'Mobile Member',
    },
  });

  return member;
};

// @desc    Request an OTP for a phone number
// @route   POST /api/v1/mobile/auth/request-otp
// @access  Public
export const requestOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (phone.length !== 9) {
    return res.status(400).json({ success: false, message: 'Invalid phone number' });
  }

  const member = await findOrCreateMember(phone);
  if (!member) {
    return res.status(404).json({ success: false, message: 'No account found for this number' });
  }

  await issueOtp(member, 'login');

  res.status(200).json({
    success: true,
    data: {
      sentTo: member.phoneNumber,
      cooldownSeconds: 60,
      needsPinSetup: !member.pinHash,
    },
  });
});

// @desc    Verify an OTP
// @route   POST /api/v1/mobile/auth/verify-otp
// @access  Public
export const verifyOtpCode = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const { otp } = req.body;

  const member = await prisma.member.findUnique({ where: { phoneNumber: phone } });
  if (!member) {
    return res.status(404).json({ success: false, message: 'No account found for this number' });
  }

  const valid = await verifyOtp(member, otp, 'login');
  if (!valid) {
    return res.status(401).json({ success: false, message: 'WRONG_OTP' });
  }

  res.status(200).json({
    success: true,
    token: generateMobileToken(member.id, member.tokenVersion),
    data: {
      needsPinSetup: !member.pinHash,
      profile: publicMember(member),
    },
  });
});

// @desc    Set (or reset) the member PIN
// @route   POST /api/v1/mobile/auth/set-pin
// @access  Private (mobile)
export const setPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  if (!pin || !/^\d{4,6}$/.test(String(pin))) {
    return res.status(400).json({ success: false, message: 'PIN must be 4-6 digits' });
  }

  const member = await prisma.member.update({
    where: { id: req.member.id },
    data: {
      pinHash: await hashPassword(String(pin)),
      pinAttempts: 0,
      pinLockedUntil: null,
      pinChangedAt: new Date(),
      tokenVersion: { increment: 1 },
      lastLoginAt: new Date(),
    },
  });

  // Setting/changing the PIN revokes prior tokens, so issue a fresh one for the
  // current session (otherwise the caller's next request would 401).
  res.status(200).json({
    success: true,
    token: generateMobileToken(member.id, member.tokenVersion),
    data: publicMember(member),
  });
});

// @desc    Login with PIN
// @route   POST /api/v1/mobile/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const { pin } = req.body;

  const member = await prisma.member.findUnique({ where: { phoneNumber: phone } });
  if (!member || !member.pinHash) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (member.pinLockedUntil && member.pinLockedUntil > new Date()) {
    return res.status(423).json({ success: false, message: 'PIN locked. Try again later.' });
  }

  const matches = await comparePassword(String(pin), member.pinHash);
  if (!matches) {
    const attempts = member.pinAttempts + 1;
    await prisma.member.update({
      where: { id: member.id },
      data: {
        pinAttempts: attempts,
        pinLockedUntil: attempts >= PIN_MAX_ATTEMPTS ? new Date(Date.now() + PIN_LOCK_MINUTES * 60 * 1000) : null,
      },
    });
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { pinAttempts: 0, pinLockedUntil: null, lastLoginAt: new Date() },
  });

  res.status(200).json({
    success: true,
    token: generateMobileToken(member.id, member.tokenVersion),
    data: publicMember(member),
  });
});

// @desc    Get current member profile
// @route   GET /api/v1/mobile/auth/me
// @access  Private (mobile)
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: publicMember(req.member) });
});

// @desc    Get a compact dashboard summary
// @route   GET /api/v1/mobile/overview
// @access  Private (mobile)
export const getOverview = asyncHandler(async (req, res) => {
  const accounts = await findAccountsForMember(req.member);
  const mapped = accounts.map(mapAccount);

  res.status(200).json({
    success: true,
    data: {
      profile: publicMember(req.member),
      stats: summarizeAccounts(mapped),
      accounts: mapped,
    },
  });
});

// @desc    Logout (stateless)
// @route   POST /api/v1/mobile/auth/logout
// @access  Private (mobile)
export const logout = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out' });
});
