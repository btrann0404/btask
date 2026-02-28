import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  PanResponder, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBlocks, KanbanBlock, KanbanTask, KanbanCol } from '@/store/blocks';

const C = {
  bg:      '#080808',
  card:    '#101010',
  card2:   '#161616',
  text:    '#E2E2E2',
  textSec: '#5A5A5A',
  textDim: '#2A2A2A',
  border:  '#181818',
  green:   '#3DD68C',
};

const COLS: { key: KanbanCol; label: string }[] = [
  { key: 'todo',        label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
];

const TASK_H = 46; // approximate height per task card incl margin

// ─── Drag types ───────────────────────────────────────────────────────────────

type DragState = {
  task: KanbanTask;
  targetCol: KanbanCol;
  insertIndex: number; // index within targetCol where task will be inserted
};

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task, isDragging,
  onDragStart, onDragMove, onDragEnd,
}: {
  task: KanbanTask;
  isDragging: boolean;
  onDragStart: (task: KanbanTask, px: number, py: number) => void;
  onDragMove: (px: number, py: number) => void;
  onDragEnd: (px: number, py: number) => void;
}) {
  const inDrag = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { pageX, pageY } = e.nativeEvent;
      inDrag.current = false;
      longPressTimer.current = setTimeout(() => {
        inDrag.current = true;
        onDragStart(task, pageX, pageY);
      }, 280);
    },
    onPanResponderMove: (e, gs) => {
      if (inDrag.current) {
        onDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY);
      } else if (Math.abs(gs.dx) > 6 || Math.abs(gs.dy) > 6) {
        clearTimeout(longPressTimer.current);
      }
    },
    onPanResponderRelease: (e) => {
      clearTimeout(longPressTimer.current);
      if (inDrag.current) {
        onDragEnd(e.nativeEvent.pageX, e.nativeEvent.pageY);
        inDrag.current = false;
      }
    },
    onPanResponderTerminate: () => {
      clearTimeout(longPressTimer.current);
      if (inDrag.current) {
        onDragEnd(-1, -1);
        inDrag.current = false;
      }
    },
  })).current;

  return (
    <View style={[S.taskCard, isDragging && S.taskCardDragging]} {...pan.panHandlers}>
      <Text style={S.taskText}>{task.title}</Text>
      <Ionicons name="reorder-three-outline" size={16} color={C.textDim} style={{ marginTop: 1 }} />
    </View>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  col, block, dragging,
  onDragStart, onDragMove, onDragEnd,
  onLayoutX, onColPageY,
}: {
  col: typeof COLS[number];
  block: KanbanBlock;
  dragging: DragState | null;
  onDragStart: (task: KanbanTask, px: number, py: number) => void;
  onDragMove: (px: number, py: number) => void;
  onDragEnd: (px: number, py: number) => void;
  onLayoutX: (key: KanbanCol, x: number) => void;
  onColPageY: (key: KanbanCol, pageY: number) => void;
}) {
  const { addKanbanTask } = useBlocks();
  const [inputOpen, setInputOpen] = useState(false);
  const [text, setText] = useState('');
  const colRef = useRef<View>(null);
  const tasks = block.tasks.filter((t) => t.column === col.key);
  const isTarget = dragging !== null && dragging.targetCol === col.key;
  const isDropTarget = isTarget && dragging!.task.column !== col.key;

  const handleAdd = () => {
    const title = text.trim();
    if (!title) return;
    addKanbanTask(block.id, title, col.key);
    setText('');
    setInputOpen(false);
  };

  const measureColY = () => {
    colRef.current?.measure((_x, _y, _w, _h, _px, py) => {
      onColPageY(col.key, py);
    });
  };

  // Render tasks with optional insertion line for intra-column reorder
  const renderTasks = () => {
    const items: React.ReactNode[] = [];
    tasks.forEach((task, idx) => {
      // Show insertion line ABOVE this task if needed
      if (
        isTarget &&
        !isDropTarget && // same column drag
        dragging!.insertIndex === idx &&
        dragging!.task.id !== task.id
      ) {
        items.push(<View key={`line-${idx}`} style={S.insertLine} />);
      }
      items.push(
        <TaskCard
          key={task.id}
          task={task}
          isDragging={dragging?.task.id === task.id}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
        />,
      );
    });
    // Insertion line at end
    if (
      isTarget &&
      !isDropTarget &&
      dragging!.insertIndex >= tasks.length &&
      tasks.length > 0
    ) {
      items.push(<View key="line-end" style={S.insertLine} />);
    }
    return items;
  };

  return (
    <View
      ref={colRef}
      style={[S.column, isDropTarget && S.columnTarget]}
      onLayout={(e) => {
        onLayoutX(col.key, e.nativeEvent.layout.x);
        measureColY();
      }}
    >
      <View style={S.colHeader}>
        <Text style={[S.colLabel, isDropTarget && { color: C.green }]}>{col.label}</Text>
        <Text style={S.colCount}>{tasks.length}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} scrollEnabled={!dragging}>
        {renderTasks()}
        {tasks.length === 0 && !inputOpen && !isDropTarget && (
          <Text style={S.empty}>—</Text>
        )}
        {isDropTarget && (
          <View style={S.dropZone}>
            <Ionicons name="add-circle-outline" size={16} color={C.green} />
            <Text style={S.dropZoneText}>Drop here</Text>
          </View>
        )}
      </ScrollView>

      {inputOpen ? (
        <View style={S.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Task name"
            placeholderTextColor={C.textDim}
            style={S.input}
            autoFocus
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <TouchableOpacity style={S.confirmBtn} onPress={handleAdd}>
              <Text style={S.confirmText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.cancelBtn} onPress={() => { setText(''); setInputOpen(false); }}>
              <Text style={S.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={S.addTask}
          onPress={() => setInputOpen(true)}
          disabled={!!dragging}
        >
          <Ionicons name="add" size={13} color={C.textDim} />
          <Text style={S.addTaskText}>Add task</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function KanbanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { blocks, moveKanbanTask, reorderKanbanTask } = useBlocks();
  const block = blocks.find((b) => b.id === id && b.type === 'kanban') as KanbanBlock | undefined;

  // Drag state
  const [dragging, setDragging] = useState<DragState | null>(null);
  const draggingRef = useRef<DragState | null>(null);
  const ghostX = useRef(new Animated.Value(0)).current;
  const ghostY = useRef(new Animated.Value(0)).current;

  // Column layout tracking
  const colLayouts = useRef<Record<KanbanCol, number>>({ todo: 16, in_progress: 326, done: 636 });
  const colPageYs = useRef<Record<KanbanCol, number>>({ todo: 0, in_progress: 0, done: 0 });
  const boardPageX = useRef(0);
  const scrollXRef = useRef(0);
  const boardViewRef = useRef<View>(null);

  const getTargetCol = useCallback((pageX: number): KanbanCol => {
    const localX = pageX - boardPageX.current + scrollXRef.current;
    const distances = COLS.map((c) => ({
      key: c.key,
      dist: Math.abs(localX - (colLayouts.current[c.key] + 150)),
    }));
    distances.sort((a, b) => a.dist - b.dist);
    return distances[0].key;
  }, []);

  const getInsertIndex = useCallback((pageY: number, col: KanbanCol, taskCount: number): number => {
    // colPageY is the top of the column card. Account for header (~50px) and padding (14px)
    const relY = pageY - colPageYs.current[col] - 64;
    const idx = Math.round(relY / TASK_H);
    return Math.max(0, Math.min(taskCount, idx));
  }, []);

  const handleDragStart = useCallback((task: KanbanTask, px: number, py: number) => {
    ghostX.setValue(px - 150);
    ghostY.setValue(py - 30);
    const state: DragState = { task, targetCol: task.column, insertIndex: 0 };
    draggingRef.current = state;
    setDragging(state);
  }, [ghostX, ghostY]);

  const handleDragMove = useCallback((px: number, py: number) => {
    ghostX.setValue(px - 150);
    ghostY.setValue(py - 30);
    const col = getTargetCol(px);
    setDragging((prev) => {
      if (!prev || !block) return null;
      const colTasks = block.tasks.filter((t) => t.column === col);
      const insertIndex = getInsertIndex(py, col, colTasks.length);
      if (prev.targetCol === col && prev.insertIndex === insertIndex) return prev;
      const next = { ...prev, targetCol: col, insertIndex };
      draggingRef.current = next;
      return next;
    });
  }, [ghostX, ghostY, getTargetCol, getInsertIndex, block]);

  const handleDragEnd = useCallback((px: number, py: number) => {
    const state = draggingRef.current;
    if (state && px >= 0 && block) {
      const col = getTargetCol(px);
      if (col !== state.task.column) {
        // Move to different column
        moveKanbanTask(block.id, state.task.id, col);
      } else {
        // Reorder within same column
        const colTasks = block.tasks.filter((t) => t.column === col);
        const insertIndex = getInsertIndex(py, col, colTasks.length);
        const fromIdx = colTasks.findIndex((t) => t.id === state.task.id);
        // Adjust target index: after removing fromIdx, effective target may shift
        const adjustedIndex = insertIndex > fromIdx ? insertIndex - 1 : insertIndex;
        if (adjustedIndex !== fromIdx) {
          reorderKanbanTask(block.id, state.task.id, adjustedIndex);
        }
      }
    }
    draggingRef.current = null;
    setDragging(null);
  }, [block, getTargetCol, getInsertIndex, moveKanbanTask, reorderKanbanTask]);

  const handleColLayoutX = useCallback((key: KanbanCol, x: number) => {
    colLayouts.current[key] = x;
  }, []);

  const handleColPageY = useCallback((key: KanbanCol, pageY: number) => {
    colPageYs.current[key] = pageY;
  }, []);

  if (!block) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textSec }}>Not found</Text>
      </SafeAreaView>
    );
  }

  const done = block.tasks.filter((t) => t.column === 'done').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
            <Ionicons name="chevron-back" size={18} color={C.textSec} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={S.headerIcon}>{block.icon}</Text>
              <Text style={S.headerTitle}>{block.name}</Text>
            </View>
            <Text style={S.headerSub}>
              {done}/{block.tasks.length} complete · hold & drag to move
            </Text>
          </View>
        </View>

        {/* Board */}
        <View
          ref={boardViewRef}
          onLayout={() => {
            boardViewRef.current?.measure((_x, _y, _w, _h, px) => {
              boardPageX.current = px;
            });
          }}
          style={{ flex: 1 }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.board}
            scrollEnabled={!dragging}
            onScroll={(e) => { scrollXRef.current = e.nativeEvent.contentOffset.x; }}
            scrollEventThrottle={16}
          >
            {COLS.map((col) => (
              <Column
                key={col.key}
                col={col}
                block={block}
                dragging={dragging}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onLayoutX={handleColLayoutX}
                onColPageY={handleColPageY}
              />
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Drag ghost — floats above everything */}
      {dragging && (
        <Animated.View
          pointerEvents="none"
          style={[
            S.taskCard,
            S.ghostCard,
            { transform: [{ translateX: ghostX }, { translateY: ghostY }] },
          ]}
        >
          <Text style={S.taskText}>{dragging.task.title}</Text>
          <Ionicons name="reorder-three-outline" size={16} color={C.textDim} style={{ marginTop: 1 }} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  headerIcon: { fontSize: 18 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 11, color: C.textDim, marginTop: 2 },

  board: { padding: 16, gap: 10, alignItems: 'flex-start' },
  column: {
    width: 300,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: 520,
  },
  columnTarget: {
    borderColor: C.green,
    backgroundColor: '#0A1A0F',
  },
  colHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  colLabel: { fontSize: 11, fontWeight: '600', color: C.textSec, textTransform: 'uppercase', letterSpacing: 1.2 },
  colCount: { fontSize: 11, color: C.textDim },
  empty: { fontSize: 12, color: C.textDim, textAlign: 'center', paddingVertical: 12 },

  taskCard: {
    backgroundColor: C.card2,
    borderRadius: 9,
    padding: 11,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  taskCardDragging: {
    opacity: 0.2,
    borderStyle: 'dashed',
  },
  taskText: { fontSize: 13, color: C.text, lineHeight: 19, flex: 1 },

  insertLine: {
    height: 2,
    backgroundColor: C.green,
    borderRadius: 1,
    marginBottom: 6,
    marginHorizontal: 2,
  },

  ghostCard: {
    position: 'absolute',
    width: 280,
    opacity: 0.95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20,
    borderColor: C.green,
    zIndex: 999,
  },

  dropZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.green,
    borderStyle: 'dashed',
    marginBottom: 6,
  },
  dropZoneText: { fontSize: 12, color: C.green },

  addTask: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, marginTop: 4 },
  addTaskText: { fontSize: 11, color: C.textDim },
  inputWrap: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  input: {
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  confirmBtn: { backgroundColor: '#3DD68C', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  confirmText: { fontSize: 12, color: '#080808', fontWeight: '600' },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  cancelText: { fontSize: 12, color: C.textSec },
});
