import { db } from "../db/client";
import { blocks as blocksTable, tasks as tasksTable, reminders as remindersTable } from "../db/schema";
import { eq } from "drizzle-orm";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Weight = "low" | "medium" | "high";
export type KanbanCol = "todo" | "in_progress" | "done";

export type SimpleTask = { id: string; title: string; completed: boolean };
export type KanbanTask = { id: string; title: string; column: KanbanCol };

export type SimpleBlock = {
  id: string;
  name: string;
  icon: string;
  type: "simple";
  weight: Weight;
  tasks: SimpleTask[];
};
export type KanbanBlock = {
  id: string;
  name: string;
  icon: string;
  type: "kanban";
  weight: Weight;
  tasks: KanbanTask[];
};
export type Block = SimpleBlock | KanbanBlock;

export type Reminder = {
  id: string;
  text: string;
  completed: boolean;
  weight: Weight;
  date: string; // YYYY-MM-DD
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_BLOCKS: Block[] = [
  {
    id: "1",
    name: "Gym",
    icon: "💪",
    type: "simple",
    weight: "high",
    tasks: [
      { id: "t1", title: "Morning workout", completed: false },
      { id: "t2", title: "Stretch & cool down", completed: false },
      { id: "t3", title: "Log workout", completed: true },
    ],
  },
  {
    id: "2",
    name: "Hydration",
    icon: "💧",
    type: "simple",
    weight: "medium",
    tasks: [
      { id: "t4", title: "Drink 8 glasses", completed: true },
      { id: "t5", title: "Morning lemon water", completed: true },
    ],
  },
  {
    id: "3",
    name: "Job Search",
    icon: "💼",
    type: "kanban",
    weight: "high",
    tasks: [
      { id: "t6", title: "Apply to 3 companies", column: "todo" },
      { id: "t7", title: "Update LinkedIn", column: "in_progress" },
      { id: "t8", title: "Research target companies", column: "done" },
      { id: "t9", title: "Prepare portfolio", column: "todo" },
    ],
  },
  {
    id: "4",
    name: "Technical Work",
    icon: "💻",
    type: "kanban",
    weight: "high",
    tasks: [
      { id: "t10", title: "Build MVP", column: "in_progress" },
      { id: "t11", title: "Review PRs", column: "todo" },
      { id: "t12", title: "Write tests", column: "todo" },
      { id: "t13", title: "Fix bug #42", column: "done" },
    ],
  },
];

function today() {
  return new Date().toISOString().split("T")[0];
}

const INITIAL_REMINDERS: Reminder[] = [
  {
    id: "r1",
    text: "Call mom back",
    completed: false,
    weight: "high",
    date: today(),
  },
  {
    id: "r2",
    text: "Buy groceries",
    completed: false,
    weight: "low",
    date: today(),
  },
];

// ─── Block Presets ────────────────────────────────────────────────────────────

export type BlockPreset = {
  name: string;
  icon: string;
  type: "simple" | "kanban";
  weight: Weight;
};

export const DEFAULT_PRESETS: BlockPreset[] = [
  { name: "Gym", icon: "💪", type: "simple", weight: "medium" },
  { name: "Study", icon: "📚", type: "simple", weight: "medium" },
  { name: "Work", icon: "💼", type: "kanban", weight: "medium" },
];

// ─── Sorting ──────────────────────────────────────────────────────────────────

const W = { high: 3, medium: 2, low: 1 };

export function isBlockDone(b: Block): boolean {
  if (b.tasks.length === 0) return false;
  if (b.type === "simple")
    return (b as SimpleBlock).tasks.every((t) => t.completed);
  return (b as KanbanBlock).tasks.every((t) => t.column === "done");
}

export type ListItem =
  | { kind: "block"; data: Block }
  | { kind: "reminder"; data: Reminder };

export function buildSortedList(
  blocks: Block[],
  reminders: Reminder[],
): ListItem[] {
  const items: ListItem[] = [
    ...blocks.map((b) => ({ kind: "block" as const, data: b })),
    ...reminders.map((r) => ({ kind: "reminder" as const, data: r })),
  ];
  return items.sort((a, b) => {
    const aDone =
      a.kind === "block"
        ? isBlockDone(a.data as Block)
        : (a.data as Reminder).completed;
    const bDone =
      b.kind === "block"
        ? isBlockDone(b.data as Block)
        : (b.data as Reminder).completed;
    if (aDone !== bDone) return aDone ? 1 : -1;
    return W[b.data.weight] - W[a.data.weight];
  });
}

// ─── Context ──────────────────────────────────────────────────────────────────

type BlocksCtx = {
  blocks: Block[];
  reminders: Reminder[];
  userPresets: BlockPreset[];
  calDate: string;
  toggleSimpleTask: (blockId: string, taskId: string) => void;
  moveKanbanTask: (blockId: string, taskId: string, col: KanbanCol) => void;
  addKanbanTask: (blockId: string, title: string, col: KanbanCol) => void;
  addBlock: (preset: BlockPreset) => void;
  removeBlock: (blockId: string) => void;
  reorderBlock: (blockId: string, direction: "up" | "down") => void;
  updateBlockWeight: (blockId: string, weight: Weight) => void;
  addReminder: (text: string, weight: Weight, date: string) => void;
  toggleReminder: (id: string) => void;
  removeReminder: (id: string) => void;
  updateReminder: (id: string, text: string) => void;
  addUserPreset: (preset: BlockPreset) => void;
  setCalDate: (date: string) => void;
};

const Ctx = createContext<BlocksCtx | null>(null);
let _nextId = 200;
const nextId = () => String(++_nextId);

export function BlocksProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [userPresets, setUserPresets] = useState<BlockPreset[]>([]);
  const [calDate, setCalDate] = useState<string>(today());

  const toggleSimpleTask = (blockId: string, taskId: string) => {
    const block = blocks.find((b) => b.id === blockId) as SimpleBlock;
    const task = block.tasks.find((t) => t.id == taskId) as SimpleTask;
    db.update(tasksTable)
      .set({ completed: !task.completed })
      .where(eq(tasksTable.id, Number(taskId)));

    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.type !== "simple") return b;
        return {
          ...b,
          tasks: (b as SimpleBlock).tasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t,
          ),
        };
      }),
    );
  };

  const moveKanbanTask = (blockId: string, taskId: string, col: KanbanCol) => {
    const block = blocks.find((b) => b.id === blockId) as KanbanBlock;
    const task = block.tasks.find((t) => t.id === taskId) as KanbanTask;
    db.update(tasksTable)
      .set({ kanbanColumn: col })
      .where(eq(tasksTable.id, Number(taskId)));
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.type !== "kanban") return b;
        return {
          ...b,
          tasks: (b as KanbanBlock).tasks.map((t) =>
            t.id === taskId ? { ...t, column: col } : t,
          ),
        };
      }),
    );
  };

  const addKanbanTask = (blockId: string, title: string, col: KanbanCol) => {
    const row = db
      .insert(tasksTable)
      .values({ blockId: Number(blockId), title: title, kanbanColumn: col })
      .returning()
      .get();
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId || b.type !== "kanban") return b;
        return {
          ...b,
          tasks: [
            ...(b as KanbanBlock).tasks,
            { id: String(row.id), title, column: col },
          ],
        };
      }),
    );
  };
  const addBlock = (preset: BlockPreset) => {
    const row = db.insert(blocksTable).values(preset).returning().get();
    const newBlock: Block = {
      id: String(row.id),
      name: row.name,
      icon: row.icon,
      type: row.type,
      weight: row.weight,
      tasks: [],
    } as Block;
    setBlocks((prev) => [...prev, newBlock]);
  };

  const removeBlock = (blockId: string) => {
    db.delete(blocksTable).where(eq(blocksTable.id, Number(blockId)));
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const reorderBlock = (blockId: string, direction: "up" | "down") =>
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });

  const updateBlockWeight = (blockId: string, weight: Weight) => {
    db.update(blocksTable).set({ weight }).where(eq(blocksTable.id, Number(blockId)));
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, weight } : b)),
    );
  };

  const addReminder = (text: string, weight: Weight, date: string) => {
    const row = db.insert(remindersTable).values({ text, weight, date }).returning().get();
    setReminders((prev) => [
      ...prev,
      { id: String(row.id), text, completed: false, weight, date },
    ]);
  };

  const toggleReminder = (id: string) => {
    const reminder = reminders.find((r) => r.id === id)!;
    db.update(remindersTable).set({ completed: !reminder.completed }).where(eq(remindersTable.id, Number(id)));
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)),
    );
  };

  const removeReminder = (id: string) => {
    db.delete(remindersTable).where(eq(remindersTable.id, Number(id)));
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const updateReminder = (id: string, text: string) => {
    db.update(remindersTable).set({ text }).where(eq(remindersTable.id, Number(id)));
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, text } : r)));
  };

  const addUserPreset = (preset: BlockPreset) =>
    setUserPresets((prev) => [...prev, preset]);

  useEffect(() => {
    const allBlocks = db.select().from(blocksTable).all();
    const allTasks = db.select().from(tasksTable).all();

    const tasksByBlockId: Record<number, typeof allTasks> = {};
    for (const task of allTasks) {
      if (!tasksByBlockId[task.blockId]) {
        tasksByBlockId[task.blockId] = [];
      }
      tasksByBlockId[task.blockId].push(task);
    }

    const assembled: Block[] = allBlocks.map((block) => ({
      id: String(block.id),
      name: block.name,
      icon: block.icon,
      type: block.type,
      weight: block.weight,
      tasks: (tasksByBlockId[block.id] || []).map((t) =>
        block.type === "simple"
          ? { id: String(t.id), title: t.title, completed: t.completed }
          : {
              id: String(t.id),
              title: t.title,
              column: t.kanbanColumn ?? "todo",
            },
      ),
    })) as Block[];

    setBlocks(assembled);

    const allReminders = db.select().from(remindersTable).all();
    setReminders(
      allReminders.map((r) => ({
        id: String(r.id),
        text: r.text,
        completed: r.completed,
        weight: r.weight,
        date: r.date,
      })),
    );
  }, []);

  return (
    <Ctx.Provider
      value={{
        blocks,
        reminders,
        userPresets,
        calDate,
        toggleSimpleTask,
        moveKanbanTask,
        addKanbanTask,
        addBlock,
        removeBlock,
        reorderBlock,
        updateBlockWeight,
        addReminder,
        toggleReminder,
        removeReminder,
        updateReminder,
        addUserPreset,
        setCalDate,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useBlocks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBlocks must be inside BlocksProvider");
  return ctx;
}
