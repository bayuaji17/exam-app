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
    attemptLimit: integer("attemptLimit"),
    /** The per-schedule introduction (TipTap doc, INTRODUCTION_POLICY). */
    introduction: jsonb("introduction"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("exam_schedule_packageId_idx").on(table.packageId),
    index("exam_schedule_startsAt_idx").on(table.startsAt),
  ]
)

export const attempt = pgTable(
  "attempt",
  {
    id: text("id").primaryKey(),
    scheduleId: text("scheduleId")
      .notNull()
      .references(() => examSchedule.id, { onDelete: "restrict" }),
    participantId: text("participantId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startedAt: timestamp("startedAt", { withTimezone: true }).notNull().defaultNow(),
    deadlineAt: timestamp("deadlineAt", { withTimezone: true }),
    submittedAt: timestamp("submittedAt", { withTimezone: true }),
    /** The question order snapshot: an array of question ids. */
    questionOrder: jsonb("questionOrder").notNull(),
    score: numeric("score", { precision: 8, scale: 2 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("attempt_scheduleId_idx").on(table.scheduleId),
    index("attempt_participantId_idx").on(table.participantId),
    index("attempt_scheduleId_participantId_idx").on(
      table.scheduleId,
      table.participantId
    ),
  ]
)

export const attemptAnswer = pgTable(
  "attempt_answer",
  {
    id: text("id").primaryKey(),
    attemptId: text("attemptId")
      .notNull()
      .references(() => attempt.id, { onDelete: "cascade" }),
    questionId: text("questionId")
      .notNull()
      .references(() => question.id, { onDelete: "restrict" }),
    /** { chosenOptionId: string | null } for single/scored, { text: string } for manual. */
    answer: jsonb("answer").notNull(),
    autoScore: numeric("autoScore", { precision: 8, scale: 2 }),
    /** The manual grade for a manual question, bounded by its weight. */
    manualScore: numeric("manualScore", { precision: 8, scale: 2 }),
    gradedBy: text("gradedBy").references(() => user.id),
    gradedAt: timestamp("gradedAt"),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("attempt_answer_attemptId_idx").on(table.attemptId),
    index("attempt_answer_questionId_idx").on(table.questionId),
    uniqueIndex("attempt_answer_attemptId_questionId_idx").on(
      table.attemptId,
      table.questionId
    ),
  ]
)

export const participantGroup = pgTable(
  "participant_group",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [index("participant_group_lower_name_idx").on(sql`lower(${table.name})`)]
)

export const participantImport = pgTable(
  "participant_import",
  {
    id: text("id").primaryKey(),
    adminId: text("adminId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    fileName: text("fileName").notNull(),
    total: integer("total").notNull().default(0),
    created: integer("created").notNull().default(0),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("participant_import_adminId_idx").on(table.adminId),
    index("participant_import_createdAt_idx").on(table.createdAt),
  ]
)

export const participantGroupMember = pgTable(
  "participant_group_member",
  {
    id: text("id").primaryKey(),
    groupId: text("groupId")
      .notNull()
      .references(() => participantGroup.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("participant_group_member_groupId_idx").on(table.groupId),
    index("participant_group_member_userId_idx").on(table.userId),
    uniqueIndex("participant_group_member_groupId_userId_idx").on(
      table.groupId,
      table.userId
    ),
  ]
)

export const scheduleUserEligibility = pgTable(
  "schedule_user_eligibility",
  {
    id: text("id").primaryKey(),
    scheduleId: text("scheduleId")
      .notNull()
      .references(() => examSchedule.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("schedule_user_eligibility_scheduleId_idx").on(table.scheduleId),
    index("schedule_user_eligibility_userId_idx").on(table.userId),
    uniqueIndex("schedule_user_eligibility_scheduleId_userId_idx").on(
      table.scheduleId,
      table.userId
    ),
  ]
)

export const scheduleGroupEligibility = pgTable(
  "schedule_group_eligibility",
  {
    id: text("id").primaryKey(),
    scheduleId: text("scheduleId")
      .notNull()
      .references(() => examSchedule.id, { onDelete: "cascade" }),
    groupId: text("groupId")
      .notNull()
      .references(() => participantGroup.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("schedule_group_eligibility_scheduleId_idx").on(table.scheduleId),
    index("schedule_group_eligibility_groupId_idx").on(table.groupId),
    uniqueIndex("schedule_group_eligibility_scheduleId_groupId_idx").on(
      table.scheduleId,
      table.groupId
    ),
  ]
)
