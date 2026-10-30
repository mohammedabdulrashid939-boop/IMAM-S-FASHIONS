// Ensure HMR is disabled before Vite loads vite.config.ts
process.env.DISABLE_HMR = 'true';

import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import {
  requireAuth,
  requireAdmin,
  createSessionToken,
  extractRequestToken,
  verifySessionToken,
  AuthRequest,
} from './src/middleware/auth.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import {
  getOrCreateUser,
  registerUserWithPassword,
  authenticateUserWithPassword,
  hasAnyAdminAccount,
  promoteOrSetupAdminWithPassword,
  getProfileByUid,
  isUserAdmin,
  getAllCustomerProfiles,
  updateCustomerProfile,
  updateUserPassword,
  updateUserRoleByAdmin,
} from './src/db/users.ts';
import {
  getPublishedStylesByCategory,
  getAllStylesForAdmin,
  getStyleById,
  createFashionStyle,
  updateFashionStyle,
  deleteFashionStyleById,
  getDashboardStatistics,
} from './src/db/styles.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

function setSessionCookie(res: Response, token: string) {
  res.setHeader(
    'Set-Cookie',
    `imam_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${
      60 * 60 * 24 * 7
    }`
  );
}

function clearSessionCookie(res: Response) {
  res.setHeader(
    'Set-Cookie',
    'imam_session=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0'
  );
}

// Ensure local storage bucket directory exists for 'fashion-styles'
const STORAGE_BUCKET_ROOT = path.resolve(process.cwd(), 'public', 'storage', 'fashion-styles');
if (!fs.existsSync(STORAGE_BUCKET_ROOT)) {
  fs.mkdirSync(STORAGE_BUCKET_ROOT, { recursive: true });
}

// ============================================================================
// PUBLIC FASHION STYLES API
// ============================================================================

app.get('/api/styles', async (req, res) => {
  try {
    const category = req.query.category as string;
    if (category !== 'men' && category !== 'women') {
      return res.status(400).json({ error: "Category must be 'men' or 'women'." });
    }
    const styles = await getPublishedStylesByCategory(category);
    res.json({ styles });
  } catch (error: any) {
    console.error('Error fetching public styles:', error);
    res.status(500).json({ error: error.message || 'Failed to load fashion styles' });
  }
});

// ============================================================================
// AUTHENTICATION & CUSTOMER REGISTRATION API
// ============================================================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email address, and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const result = await registerUserWithPassword(
      String(email),
      String(password),
      String(fullName),
      String(phoneNumber || ''),
      false
    );

    const token = createSessionToken({
      uid: result.user.uid,
      email: result.user.email,
      name: result.profile.fullName,
    });

    setSessionCookie(res, token);

    res.status(201).json({
      token,
      profile: result.profile,
      role: result.role,
    });
  } catch (error: any) {
    console.error('Customer registration failed:', error);
    res.status(400).json({ error: error.message || 'Could not complete registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const authResult = await authenticateUserWithPassword(String(email), String(password));
    if (!authResult) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    if (authResult.user.accountStatus === 'Suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const token = createSessionToken({
      uid: authResult.user.uid,
      email: authResult.user.email,
      name: authResult.profile?.fullName || authResult.user.fullName || '',
    });

    setSessionCookie(res, token);

    res.json({
      token,
      profile: authResult.profile,
      role: authResult.role,
    });
  } catch (error: any) {
    console.error('Customer login failed:', error);
    res.status(500).json({ error: error.message || 'Sign in failed.' });
  }
});

app.get('/api/auth/admin-status', async (_req, res) => {
  try {
    const hasAdmin = await hasAnyAdminAccount();
    res.json({ hasAdmin });
  } catch (error: any) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Unable to check administrator setup status.' });
  }
});

app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Administrator email and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const anyAdminExists = await hasAnyAdminAccount();

    if (!anyAdminExists) {
      // First-time server-side administrative initialization
      const initialized = await promoteOrSetupAdminWithPassword(
        String(email),
        String(password),
        String(fullName || 'Mohammed Abdul Rashid')
      );

      const token = createSessionToken({
        uid: initialized.user.uid,
        email: initialized.user.email,
        name: initialized.profile?.fullName || 'Mohammed Abdul Rashid',
      });

      setSessionCookie(res, token);

      return res.json({
        token,
        profile: initialized.profile,
        role: 'admin',
        initializedFirstAdmin: true,
      });
    }

    const authResult = await authenticateUserWithPassword(String(email), String(password));
    if (!authResult) {
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    if (authResult.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. This account does not have administrator privileges.',
      });
    }

    const token = createSessionToken({
      uid: authResult.user.uid,
      email: authResult.user.email,
      name: authResult.profile?.fullName || authResult.user.fullName || '',
    });

    setSessionCookie(res, token);

    res.json({
      token,
      profile: authResult.profile,
      role: authResult.role,
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message || 'Administrator login failed.' });
  }
});

