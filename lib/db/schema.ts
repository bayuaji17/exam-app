import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

import { APP_ROLES } from "@/lib/auth-roles"

export const appRole = pgEnum("app_role", [
  APP_ROLES.SUPER_ADMIN,
  APP_ROLES.ADMIN,
  APP_ROLES.USER,
])

export const questionType = pgEnum("question_type", [
  "single",
  "scored",
  "manual",
])

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("displayUsername"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  role: appRole("role").notNull().default(APP_ROLES.USER),
  banned: boolean("banned").notNull().default(false),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
})

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonatedBy"),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
)

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
)

export const questionBank = pgTable(
  "question_bank",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdBy: text("createdBy")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    archivedAt: timestamp("archivedAt"),
  },
  (table) => [
    index("question_bank_archivedAt_idx").on(table.archivedAt),
    index("question_bank_createdBy_idx").on(table.createdBy),
  ]
)

export const questionCategory = pgTable(
  "question_category",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [index("question_category_lower_name_idx").on(sql`lower(${table.name})`)]
)

export const question = pgTable(
  "question",
  {
    id: text("id").primaryKey(),
    bankId: text("bankId")
      .notNull()
      .references(() => questionBank.id, { onDelete: "restrict" }),
    type: questionType("type").notNull(),
    content: jsonb("content").notNull(),
    searchText: text("searchText").notNull(),
    categoryId: text("categoryId").references(() => questionCategory.id, {
      onDelete: "restrict",
    }),
    archivedAt: timestamp("archivedAt"),
    archivedWithBankAt: timestamp("archivedWithBankAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("question_bankId_idx").on(table.bankId),
    index("question_bankId_archivedAt_idx").on(table.bankId, table.archivedAt),
    index("question_categoryId_idx").on(table.categoryId),
    index("question_searchText_idx").on(table.searchText),
  ]
)

export const questionOption = pgTable(
  "question_option",
  {
    id: text("id").primaryKey(),
    questionId: text("questionId")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    content: jsonb("content").notNull(),
    position: integer("position").notNull(),
    isCorrect: boolean("isCorrect"),
    score: numeric("score", { precision: 8, scale: 2 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("question_option_questionId_idx").on(table.questionId),
    index("question_option_position_idx").on(table.questionId, table.position),
  ]
)

export const questionMedia = pgTable(
  "question_media",
  {
    id: text("id").primaryKey(),
    questionId: text("questionId").references(() => question.id, {
      onDelete: "set null",
    }),
    objectKey: text("objectKey").notNull().unique(),
    mime: text("mime").notNull(),
    sizeBytes: integer("sizeBytes").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    deletedAt: timestamp("deletedAt"),
  },
  (table) => [
    index("question_media_questionId_idx").on(table.questionId),
    index("question_media_deletedAt_idx").on(table.deletedAt),
  ]
)

export const examPackage = pgTable(
  "exam_package",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("durationMinutes"),
    shuffle: boolean("shuffle").notNull().default(false),
    passScore: numeric("passScore", { precision: 8, scale: 2 }),
    wrongPenalty: numeric("wrongPenalty", { precision: 8, scale: 2 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [index("exam_package_name_idx").on(table.name)]
)

export const examQuestion = pgTable(
  "exam_question",
  {
    id: text("id").primaryKey(),
    examId: text("examId")
      .notNull()
      .references(() => examPackage.id, { onDelete: "cascade" }),
    questionId: text("questionId")
      .notNull()
      .references(() => question.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    score: numeric("score", { precision: 8, scale: 2 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("exam_question_examId_idx").on(table.examId),
    index("exam_question_questionId_idx").on(table.questionId),
    uniqueIndex("exam_question_examId_questionId_idx").on(
      table.examId,
      table.questionId
    ),
  ]
)

export const examSchedule = pgTable(
  "exam_schedule",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    packageId: text("packageId")
      .notNull()
      .references(() => examPackage.id, { onDelete: "restrict" }),
    startsAt: timestamp("startsAt", { withTimezone: true }).notNull(),
    endsAt: timestamp("endsAt", { withTimezone: true }).notNull(),
    durationMinutes: integer("durationMinutes"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("exam_schedule_packageId_idx").on(table.packageId),
    index("exam_schedule_startsAt_idx").on(table.startsAt),
  ]
)
