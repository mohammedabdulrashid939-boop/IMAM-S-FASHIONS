import crypto from 'crypto';
import { eq, desc, asc } from 'drizzle-orm';
import { db } from './index.ts';
import { users, profiles, userRoles } from './schema.ts';

const FOUNDER_EMAIL = 'mohammedabdulrashid939@gmail.com';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  fullName = '',
  phoneNumber = '',
  forceAdmin = false
) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const displayName = fullName.trim() || cleanEmail.split('@')[0];

    const upsertedUsers = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        fullName: displayName,
        phoneNumber: phoneNumber.trim(),
        accountStatus: 'Active',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
        },
      })
      .returning();

    const userRecord = upsertedUsers[0];

    const upsertedProfiles = await db
      .insert(profiles)
      .values({
        userId: userRecord.id,
        uid: userRecord.uid,
        fullName: userRecord.fullName || displayName,
        email: cleanEmail,
        phoneNumber: userRecord.phoneNumber || phoneNumber.trim(),
        accountStatus: userRecord.accountStatus,
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: {
          email: cleanEmail,
        },
      })
      .returning();

    const shouldBeAdmin = forceAdmin || cleanEmail === FOUNDER_EMAIL;

    const existingRole = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.uid, userRecord.uid));

    let roleValue = existingRole[0]?.role || (shouldBeAdmin ? 'admin' : 'customer');
    if (shouldBeAdmin && roleValue !== 'admin') {
      roleValue = 'admin';
    }

    await db
      .insert(userRoles)
      .values({
        userId: userRecord.id,
        uid: userRecord.uid,
        role: roleValue,
      })
      .onConflictDoUpdate({
        target: userRoles.uid,
        set: {
          role: roleValue,
        },
      });

    return {
      user: userRecord,
      profile: upsertedProfiles[0],
      role: roleValue,
    };
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function registerUserWithPassword(
  email: string,
  password: string,
  fullName: string,
  phoneNumber: string,
  asAdmin = false
) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    if (existing.length > 0) {
      throw new Error('An account with this email address already exists.');
    }

    const uid = `usr_${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);

    const insertedUsers = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        passwordHash,
        accountStatus: 'Active',
      })
      .returning();

    const userRecord = insertedUsers[0];

    const insertedProfiles = await db
      .insert(profiles)
      .values({
        userId: userRecord.id,
        uid: userRecord.uid,
        fullName: fullName.trim(),
        email: cleanEmail,
        phoneNumber: phoneNumber.trim(),
        accountStatus: 'Active',
      })
      .returning();

    const roleValue = asAdmin || cleanEmail === FOUNDER_EMAIL ? 'admin' : 'customer';

    await db
      .insert(userRoles)
      .values({
        userId: userRecord.id,
        uid: userRecord.uid,
        role: roleValue,
      });

    return {
      user: userRecord,
      profile: insertedProfiles[0],
      role: roleValue,
    };
  } catch (error: any) {
    console.error('Database query failed in registerUserWithPassword:', error);
    throw new Error(error.message || 'Registration failed. Please try again.', { cause: error });
  }
}

export async function authenticateUserWithPassword(email: string, password: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    if (found.length === 0) {
      return null;
    }

    const userRecord = found[0];
    if (!verifyPassword(password, userRecord.passwordHash)) {
      return null;
    }

    const profileRows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.uid, userRecord.uid));

    const roleRows = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.uid, userRecord.uid));

    return {
      user: userRecord,
      profile: profileRows[0] || null,
      role: roleRows[0]?.role || 'customer',
    };
  } catch (error) {
    console.error('Database query failed in authenticateUserWithPassword:', error);
    throw new Error('Authentication query failed.', { cause: error });
  }
}

export async function hasAnyAdminAccount(): Promise<boolean> {
  try {
    const admins = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.role, 'admin'));
    return admins.length > 0;
  } catch (error) {
    console.error('Database query failed in hasAnyAdminAccount:', error);
    throw new Error('Failed to check administrator accounts.', { cause: error });
  }
}

export async function promoteOrSetupAdminWithPassword(
  email: string,
  password: string,
  fullName = 'Mohammed Abdul Rashid'
) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    const passwordHash = hashPassword(password);

    if (existing.length > 0) {
      const userRecord = existing[0];
      await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, userRecord.id));

      await db
        .insert(userRoles)
        .values({
          userId: userRecord.id,
          uid: userRecord.uid,
          role: 'admin',
        })
        .onConflictDoUpdate({
          target: userRoles.uid,
          set: { role: 'admin' },
        });

      const profileRows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.uid, userRecord.uid));

      return {
        user: userRecord,
        profile: profileRows[0] || null,
        role: 'admin',
      };
    }

    return await registerUserWithPassword(
      cleanEmail,
      password,
      fullName,
      '0245198198',
      true
    );
  } catch (error) {
    console.error('Database query failed in promoteOrSetupAdminWithPassword:', error);
    throw new Error('Failed to configure administrator account.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Failed to load user record.', { cause: error });
  }
}

export async function getProfileByUid(uid: string) {
  try {
    const rows = await db.select().from(profiles).where(eq(profiles.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getProfileByUid:', error);
    throw new Error('Failed to load user profile.', { cause: error });
  }
}

export async function isUserAdmin(uid: string): Promise<boolean> {
  try {
    const rows = await db.select().from(userRoles).where(eq(userRoles.uid, uid));
    return rows[0]?.role === 'admin';
  } catch (error) {
    console.error('Database query failed in isUserAdmin:', error);
    throw new Error('Failed to verify administrator permissions.', { cause: error });
  }
}

export async function getAllCustomerProfiles(sortOrder: 'newest' | 'oldest' = 'newest') {
  try {
    const rows = await db
      .select({
        id: profiles.id,
        uid: profiles.uid,
        fullName: profiles.fullName,
        email: profiles.email,
        phoneNumber: profiles.phoneNumber,
        accountStatus: profiles.accountStatus,
        createdAt: profiles.createdAt,
        role: userRoles.role,
      })
      .from(profiles)
      .leftJoin(userRoles, eq(profiles.uid, userRoles.uid))
      .orderBy(sortOrder === 'newest' ? desc(profiles.createdAt) : asc(profiles.createdAt));

    return rows;
  } catch (error) {
    console.error('Database query failed in getAllCustomerProfiles:', error);
    throw new Error('Failed to fetch registered users.', { cause: error });
  }
}

export async function updateCustomerProfile(
  uid: string,
  updates: { fullName?: string; phoneNumber?: string; accountStatus?: string }
) {
  try {
    const setValues: Record<string, string> = {};
    if (updates.fullName !== undefined) setValues.fullName = updates.fullName.trim();
    if (updates.phoneNumber !== undefined) setValues.phoneNumber = updates.phoneNumber.trim();
    if (updates.accountStatus !== undefined) setValues.accountStatus = updates.accountStatus;

    await db.update(users).set(setValues).where(eq(users.uid, uid));
    const updated = await db
      .update(profiles)
      .set(setValues)
      .where(eq(profiles.uid, uid))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error('Database query failed in updateCustomerProfile:', error);
    throw new Error('Failed to update user profile.', { cause: error });
  }
}

export async function updateUserPassword(uid: string, newPassword: string) {
  try {
    const passwordHash = hashPassword(newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.uid, uid));
    return true;
  } catch (error) {
    console.error('Database query failed in updateUserPassword:', error);
    throw new Error('Failed to update password.', { cause: error });
  }
}

export async function updateUserRoleByAdmin(uid: string, role: 'admin' | 'customer') {
  try {
    const updated = await db
      .update(userRoles)
      .set({ role })
      .where(eq(userRoles.uid, uid))
      .returning();
    return updated[0] || null;
  } catch (error) {
    console.error('Database query failed in updateUserRoleByAdmin:', error);
    throw new Error('Failed to update user role.', { cause: error });
  }
}
