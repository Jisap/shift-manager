import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const localInterval = v.object({
  start: v.string(),
  end: v.string(),
});

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
    locale: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
    preferences: v.optional(
      v.record(v.string(), v.union(v.string(), v.number(), v.boolean())),
    ),
  }).index("email", ["email"]),

  shiftTypes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    description: v.optional(v.string()),
    intervals: v.array(localInterval),
    breakMinutes: v.number(),
    breakPaid: v.boolean(),
    archivedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "archivedAt"]),

  shiftPatterns: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.union(v.literal("weekly"), v.literal("rotating")),
    cycleLength: v.number(),
    anchorDate: v.string(),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "archivedAt"]),

  patternDays: defineTable({
    patternId: v.id("shiftPatterns"),
    dayIndex: v.number(),
    isRestDay: v.boolean(),
    shiftTypeId: v.optional(v.id("shiftTypes")),
  })
    .index("by_pattern", ["patternId"])
    .index("by_pattern_day", ["patternId", "dayIndex"]),

  scheduleOverrides: defineTable({
    userId: v.id("users"),
    date: v.string(),
    kind: v.union(v.literal("shift"), v.literal("rest"), v.literal("extra")),
    shiftTypeId: v.optional(v.id("shiftTypes")),
    intervals: v.optional(v.array(localInterval)),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  timeEntries: defineTable({
    userId: v.id("users"),
    date: v.string(),
    actualStart: v.number(),
    actualEnd: v.number(),
    intervals: v.optional(
      v.array(v.object({ start: v.number(), end: v.number() })),
    ),
    breakMinutes: v.number(),
    expectedMinutes: v.optional(v.number()),
    shiftTypeId: v.optional(v.id("shiftTypes")),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  holidays: defineTable({
    userId: v.id("users"),
    date: v.string(),
    name: v.string(),
    scope: v.union(
      v.literal("national"),
      v.literal("regional"),
      v.literal("local"),
      v.literal("personal"),
    ),
  }).index("by_user_date", ["userId", "date"]),

  vacationBalances: defineTable({
    userId: v.id("users"),
    year: v.number(),
    allocatedDays: v.number(),
    usedDays: v.number(),
  }).index("by_user_year", ["userId", "year"]),
});
