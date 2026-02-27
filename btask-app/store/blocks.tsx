import React, { createContext, useContext, useState, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Weight = 'low' | 'medium' | 'high';
export type KanbanCol = 'todo' | 'in_progress' | 'done';

export type SimpleTask = { id: string; title: string; completed: boolean };
export type KanbanTask = { id: string; title: string; column: KanbanCol };

export type SimpleBlock = {
  id: string; name: string; icon: string;
  type: 'simple'; weight: Weight; tasks: SimpleTask[];
};
export type KanbanBlock = {
  id: string; name: string; icon: string;
  type: 'kanban'; weight: Weight; tasks: KanbanTask[];
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
    id: '1', name: 'Gym', icon: '💪', type: 'simple', weight: 'high',
    tasks: [
      { id: 't1', title: 'Morning workout', completed: false },
      { id: 't2', title: 'Stretch & cool down', completed: false },
      { id: 't3', title: 'Log workout', completed: true },
    ],
  },
  {
    id: '2', name: 'Hydration', icon: '💧', type: 'simple', weight: 'medium',
    tasks: [
      { id: 't4', title: 'Drink 8 glasses', completed: true },
      { id: 't5', title: 'Morning lemon water', completed: true },
    ],
  },
  {
    id: '3', name: 'Job Search', icon: '💼', type: 'kanban', weight: 'high',
    tasks: [
      { id: 't6', title: 'Apply to 3 companies', column: 'todo' },
      { id: 't7', title: 'Update LinkedIn', column: 'in_progress' },
      { id: 't8', title: 'Research target companies', column: 'done' },
      { id: 't9', title: 'Prepare portfolio', column: 'todo' },
    ],
  },
  {
    id: '4', name: 'Technical Work', icon: '💻', type: 'kanban', weight: 'high',
    tasks: [
      { id: 't10', title: 'Build MVP', column: 'in_progress' },
      { id: 't11', title: 'Review PRs', column: 'todo' },
      { id: 't12', title: 'Write tests', column: 'todo' },
      { id: 't13', title: 'Fix bug #42', column: 'done' },
    ],
  },
];

function today() {
  return new Date().toISOString().split('T')[0];
}

const INITIAL_REMINDERS: Reminder[] = [
  { id: 'r1', text: 'Call mom back', completed: false, weight: 'high', date: today() },
  { id: 'r2', text: 'Buy groceries', completed: false, weight: 'low',  date: today() },
];

// ─── Block Presets ────────────────────────────────────────────────────────────

export type BlockPreset = {
  name: string; icon: string;
  type: 'simple' | 'kanban'; weight: Weight;
};

export const DEFAULT_PRESETS: BlockPreset[] = [
  { name: 'Gym',      icon: '💪', type: 'simple', weight: 'medium' },
  { name: 'Study',    icon: '📚', type: 'simple', weight: 'medium' },
  { name: 'Work',     icon: '💼', type: 'kanban', weight: 'medium' },
];

// ─── Sorting ──────────────────────────────────────────────────────────────────

const W = { high: 3, medium: 2, low: 1 };

export function isBlockDone(b: Block): boolean {
  if (b.tasks.length === 0) return false;
  if (b.type === 'simple') return (b as SimpleBlock).tasks.every((t) => t.completed);
  return (b as KanbanBlock).tasks.every((t) => t.column === 'done');
}

export type ListItem =
  | { kind: 'block'; data: Block }
  | { kind: 'reminder'; data: Reminder };

export function buildSortedList(blocks: Block[], reminders: Reminder[]): ListItem[] {
  const items: ListItem[] = [
    ...blocks.map((b) => ({ kind: 'block' as const, data: b })),
    ...reminders.map((r) => ({ kind: 'reminder' as const, data: r })),
  ];
  return items.sort((a, b) => {
    const aDone = a.kind === 'block' ? isBlockDone(a.data as Block) : (a.data as Reminder).completed;
    const bDone = b.kind === 'block' ? isBlockDone(b.data as Block) : (b.data as Reminder).completed;
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
  reorderBlock: (blockId: string, direction: 'up' | 'down') => void;
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
  const [blocks, setBlocks] = useState<Block[]>(INITIAL_BLOCKS);
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [userPresets, setUserPresets] = useState<BlockPreset[]>([]);
  const [calDate, setCalDate] = useState<string>(today());

  const toggleSimpleTask = (blockId: string, taskId: string) =>
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId || b.type !== 'simple') return b;
      return { ...b, tasks: (b as SimpleBlock).tasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t) };
    }));

  const moveKanbanTask = (blockId: string, taskId: string, col: KanbanCol) =>
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId || b.type !== 'kanban') return b;
      return { ...b, tasks: (b as KanbanBlock).tasks.map((t) => t.id === taskId ? { ...t, column: col } : t) };
    }));

  const addKanbanTask = (blockId: string, title: string, col: KanbanCol) =>
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId || b.type !== 'kanban') return b;
      return { ...b, tasks: [...(b as KanbanBlock).tasks, { id: nextId(), title, column: col }] };
    }));

  const addBlock = (preset: BlockPreset) => {
    const newBlock: Block = { ...preset, id: nextId(), tasks: [] } as Block;
    setBlocks((prev) => [...prev, newBlock]);
  };

  const removeBlock = (blockId: string) =>
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));

  const reorderBlock = (blockId: string, direction: 'up' | 'down') =>
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });

  const updateBlockWeight = (blockId: string, weight: Weight) =>
    setBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, weight } : b));

  const addReminder = (text: string, weight: Weight, date: string) =>
    setReminders((prev) => [...prev, { id: nextId(), text, completed: false, weight, date }]);

  const toggleReminder = (id: string) =>
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, completed: !r.completed } : r));

  const removeReminder = (id: string) =>
    setReminders((prev) => prev.filter((r) => r.id !== id));

  const updateReminder = (id: string, text: string) =>
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, text } : r));

  const addUserPreset = (preset: BlockPreset) =>
    setUserPresets((prev) => [...prev, preset]);

  return (
    <Ctx.Provider value={{
      blocks, reminders, userPresets, calDate,
      toggleSimpleTask, moveKanbanTask, addKanbanTask,
      addBlock, removeBlock, reorderBlock, updateBlockWeight,
      addReminder, toggleReminder, removeReminder, updateReminder,
      addUserPreset, setCalDate,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBlocks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBlocks must be inside BlocksProvider');
  return ctx;
}
