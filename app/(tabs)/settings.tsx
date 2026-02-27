import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView,
  StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBlocks, Block, Weight } from '@/store/blocks';

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

const WEIGHTS: Weight[] = ['low', 'medium', 'high'];
const WEIGHT_LABELS: Record<Weight, string> = { low: 'Low', medium: 'Med', high: 'High' };

function WeightPill({ value, active, onPress }: { value: Weight; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[S.weightPill, active && { backgroundColor: C.green, borderColor: C.green }]}
    >
      <Text style={[S.weightPillText, active && { color: '#080808', fontWeight: '700' }]}>
        {WEIGHT_LABELS[value]}
      </Text>
    </TouchableOpacity>
  );
}

function BlockItem({ block, index, total }: { block: Block; index: number; total: number }) {
  const { reorderBlock, updateBlockWeight, removeBlock } = useBlocks();

  const confirmDelete = () =>
    Alert.alert('Remove block?', `"${block.name}" and all its tasks will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeBlock(block.id) },
    ]);

  return (
    <View style={S.blockItem}>
      {/* Reorder arrows */}
      <View style={S.reorderCol}>
        <TouchableOpacity
          onPress={() => reorderBlock(block.id, 'up')}
          style={[S.arrowBtn, index === 0 && { opacity: 0.15 }]}
          disabled={index === 0}
        >
          <Ionicons name="chevron-up" size={14} color={C.textSec} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => reorderBlock(block.id, 'down')}
          style={[S.arrowBtn, index === total - 1 && { opacity: 0.15 }]}
          disabled={index === total - 1}
        >
          <Ionicons name="chevron-down" size={14} color={C.textSec} />
        </TouchableOpacity>
      </View>

      {/* Icon + name + type */}
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18 }}>{block.icon}</Text>
          <Text style={S.blockName}>{block.name}</Text>
          <View style={S.typePill}>
            <Text style={S.typePillText}>{block.type === 'simple' ? 'checklist' : 'board'}</Text>
          </View>
        </View>

        {/* Weight selector */}
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
          <Text style={S.weightLabel}>Priority</Text>
          {WEIGHTS.map((w) => (
            <WeightPill
              key={w}
              value={w}
              active={block.weight === w}
              onPress={() => updateBlockWeight(block.id, w)}
            />
          ))}
        </View>
      </View>

      {/* Delete */}
      <TouchableOpacity onPress={confirmDelete} style={S.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={14} color={C.textDim} />
      </TouchableOpacity>
    </View>
  );
}

type SortMode = 'priority' | 'easy';

export default function SettingsScreen() {
  const { blocks } = useBlocks();
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={S.title}>Settings</Text>

        {/* ── Blocks ── */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionLabel}>Blocks</Text>
          <Text style={S.sectionHint}>Drag priority up/down · tap weight to adjust</Text>
        </View>
        <View style={S.card}>
          {blocks.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 13, color: C.textDim, textAlign: 'center' }}>No blocks yet</Text>
            </View>
          ) : (
            blocks.map((block, i) => (
              <View key={block.id}>
                <BlockItem block={block} index={i} total={blocks.length} />
                {i < blocks.length - 1 && <View style={S.divider} />}
              </View>
            ))
          )}
        </View>

        {/* ── Preferences ── */}
        <Text style={[S.sectionLabel, { marginTop: 4 }]}>Sort Mode</Text>
        <View style={S.card}>
          <View style={{ padding: 4 }}>
            <Text style={S.preferenceHint}>How blocks are ordered on the home screen</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {([
                { key: 'priority', label: 'Priority first', desc: 'High weight blocks appear on top' },
                { key: 'easy',     label: 'Easy first',     desc: 'Fewest tasks appear on top' },
              ] as { key: SortMode; label: string; desc: string }[]).map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setSortMode(opt.key)}
                  style={[S.sortCard, sortMode === opt.key && S.sortCardActive]}
                >
                  <View style={[S.sortRadio, sortMode === opt.key && S.sortRadioActive]}>
                    {sortMode === opt.key && <View style={S.sortRadioDot} />}
                  </View>
                  <Text style={[S.sortCardLabel, sortMode === opt.key && { color: C.text }]}>{opt.label}</Text>
                  <Text style={S.sortCardDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Account ── */}
        <Text style={[S.sectionLabel, { marginTop: 4 }]}>Account</Text>
        <View style={S.card}>
          {[
            { label: 'Name', value: 'Brandon' },
            { label: 'Timezone', value: timezone },
            { label: 'Day resets at', value: '4:00 AM' },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[S.row, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
            >
              <Text style={S.rowLabel}>{row.label}</Text>
              <Text style={S.rowValue} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ── About ── */}
        <Text style={[S.sectionLabel, { marginTop: 4 }]}>About</Text>
        <View style={S.card}>
          {[
            { label: 'App', value: 'BTask' },
            { label: 'Version', value: '0.1.0 MVP' },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[S.row, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
            >
              <Text style={S.rowLabel}>{row.label}</Text>
              <Text style={S.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 24, letterSpacing: -1 },

  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  sectionLabel: { fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  sectionHint: { fontSize: 10, color: C.textDim },

  card: {
    backgroundColor: C.card, borderRadius: 14, marginBottom: 20,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 14 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14 },
  rowLabel: { fontSize: 14, color: C.text },
  rowValue: { fontSize: 13, color: C.textSec, maxWidth: '55%', textAlign: 'right' },

  // Block item
  blockItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10 },
  reorderCol: { alignItems: 'center', gap: 2 },
  arrowBtn: {
    width: 28, height: 28, borderRadius: 7,
    backgroundColor: C.card2,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  blockName: { fontSize: 14, fontWeight: '600', color: C.text },
  typePill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
    backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
  },
  typePillText: { fontSize: 9, color: C.textSec, textTransform: 'uppercase', letterSpacing: 0.8 },

  weightLabel: { fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1, marginRight: 4, alignSelf: 'center' },
  weightPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: C.border,
  },
  weightPillText: { fontSize: 11, color: C.textSec },

  deleteBtn: { padding: 6 },

  // Sort cards
  preferenceHint: { fontSize: 12, color: C.textDim, paddingHorizontal: 6, paddingTop: 8 },
  sortCard: {
    flex: 1, padding: 12, borderRadius: 10,
    backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
    gap: 6,
  },
  sortCardActive: { borderColor: C.green },
  sortRadio: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1.5, borderColor: C.textDim,
    alignItems: 'center', justifyContent: 'center',
  },
  sortRadioActive: { borderColor: C.green },
  sortRadioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  sortCardLabel: { fontSize: 12, fontWeight: '600', color: C.textSec },
  sortCardDesc: { fontSize: 10, color: C.textDim, lineHeight: 14 },
});
