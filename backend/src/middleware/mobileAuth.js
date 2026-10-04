import prisma from '../config/database.js';
import { verifyMobileToken } from '../utils/mobileToken.js';

export const mobileProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    const decoded = verifyMobileToken(token);
    const member = await prisma.member.findUnique({
      where: { id: decoded.memberId },
    });

    if (!member || !member.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Member not found or inactive',
      });
    }

    // Invalidate tokens issued before the last PIN change.
    const tokenVersion = decoded.tv ?? 1;
    if (tokenVersion !== (member.tokenVersion ?? 1)) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please sign in again.',
      });
    }

    req.member = member;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};
