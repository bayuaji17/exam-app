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
