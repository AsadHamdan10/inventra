import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import prisma from '../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { auditLog } from '../services/auditService';
import { encryptIfPresent, safeDecrypt, blindIndex } from '../utils/crypto';
import { z } from 'zod';

// ── Rate Limiter ───────────────────────────────────────────────
export const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts. Please try again in 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── GSTIN validator ────────────────────────────────────────────
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const mobileRegex = /^[6-9]\d{9}$/;

// ── Validation Schemas ─────────────────────────────────────────
const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

const registerSchema = z.object({
  // Account fields — MANDATORY
  companyName:  z.string().min(3, 'Company Name must be at least 3 characters.').max(200),
  username:     z.string().min(3, 'Username must be at least 3 characters.').max(50)
                  .regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers, and underscores.'),
  password:     z.string().min(8, 'Password must contain at least 8 characters.'),
  email:        z.string().email('Invalid email address.').max(150),
  mobile:        z.string().regex(mobileRegex, 'Mobile must be a valid 10-digit Indian mobile number.'),

  // Company profile fields — OPTIONAL. Empty string is treated the same as not provided
  // (no format check runs against a blank value), but a non-empty value must still be valid.
  gstin:        z.string().optional().default('')
                  .refine((v) => v === '' || gstinRegex.test(v), 'Invalid GSTIN format. Example: 22AAAAA0000A1Z5'),
  addressLine1: z.string().max(255).optional().default(''),
  addressLine2: z.string().max(255).optional().default(''),
  city:         z.string().max(100).optional().default(''),
  district:     z.string().max(100).optional().default(''),
  state:        z.string().max(100).optional().default(''),
  pincode:      z.string().optional().default('')
                  .refine((v) => v === '' || /^\d{6}$/.test(v), 'Pincode must be exactly 6 digits.'),
  country:      z.string().optional().default('India'),
  panNumber:    z.string().optional().default(''),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword:     z.string().min(8, 'New password must be at least 8 characters.'),
});

const profileSchema = z.object({
  companyName:  z.string().min(3).max(200),
  gstin:        z.string().regex(gstinRegex, 'Invalid GSTIN format.'),
  addressLine1: z.string().min(3).max(255),
  addressLine2: z.string().optional().default(''),
  city:         z.string().min(2).max(100),
  district:     z.string().min(2).max(100),
  state:        z.string().min(2).max(100),
  pincode:      z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits.'),
  country:      z.string().default('India'),
  email:        z.string().email().max(150),
  mobile:        z.string().regex(mobileRegex, 'Invalid mobile number.'),
  panNumber:    z.string().optional().default(''),
});

// ── Helper: build user profile response ───────────────────────
// All sensitive fields are stored encrypted (see prisma/schema.prisma);
// this is the one place they get decrypted before going to the frontend.
function buildUserResponse(user: any) {
  return {
    id:                  user.id,
    companyName:         user.companyName,
    username:            user.username,
    email:               user.email,
    mobile:              safeDecrypt(user.mobile) || '',
    role:                user.role,
    status:              user.status,
    forcePasswordChange: user.forcePasswordChange,
    profileComplete:     user.profileComplete,
    gstin:               safeDecrypt(user.gstin) || '',
    addressLine1:        safeDecrypt(user.addressLine1) || '',
    addressLine2:        safeDecrypt(user.addressLine2) || '',
    city:                safeDecrypt(user.city) || '',
    district:            safeDecrypt(user.district) || '',
    state:               safeDecrypt(user.state) || '',
    pincode:             safeDecrypt(user.pincode) || '',
    country:             user.country || 'India',
    panNumber:           safeDecrypt(user.panNumber) || '',
  };
}

// ── Login ──────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Username and password are required.', message: 'Username and password are required.' });
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });

    if (!user) {
      await auditLog(0, 'failed_login', `User not found: ${username}`, req);
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await auditLog(user.id, 'failed_login', `Incorrect password for: ${username}`, req);
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    if (user.role !== 'super_admin' && user.status !== 'approved') {
      await auditLog(user.id, 'login_blocked', `Account ${user.status}`, req);
      const messages: Record<string, string> = {
        pending:   'Your account is pending Super Admin approval.',
        rejected:  'Your account has been rejected. Please contact administrator.',
        suspended: 'Your account has been disabled.',
      };
      return res.status(403).json({
        success: false,
        error: messages[user.status] || `Account is ${user.status}.`,
        status: user.status,
      });
    }

    const payload = { userId: user.id, role: user.role, companyName: user.companyName };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } });

    await auditLog(user.id, 'login', `Login: ${username}`, req);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/api/v1/auth/refresh',
    });

    res.json({ success: true, accessToken, user: buildUserResponse(user) });
  } catch (err) { next(err); }
}