app.post('/api/auth/google-sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { phoneNumber, fullName, isAdminLoginAttempt } = req.body || {};
    const anyAdmin = await hasAnyAdminAccount();
    const forceAdmin = Boolean(isAdminLoginAttempt && !anyAdmin);

    const synced = await getOrCreateUser(
      req.user.uid,
      req.user.email,
      fullName || req.user.name || '',
      phoneNumber || '',
      forceAdmin
    );

    if (isAdminLoginAttempt && synced.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Only authorized administrator accounts can access the dashboard.',
      });
    }

    if (req.rawToken) {
      setSessionCookie(res, req.rawToken);
    }

    res.json({
      profile: synced.profile,
      role: synced.role,
    });
  } catch (error: any) {
    console.error('Google auth sync failed:', error);
    res.status(500).json({ error: error.message || 'Failed to synchronize account.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get('/api/auth/me', async (req: AuthRequest, res) => {
  try {
    const token = extractRequestToken(req);
    if (!token) {
      return res.json({ profile: null, role: null, token: null });
    }

    let uid = '';
    let email = '';
    let name = '';

    if (token.startsWith('imam.')) {
      const parsed = verifySessionToken(token);
      if (!parsed) {
        clearSessionCookie(res);
        return res.json({ profile: null, role: null, token: null });
      }
      uid = parsed.uid;
      email = parsed.email;
      name = parsed.name || '';
    } else {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
        email = decoded.email || '';
        name = decoded.name || '';
      } catch {
        clearSessionCookie(res);
        return res.json({ profile: null, role: null, token: null });
      }
    }

    let profile = await getProfileByUid(uid);
    let admin = await isUserAdmin(uid);

    if (!profile && email) {
      const synced = await getOrCreateUser(uid, email, name);
      profile = synced.profile;
      admin = synced.role === 'admin';
    }

    if (!profile || profile.accountStatus === 'Suspended') {
      return res.json({ profile: null, role: null, token: null });
    }

    res.json({
      token,
      profile,
      role: admin ? 'admin' : 'customer',
    });
  } catch (error: any) {
    console.error('Error fetching current session user:', error);
    res.json({ profile: null, role: null, token: null });
  }
});

app.put('/api/auth/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { fullName, phoneNumber } = req.body;
    const updated = await updateCustomerProfile(req.user.uid, {
      fullName,
      phoneNumber,
    });
    res.json({ profile: updated });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: error.message || 'Failed to update profile.' });
  }
});

app.put('/api/auth/password', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    await updateUserPassword(req.user.uid, String(newPassword));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: error.message || 'Failed to update password.' });
  }
});

// ============================================================================
// PROTECTED ADMINISTRATOR ROUTES
// ============================================================================

app.get('/api/admin/stats', requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const stats = await getDashboardStatistics();
    res.json(stats);
  } catch (error: any) {
    console.error('Error loading dashboard stats:', error);
    res.status(500).json({ error: error.message || 'Failed to load dashboard statistics.' });
  }
});

app.get('/api/admin/styles', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const category = req.query.category as 'men' | 'women' | undefined;
    const validCat = category === 'men' || category === 'women' ? category : undefined;
    const styles = await getAllStylesForAdmin(validCat);
    res.json({ styles });
  } catch (error: any) {
    console.error('Error loading admin styles:', error);
    res.status(500).json({ error: error.message || 'Failed to load styles.' });
  }
});

// Storage bucket upload endpoint ('fashion-styles')
app.post('/api/admin/storage/upload', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { fileName, mimeType, dataUrl, category } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'A valid image file (JPG, JPEG, PNG, or WebP) is required.' });
    }

    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (mimeType && !allowedMime.includes(String(mimeType).toLowerCase())) {
      return res.status(400).json({ error: 'Only JPG, JPEG, PNG, and WebP images are supported.' });
    }

    const catFolder = category === 'women' ? 'women' : 'men';
    const safeName = String(fileName || 'style.jpg')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const timestamp = Date.now();
    const relativePath = `${catFolder}/${timestamp}-${safeName}`;
    const storagePath = `fashion-styles/${relativePath}`;

    // Also write binary file to local bucket folder for direct static serving
    try {
      const targetDir = path.join(STORAGE_BUCKET_ROOT, catFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const base64Part = dataUrl.split(',')[1];
      if (base64Part) {
        fs.writeFileSync(path.join(targetDir, `${timestamp}-${safeName}`), Buffer.from(base64Part, 'base64'));
      }
    } catch (fsErr) {
      console.warn('Non-fatal local bucket write warning:', fsErr);
    }

    // Store dataUrl as imageUrl in PostgreSQL so images persist across stateless cloud instances without ever breaking
    res.status(201).json({
      bucket: 'fashion-styles',
      storagePath,
      imageUrl: dataUrl,
    });
  } catch (error: any) {
    console.error('Error uploading image to fashion-styles bucket:', error);
    res.status(500).json({ error: error.message || 'Image upload failed.' });
  }
});

