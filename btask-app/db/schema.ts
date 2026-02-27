import { boolean } from "drizzle-orm/gel-core";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const blocks = sqliteTable("blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("📋"),
  type: text("type", { enum: ["simple", "kanban"] })
    .notNull()
    .default("simple"),
  weight: text("weight", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blockId: integer("block_id")
    .notNull()
    .references(() => blocks.id),
  title: text("title").notNull(),
  completed: integer("is_completed", { mode: "boolean" })
    .notNull()
    .default(false),
  kanbanColumn: text("kanban_column", { enum: ["todo", "in_progress", "done"] })
    .notNull()
    .default("todo"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  completed: integer("is_completed", { mode: "boolean" })
    .default(false)
    .notNull(),
  weight: text("weight", { enum: ["low", "medium", "high"] })
    .notNull()
    .default("medium"),
  date: text("date").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