// ── Register ───────────────────────────────────────────────────
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstField = Object.keys(errors)[0];
      const firstMsg   = (errors as any)[firstField]?.[0] || 'Validation failed.';
      return res.status(400).json({ success: false, field: firstField, message: firstMsg });
    }

    const d = parsed.data;

    // Check username uniqueness
    const byUsername = await prisma.user.findUnique({ where: { username: d.username } });
    if (byUsername) {
      return res.status(409).json({ success: false, field: 'username', message: 'Username is already taken.' });
    }

    // Check email uniqueness
    const byEmail = await prisma.user.findFirst({ where: { email: d.email } });
    if (byEmail) {
      return res.status(409).json({ success: false, field: 'email', message: 'Email is already registered.' });
    }

    // Check GSTIN uniqueness — only relevant if a GSTIN was actually provided.
    // gstin is encrypted at rest (random IV per row), so equality lookups go
    // through the deterministic blind-index hash column instead.
    if (d.gstin) {
      const byGstin = await prisma.user.findFirst({ where: { gstinHash: blindIndex(d.gstin.toUpperCase()) } });
      if (byGstin) {
        return res.status(409).json({ success: false, field: 'gstin', message: 'GSTIN already exists. Each company can only register once.' });
      }
    }

    // Check mobile uniqueness — same blind-index pattern as GSTIN above.
    const byMobile = await prisma.user.findFirst({ where: { mobileHash: blindIndex(d.mobile) } });
    if (byMobile) {
      return res.status(409).json({ success: false, field: 'mobile', message: 'Mobile number is already registered.' });
    }

    // Check company name uniqueness
    const byCompanyName = await prisma.user.findFirst({ where: { companyName: d.companyName } });
    if (byCompanyName) {
      return res.status(409).json({ success: false, field: 'companyName', message: 'Company is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(d.password, 12);

    // profileComplete reflects whether the optional company-profile fields were filled in,
    // not just that registration succeeded.
    const profileComplete = Boolean(
      d.gstin && d.addressLine1 && d.city && d.district && d.state && d.pincode
    );

    const user = await prisma.user.create({
      data: {
        companyName:     d.companyName,
        username:        d.username,
        email:           d.email,
        mobile:          encryptIfPresent(d.mobile),
        mobileHash:      blindIndex(d.mobile),
        password:        hashedPassword,
        role:            'admin',
        status:          'pending',
        forcePasswordChange: false,
        gstin:           d.gstin ? encryptIfPresent(d.gstin.toUpperCase()) : null,
        gstinHash:       d.gstin ? blindIndex(d.gstin.toUpperCase()) : null,
        addressLine1:    encryptIfPresent(d.addressLine1),
        addressLine2:    encryptIfPresent(d.addressLine2),
        city:            encryptIfPresent(d.city),
        district:        encryptIfPresent(d.district),
        state:           encryptIfPresent(d.state),
        pincode:         encryptIfPresent(d.pincode),
        country:         d.country || 'India',
        panNumber:       d.panNumber ? encryptIfPresent(d.panNumber.toUpperCase()) : null,
        panNumberHash:   d.panNumber ? blindIndex(d.panNumber.toUpperCase()) : null,
        profileComplete,
      },
    });

    await auditLog(
  user.id,
  'registration',
  `New: ${d.username} — ${d.companyName}${d.gstin ? ' — GSTIN provided' : ' — GSTIN not provided'}`,
  req
);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending Super Admin approval.',
    });
  } catch (err: any) {
    // Prisma unique constraint — catch-all (race-condition safety net; the
    // explicit pre-checks above should normally catch duplicates first).
    if (err.code === 'P2002') {
      const rawField = err.meta?.target?.[0] || 'field';
      // gstin/mobile/panNumber are encrypted, so their DB-level uniqueness
      // constraint lives on the blind-index hash column, not the plaintext
      // field name. Map it back so the API/frontend still sees 'gstin', not 'gstin_hash'.
      const hashFieldMap: Record<string, string> = {
        gstin_hash: 'gstin',
        mobile_hash: 'mobile',
        pan_number_hash: 'panNumber',
      };
      const field = hashFieldMap[rawField] || rawField;
      const messages: Record<string, string> = {
        email:       'Email is already registered.',
        username:    'Username is already taken.',
        gstin:       'GSTIN already exists.',
        mobile:      'Mobile number is already registered.',
        panNumber:   'PAN number is already registered.',
        companyName: 'Company is already registered.',
        company_name:'Company is already registered.',
      };
      return res.status(409).json({ success: false, field, message: messages[field] || `${field} already exists.` });
    }
    next(err);
  }
}

