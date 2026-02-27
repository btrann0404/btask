import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView, ScrollView,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBlocks, Reminder } from '@/store/blocks';

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

const W: Record<string, number> = { high: 3, medium: 2, low: 1 };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarScreen() {
  const router = useRouter();
  const { reminders, addReminder, toggleReminder, removeReminder, updateReminder, calDate, setCalDate } = useBlocks();

  const todayStr = new Date().toISOString().split('T')[0];
  const [viewYear, setViewYear] = useState(() => new Date(calDate + 'T00:00:00').getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date(calDate + 'T00:00:00').getMonth());
  const [localSelected, setLocalSelected] = useState(calDate);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const reminderDates = useMemo(() => new Set(reminders.map((r) => r.date)), [reminders]);

  const dayReminders = useMemo(
    () => [...reminders.filter((r) => r.date === localSelected)]
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return W[b.weight] - W[a.weight];
      }),
    [reminders, localSelected]
  );

  const handleSelectDate = (date: string) => {
    setLocalSelected(date);
    setCalDate(date);
  };

  const handleAdd = () => {
    const t = newText.trim();
    if (!t) return;
    addReminder(t, 'medium', localSelected);
    setNewText('');
  };

  const startEdit = (r: Reminder) => { setEditingId(r.id); setEditText(r.text); };
  const commitEdit = () => {
    if (editingId && editText.trim()) updateReminder(editingId, editText.trim());
    setEditingId(null); setEditText('');
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedLabel = new Date(localSelected + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={S.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
            <Ionicons name="chevron-down" size={18} color={C.textSec} />
          </TouchableOpacity>
          <View style={S.monthNav}>
            <TouchableOpacity onPress={prevMonth} hitSlop={14}>
              <Ionicons name="chevron-back" size={16} color={C.textSec} />
            </TouchableOpacity>
            <Text style={S.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={14}>
              <Ionicons name="chevron-forward" size={16} color={C.textSec} />
            </TouchableOpacity>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={S.scroll}
        >
          {/* Day headers */}
          <View style={S.dayHeaders}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <Text key={d} style={S.dayHeader}>{d}</Text>
            ))}
          </View>

          {/* Grid */}
          {chunk(cells, 7).map((week, wi) => (
            <View key={wi} style={S.week}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={S.dayCell} />;
                const mm = String(viewMonth + 1).padStart(2, '0');
                const dd = String(day).padStart(2, '0');
                const dateStr = `${viewYear}-${mm}-${dd}`;
                const isSelected = dateStr === localSelected;
                const isToday = dateStr === todayStr;
                const hasDot = reminderDates.has(dateStr);
                return (
                  <TouchableOpacity
                    key={di}
                    style={S.dayCell}
                    onPress={() => handleSelectDate(dateStr)}
                    activeOpacity={0.6}
                  >
                    <View style={[
                      S.dayNum,
                      isSelected && S.dayNumSelected,
                      !isSelected && isToday && S.dayNumToday,
                    ]}>
                      <Text style={[
                        S.dayText,
                        isSelected && S.dayTextSelected,
                        !isSelected && isToday && S.dayTextToday,
                      ]}>
                        {day}
                      </Text>
                    </View>
                    {hasDot ? <View style={S.dot} /> : <View style={{ height: 4 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Divider */}
          <View style={S.divider} />

          {/* Selected day section */}
          <Text style={S.dayTitle}>{selectedLabel}</Text>

          {dayReminders.map((r) => (
            <View key={r.id} style={S.reminderRow}>
              <TouchableOpacity
                onPress={() => toggleReminder(r.id)}
                style={[S.checkbox, r.completed && S.checkboxDone]}
              >
                {r.completed && <Ionicons name="checkmark" size={10} color={C.bg} />}
              </TouchableOpacity>
              {editingId === r.id ? (
                <TextInput
                  style={S.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  onBlur={commitEdit}
                  onSubmitEditing={commitEdit}
                  autoFocus
                  returnKeyType="done"
                />
              ) : (
                <TouchableOpacity style={{ flex: 1 }} onPress={() => startEdit(r)} activeOpacity={0.7}>
                  <Text style={[S.reminderText, r.completed && S.reminderDone]}>{r.text}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => removeReminder(r.id)} hitSlop={8}>
                <Ionicons name="close" size={13} color={C.textDim} />
              </TouchableOpacity>
            </View>
          ))}

          {dayReminders.length === 0 && (
            <Text style={S.emptyText}>Nothing here yet.</Text>
          )}
        </ScrollView>

        {/* Add input */}
        <View style={S.addRow}>
          <TextInput
            style={S.addInput}
            value={newText}
            onChangeText={setNewText}
            placeholder="Add a reminder..."
            placeholderTextColor={C.textDim}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity onPress={handleAdd} style={S.addBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={C.bg} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  monthLabel: { fontSize: 15, fontWeight: '600', color: C.text, letterSpacing: -0.3 },

  scroll: { padding: 16, paddingBottom: 16 },

  dayHeaders: { flexDirection: 'row', marginBottom: 4 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 10, color: C.textDim, fontWeight: '500' },

  week: { flexDirection: 'row', marginBottom: 2 },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayNum: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  dayNumSelected: { backgroundColor: C.text },
  dayNumToday: { borderWidth: 1, borderColor: C.border },
  dayText: { fontSize: 14, color: C.textSec },
  dayTextSelected: { color: C.bg, fontWeight: '700' },
  dayTextToday: { color: C.text, fontWeight: '600' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.green, marginTop: 2 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },
  dayTitle: { fontSize: 13, fontWeight: '600', color: C.textSec, marginBottom: 14, letterSpacing: -0.2 },

  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 5,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: C.green, borderColor: C.green },
  reminderText: { fontSize: 14, color: C.text },
  reminderDone: { color: C.textDim, textDecorationLine: 'line-through' },
  editInput: {
    flex: 1, fontSize: 14, color: C.text,
    borderBottomWidth: 1, borderBottomColor: C.green,
    paddingVertical: 2,
  },
  emptyText: { fontSize: 13, color: C.textDim, paddingTop: 4 },

  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, borderTopWidth: 1, borderTopColor: C.border,
  },
  addInput: {
    flex: 1, backgroundColor: C.card2, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: C.text,
    borderWidth: 1, borderColor: C.border,
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
});
