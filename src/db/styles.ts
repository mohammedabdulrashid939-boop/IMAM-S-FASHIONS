import { eq, and, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { fashionStyles, profiles } from './schema.ts';

export async function getPublishedStylesByCategory(category: 'men' | 'women') {
  try {
    return await db
      .select()
      .from(fashionStyles)
      .where(
        and(
          eq(fashionStyles.category, category),
          eq(fashionStyles.isPublished, true)
        )
      )
      .orderBy(desc(fashionStyles.createdAt));
  } catch (error) {
    console.error('Database query failed in getPublishedStylesByCategory:', error);
    throw new Error('Failed to load fashion styles. Please try again later.', { cause: error });
  }
}

export async function getAllStylesForAdmin(category?: 'men' | 'women') {
  try {
    if (category) {
      return await db
        .select()
        .from(fashionStyles)
        .where(eq(fashionStyles.category, category))
        .orderBy(desc(fashionStyles.createdAt));
    }
    return await db
      .select()
      .from(fashionStyles)
      .orderBy(desc(fashionStyles.createdAt));
  } catch (error) {
    console.error('Database query failed in getAllStylesForAdmin:', error);
    throw new Error('Failed to fetch fashion styles for management.', { cause: error });
  }
}

export async function getStyleById(id: number) {
  try {
    const rows = await db
      .select()
      .from(fashionStyles)
      .where(eq(fashionStyles.id, id));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getStyleById:', error);
    throw new Error('Failed to locate fashion style.', { cause: error });
  }
}

export async function createFashionStyle(input: {
  title: string;
  description: string;
  category: 'men' | 'women';
  imageUrl: string;
  storagePath: string;
  isPublished?: boolean;
}) {
  try {
    const inserted = await db
      .insert(fashionStyles)
      .values({
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        imageUrl: input.imageUrl,
        storagePath: input.storagePath,
        isPublished: input.isPublished !== undefined ? input.isPublished : true,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createFashionStyle:', error);
    throw new Error('Failed to save new fashion style.', { cause: error });
  }
}

export async function updateFashionStyle(
  id: number,
  updates: {
    title?: string;
    description?: string;
    category?: 'men' | 'women';
    imageUrl?: string;
    storagePath?: string;
    isPublished?: boolean;
  }
) {
  try {
    const payload: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.imageUrl !== undefined) payload.imageUrl = updates.imageUrl;
    if (updates.storagePath !== undefined) payload.storagePath = updates.storagePath;
    if (updates.isPublished !== undefined) payload.isPublished = updates.isPublished;

    const updated = await db
      .update(fashionStyles)
      .set(payload)
      .where(eq(fashionStyles.id, id))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error('Database query failed in updateFashionStyle:', error);
    throw new Error('Failed to update fashion style.', { cause: error });
  }
}

export async function deleteFashionStyleById(id: number) {
  try {
    const deleted = await db
      .delete(fashionStyles)
      .where(eq(fashionStyles.id, id))
      .returning();
    return deleted[0] || null;
  } catch (error) {
    console.error('Database query failed in deleteFashionStyleById:', error);
    throw new Error('Failed to delete fashion style.', { cause: error });
  }
}

export async function getDashboardStatistics() {
  try {
    const allUsers = await db.select().from(profiles);
    const allStyles = await db.select().from(fashionStyles);

    const totalUsers = allUsers.length;
    const totalMensStyles = allStyles.filter((s) => s.category === 'men').length;
    const totalWomensStyles = allStyles.filter((s) => s.category === 'women').length;
    const totalPublishedStyles = allStyles.filter((s) => s.isPublished).length;

    return {
      totalUsers,
      totalMensStyles,
      totalWomensStyles,
      totalPublishedStyles,
    };
  } catch (error) {
    console.error('Database query failed in getDashboardStatistics:', error);
    throw new Error('Failed to load dashboard statistics.', { cause: error });
  }
}