// ── Refresh Token ──────────────────────────────────────────────
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token.' });

    let payload;
    try { payload = verifyRefreshToken(token); }
    catch { return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' }); }

    const storedToken = await prisma.refreshToken.findFirst({
      where: { token, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!storedToken) return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });

    const accessToken = signAccessToken({ userId: user.id, role: user.role, companyName: user.companyName });
    res.json({ success: true, accessToken });
  } catch (err) { next(err); }
}

// ── Logout ─────────────────────────────────────────────────────
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      await prisma.refreshToken.updateMany({ where: { token }, data: { revokedAt: new Date() } });
    }
    if (req.user) await auditLog(req.user.userId, 'logout', 'User logged out', req);
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) { next(err); }
}

// ── Change Password ────────────────────────────────────────────
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || 'Validation failed.';
      return res.status(400).json({ success: false, message: msg });
    }

    const { currentPassword, newPassword } = parsed.data;
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed, forcePasswordChange: false } });
    await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await auditLog(userId, 'password_change', 'Password changed', req);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) { next(err); }
}

// ── Get Me ─────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json(buildUserResponse(user));
  } catch (err) { next(err); }
}

// ── Update Company Profile ─────────────────────────────────────
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const firstField = Object.keys(errors)[0];
      const firstMsg   = (errors as any)[firstField]?.[0] || 'Validation failed.';
      return res.status(400).json({ success: false, field: firstField, message: firstMsg });
    }

    const d = parsed.data;

    // Check GSTIN not taken by another user (blind-index lookup — see register()).
    const gstinConflict = await prisma.user.findFirst({
      where: { gstinHash: blindIndex(d.gstin.toUpperCase()), NOT: { id: userId } },
    });
    if (gstinConflict) {
      return res.status(409).json({ success: false, field: 'gstin', message: 'GSTIN is already registered to another account.' });
    }

    // Check email not taken by another user
    const emailConflict = await prisma.user.findFirst({
      where: { email: d.email, NOT: { id: userId } },
    });
    if (emailConflict) {
      return res.status(409).json({ success: false, field: 'email', message: 'Email is already registered to another account.' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        companyName:     d.companyName,
        email:           d.email,
        mobile:          encryptIfPresent(d.mobile),
        mobileHash:      blindIndex(d.mobile),
        gstin:           encryptIfPresent(d.gstin.toUpperCase()),
        gstinHash:       blindIndex(d.gstin.toUpperCase()),
        addressLine1:    encryptIfPresent(d.addressLine1),
        addressLine2:    encryptIfPresent(d.addressLine2),
        city:            encryptIfPresent(d.city),
        district:        encryptIfPresent(d.district),
        state:           encryptIfPresent(d.state),
        pincode:         encryptIfPresent(d.pincode),
        country:         d.country || 'India',
        panNumber:       d.panNumber ? encryptIfPresent(d.panNumber.toUpperCase()) : null,
        panNumberHash:   d.panNumber ? blindIndex(d.panNumber.toUpperCase()) : null,
        profileComplete: true,
      },
    });

    await auditLog(userId, 'profile_update', 'Company profile updated', req);
    res.json({ success: true, message: 'Profile updated successfully.', user: buildUserResponse(user) });
  } catch (err: any) {
    if (err.code === 'P2002') {
      const rawField = err.meta?.target?.[0] || 'field';
      const hashFieldMap: Record<string, string> = {
        gstin_hash: 'gstin',
        mobile_hash: 'mobile',
        pan_number_hash: 'panNumber',
      };
      const field = hashFieldMap[rawField] || rawField;
      return res.status(409).json({ success: false, field, message: `${field} already exists.` });
    }
    next(err);
  }
}