app.post('/api/admin/styles', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, description, category, imageUrl, storagePath, isPublished } = req.body;
    if (!title || !description || !category || !imageUrl || !storagePath) {
      return res.status(400).json({
        error: 'Title, description, category, and uploaded image are required.',
      });
    }
    if (category !== 'men' && category !== 'women') {
      return res.status(400).json({ error: "Category must be 'men' or 'women'." });
    }

    const created = await createFashionStyle({
      title: String(title),
      description: String(description),
      category,
      imageUrl: String(imageUrl),
      storagePath: String(storagePath),
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    });

    res.status(201).json({ style: created });
  } catch (error: any) {
    console.error('Error creating fashion style:', error);
    res.status(500).json({ error: error.message || 'Failed to publish fashion style.' });
  }
});

app.put('/api/admin/styles/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid style ID.' });
    }

    const existing = await getStyleById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Fashion style not found.' });
    }

    const { title, description, category, imageUrl, storagePath, isPublished } = req.body;

    // If replacing image, remove old file from storage bucket when appropriate
    if (storagePath && existing.storagePath && storagePath !== existing.storagePath) {
      const relOld = existing.storagePath.replace(/^fashion-styles\//, '');
      const oldDiskPath = path.join(STORAGE_BUCKET_ROOT, relOld);
      if (fs.existsSync(oldDiskPath)) {
        try {
          fs.unlinkSync(oldDiskPath);
        } catch {
          // ignore unlink warning
        }
      }
    }

    const updated = await updateFashionStyle(id, {
      title,
      description,
      category,
      imageUrl,
      storagePath,
      isPublished,
    });

    res.json({ style: updated });
  } catch (error: any) {
    console.error('Error updating fashion style:', error);
    res.status(500).json({ error: error.message || 'Failed to update fashion style.' });
  }
});

app.delete('/api/admin/styles/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid style ID.' });
    }

    const deleted = await deleteFashionStyleById(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Fashion style not found.' });
    }

    // Remove associated file from 'fashion-styles' bucket
    if (deleted.storagePath) {
      const relPath = deleted.storagePath.replace(/^fashion-styles\//, '');
      const diskPath = path.join(STORAGE_BUCKET_ROOT, relPath);
      if (fs.existsSync(diskPath)) {
        try {
          fs.unlinkSync(diskPath);
        } catch {
          // ignore unlink warning
        }
      }
    }

    res.json({ deletedId: id, success: true });
  } catch (error: any) {
    console.error('Error deleting fashion style:', error);
    res.status(500).json({ error: error.message || 'Failed to delete fashion style.' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';
    const usersList = await getAllCustomerProfiles(sort);
    res.json({ users: usersList });
  } catch (error: any) {
    console.error('Error loading registered users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch registered users.' });
  }
});

app.put('/api/admin/users/:uid', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { uid } = req.params;
    const { accountStatus, role, fullName, phoneNumber } = req.body;

    if (accountStatus || fullName !== undefined || phoneNumber !== undefined) {
      await updateCustomerProfile(uid, {
        accountStatus,
        fullName,
        phoneNumber,
      });
    }

    if (role === 'admin' || role === 'customer') {
      await updateUserRoleByAdmin(uid, role);
    }

    const updatedProfile = await getProfileByUid(uid);
    const updatedAdmin = await isUserAdmin(uid);

    res.json({
      user: {
        ...updatedProfile,
        role: updatedAdmin ? 'admin' : 'customer',
      },
    });
  } catch (error: any) {
    console.error('Error updating user record:', error);
    res.status(500).json({ error: error.message || 'Failed to update user record.' });
  }
});

// ============================================================================
// VITE DEV MIDDLEWARE / PRODUCTION STATIC SERVING
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Imam's Fashion server running on http://localhost:${PORT}`);
  });
}

startServer();
