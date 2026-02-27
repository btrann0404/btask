import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBlocks, KanbanBlock, KanbanCol } from '@/store/blocks';

const C = {
  bg:      '#080808',
  card:    '#101010',
  card2:   '#161616',
  text:    '#E2E2E2',
  textSec: '#5A5A5A',
  textDim: '#2A2A2A',
  border:  '#181818',
  white:   '#E2E2E2',
};

const COLS: { key: KanbanCol; label: string }[] = [
  { key: 'todo',        label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
];

function TaskCard({ task, blockId, currentCol }: {
  task: { id: string; title: string; column: KanbanCol };
  blockId: string;
  currentCol: KanbanCol;
}) {
  const { moveKanbanTask } = useBlocks();
  const [open, setOpen] = useState(false);
  const others = COLS.filter((c) => c.key !== currentCol);

  return (
    <View style={S.taskCard}>
      <Pressable onLongPress={() => setOpen((v) => !v)}>
        <Text style={S.taskText}>{task.title}</Text>
      </Pressable>
      {open && (
        <View style={S.moveMenu}>
          <Text style={S.moveMenuLabel}>Move to</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {others.map((col) => (
              <TouchableOpacity
                key={col.key}
                style={S.moveBtn}
                onPress={() => { moveKanbanTask(blockId, task.id, col.key); setOpen(false); }}
              >
                <Text style={S.moveBtnText}>{col.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Column({ col, block }: { col: typeof COLS[number]; block: KanbanBlock }) {
  const { addKanbanTask } = useBlocks();
  const [inputOpen, setInputOpen] = useState(false);
  const [text, setText] = useState('');
  const tasks = block.tasks.filter((t) => t.column === col.key);

  const handleAdd = () => {
    const title = text.trim();
    if (!title) return;
    addKanbanTask(block.id, title, col.key);
    setText('');
    setInputOpen(false);
  };

  return (
    <View style={S.column}>
      <View style={S.colHeader}>
        <Text style={S.colLabel}>{col.label}</Text>
        <Text style={S.colCount}>{tasks.length}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} blockId={block.id} currentCol={col.key} />
        ))}
        {tasks.length === 0 && !inputOpen && (
          <Text style={S.empty}>—</Text>
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
        <TouchableOpacity style={S.addTask} onPress={() => setInputOpen(true)}>
          <Ionicons name="add" size={13} color={C.textDim} />
          <Text style={S.addTaskText}>Add task</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function KanbanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { blocks } = useBlocks();
  const block = blocks.find((b) => b.id === id && b.type === 'kanban') as KanbanBlock | undefined;

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
              {done}/{block.tasks.length} complete · long-press to move
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.board}>
          {COLS.map((col) => <Column key={col.key} col={col} block={block} />)}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
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
  },
  taskText: { fontSize: 13, color: C.text, lineHeight: 19 },
  moveMenu: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
  moveMenuLabel: { fontSize: 9, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1 },
  moveBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  moveBtnText: { fontSize: 11, color: C.textSec },

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
