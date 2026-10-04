import jwt from 'jsonwebtoken';

const MOBILE_SECRET = process.env.MOBILE_JWT_SECRET || process.env.JWT_SECRET;
const MOBILE_EXPIRE = process.env.MOBILE_JWT_EXPIRE || '30d';

// Mobile tokens are issued with a dedicated audience so a customer token can
// never be accepted by the staff PMS middleware (which verifies no audience).
// `tv` is the member's token version; it is bumped on PIN change so previously
// issued tokens are invalidated without relying on second-precision timestamps.
export const generateMobileToken = (memberId, tokenVersion = 1) => {
  return jwt.sign({ memberId, tv: tokenVersion, aud: 'mobile' }, MOBILE_SECRET, {
    expiresIn: MOBILE_EXPIRE,
  });
};

export const verifyMobileToken = (token) => {
  return jwt.verify(token, MOBILE_SECRET, { audience: 'mobile' });
};
