import bcrypt from "bcryptjs";
import { db } from "./db";
import { seedAchievements } from "./profile";

const ADMIN_EMAIL = "luth.v.admin@gmail.com";
const ADMIN_PASSWORD = "123456789";
const ADMIN_NAME = "Administrator";

let _seeded = false;

/**
 * Ensures the default admin account exists (idempotent, runs once per process).
 * Safe to call on every server boot — it only creates the account if missing
 * and never overwrites an existing admin's password.
 */
export async function ensureAdminAccount() {
  if (_seeded) return;
  _seeded = true;
  try {
    const existing = await db.user.findUnique({
      where: { email: ADMIN_EMAIL },
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
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = await db.user.create({
      data: { email: ADMIN_EMAIL, name: ADMIN_NAME, passwordHash, role: "ADMIN" },
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
