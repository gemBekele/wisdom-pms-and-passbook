import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

const OTP_TTL_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

// TEMPORARY: fixed OTP for development/demo. Replace with a real SMS provider
// and random codes before production (see mobile AGENTS/plan).
export const DEFAULT_OTP = process.env.MOBILE_DEFAULT_OTP || '123456';

/**
 * Normalize an Ethiopian phone number to 9 local digits (e.g. 912345678).
 * Accepts 0912345678, 912345678, 251912345678, +251 91 234 5678, etc.
 * Returns '' for anything ambiguous (wrong digit count) so callers can reject it.
 */
export const normalizePhone = (input) => {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('251')) digits = digits.slice(3);
  if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1);
  // Must be a 9-digit local mobile number (starts with 9).
  return digits.length === 9 && digits.startsWith('9') ? digits : '';
};

const hashCode = (code) => bcrypt.hash(code, 10);

export const issueOtp = async (member, purpose = 'login') => {
  // Invalidate any outstanding codes for this purpose.
  await prisma.mobileOtp.updateMany({
    where: { memberId: member.id, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = DEFAULT_OTP;
  await prisma.mobileOtp.create({
    data: {
      memberId: member.id,
      codeHash: await hashCode(code),
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  // TODO: send via SMS provider. In dev we simply log it.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[mobile-otp] ${member.phoneNumber} -> ${code}`);
  }

  return code;
};

export const verifyOtp = async (member, code, purpose = 'login') => {
  const otp = await prisma.mobileOtp.findFirst({
    where: { memberId: member.id, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return false;
  if (otp.expiresAt < new Date()) return false;
  if (otp.attempts >= MAX_OTP_ATTEMPTS) return false;

  const matches = await bcrypt.compare(String(code), otp.codeHash);

  await prisma.mobileOtp.update({
    where: { id: otp.id },
    data: {
      attempts: { increment: matches ? 0 : 1 },
      consumedAt: matches ? new Date() : null,
    },
  });

  return matches;
};
