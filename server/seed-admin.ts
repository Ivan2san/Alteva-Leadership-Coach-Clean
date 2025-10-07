import { storage } from "./storage";

const ADMIN_USER = {
  email: "admin@leadership-coach.app",
  password: "LeaderCoach2025#Admin",
  fullName: "Admin User", 
  role: "admin" as const,
};

export async function seedAdminUser() {
  try {
    // Check if the email column exists (schema migrated)
    try {
      await storage.getUserByEmail("test@example.com");
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '42703') {
        console.log("Database schema not migrated yet. Skipping admin seeding.");
        return null;
      }
    }

    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail(ADMIN_USER.email);
    
    if (existingAdmin) {
      console.log("Admin user already exists:", ADMIN_USER.email);
      
      // Add sample 360 data if missing (for dev testing)
      if (!existingAdmin.lgp360Assessment && process.env.NODE_ENV === 'development') {
        console.log("Adding sample 360 data to admin user for testing...");
        const updatedAdmin = await storage.updateUser(existingAdmin.id, {
          lgp360Assessment: "Sample 360 Assessment: Strong strategic thinking, excellent communication skills. Areas for development: delegation and time management.",
          lgp360OriginalContent: "Sample 360 Report Content",
          lgp360UploadedAt: new Date(),
          growthProfile: ["Strategic thinker", "Strong communicator", "Collaborative leader"],
          personalValues: ["Integrity", "Innovation", "Teamwork"],
          redZones: ["Tendency to micromanage", "Difficulty delegating"],
          greenZones: ["Strategic planning", "Team building", "Communication"],
          recommendations: ["Practice delegation", "Set clearer boundaries", "Develop time management skills"],
        });
        console.log("Sample 360 data added to admin user");
        return updatedAdmin || existingAdmin;
      }
      
      return existingAdmin;
    }

    // Create admin user with proper duplicate handling
    console.log("Creating admin user...");
    const adminUser = await storage.createUser(ADMIN_USER);
    
    // Add sample 360 data for dev testing
    if (process.env.NODE_ENV === 'development') {
      console.log("Adding sample 360 data to new admin user...");
      const updatedAdmin = await storage.updateUser(adminUser.id, {
        lgp360Assessment: "Sample 360 Assessment: Strong strategic thinking, excellent communication skills. Areas for development: delegation and time management.",
        lgp360OriginalContent: "Sample 360 Report Content",
        lgp360UploadedAt: new Date(),
        growthProfile: ["Strategic thinker", "Strong communicator", "Collaborative leader"],
        personalValues: ["Integrity", "Innovation", "Teamwork"],
        redZones: ["Tendency to micromanage", "Difficulty delegating"],
        greenZones: ["Strategic planning", "Team building", "Communication"],
        recommendations: ["Practice delegation", "Set clearer boundaries", "Develop time management skills"],
      });
      console.log("Admin user created with sample 360 data:", ADMIN_USER.email);
      return updatedAdmin || adminUser;
    }
    
    console.log("Admin user created successfully:", ADMIN_USER.email);
    
    return adminUser;
  } catch (error) {
    // Handle duplicate key errors gracefully
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // Unique constraint violation - admin user already exists
        console.log("Admin user already exists (duplicate key), fetching existing user...");
        try {
          const existingAdmin = await storage.getUserByEmail(ADMIN_USER.email);
          if (existingAdmin) {
            return existingAdmin;
          }
        } catch (fetchError) {
          console.error("Error fetching existing admin user:", fetchError);
        }
      }
    }
    
    console.error("Error seeding admin user:", error);
    // Don't throw error during deployment - log and continue
    return null;
  }
}

export async function migrateExistingData(adminUserId: string) {
  try {
    console.log("Migrating existing data to admin user...");
    
    // Update conversations to belong to admin user
    const { db } = await import("./db");
    const { conversations } = await import("@shared/schema");
    const { eq, isNull } = await import("drizzle-orm");
    
    // Find conversations without userId
    const orphanedConversations = await db.select().from(conversations).where(isNull(conversations.userId));
    
    if (orphanedConversations.length > 0) {
      // Assign orphaned conversations to admin user
      await db
        .update(conversations)
        .set({ userId: adminUserId })
        .where(isNull(conversations.userId));
      
      console.log(`Migrated ${orphanedConversations.length} conversations to admin user`);
    }

    console.log("Data migration completed successfully!");
  } catch (error) {
    console.error("Error migrating existing data:", error);
    // Don't throw error during background initialization
  }
}

// Auto-run seeding if called directly
// DISABLED FOR PRODUCTION: This check might be causing issues in bundled environments
// if (import.meta.url === `file://${process.argv[1]}`) {
//   seedAdminUser()
//     .then((adminUser) => {
//       if (adminUser) {
//         return migrateExistingData(adminUser.id);
//       }
//     })
//     .then(() => {
//       process.exit(0);
//     })
//     .catch((error) => {
//       console.error("Seeding failed:", error);
//       process.exit(1);
//     });
// }