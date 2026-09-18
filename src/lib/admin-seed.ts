import bcrypt from "bcryptjs";
import { db } from "./db";
import { seedAchievements } from "./profile";

const ADMIN_NAME = "Administrator";

let _seeded = false;

/**
 * Ensures a default admin account exists, but only when ADMIN_EMAIL and
 * ADMIN_PASSWORD are set in the environment — there is no built-in fallback
 * account. Idempotent and safe to call on every server boot: it only creates
 * the account if missing and never overwrites an existing admin's password.
 */
export async function ensureAdminAccount() {
  if (_seeded) return;
  _seeded = true;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.warn(
      "[admin-seed] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin account seed."
    );
    return;
  }

  try {
    const existing = await db.user.findUnique({
      where: { email: adminEmail },
    });
    if (existing) {
      // promote to admin if somehow not yet
      if (existing.role !== "ADMIN") {
        await db.user.update({
          where: { id: existing.id },
          data: { role: "ADMIN" },
        });
      }
      return;
    }
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = await db.user.create({
      data: { email: adminEmail, name: ADMIN_NAME, passwordHash, role: "ADMIN" },
    });
    const profile = await db.userProfile.create({
      data: { userId: admin.id, name: ADMIN_NAME },
    });
    await seedAchievements(profile.id);
  } catch (e) {
    // Don't crash the app if seeding fails (e.g. race on boot)
    console.error("[admin-seed] failed:", e);
    _seeded = false;
  }
}
