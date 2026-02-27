import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBlocks, BlockPreset, DEFAULT_PRESETS } from '@/store/blocks';

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

export default function AddBlockScreen() {
  const router = useRouter();
  const { addBlock, userPresets, addUserPreset } = useBlocks();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📋');
  const [type, setType] = useState<'simple' | 'kanban'>('simple');

  const allPresets = [...DEFAULT_PRESETS, ...userPresets];

  const handleAdd = () => {
    if (!name.trim()) return;
    addBlock({ name: name.trim(), icon, type, weight: 'medium' });
    router.back();
  };

  const applyPreset = (p: BlockPreset) => {
    setName(p.name);
    setIcon(p.icon);
    setType(p.type);
  };

  const handleSavePreset = () => {
    if (!name.trim()) return;
    addUserPreset({ name: name.trim(), icon, type, weight: 'medium' });
  };

  return (
    <SafeAreaView style={S.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
            <Ionicons name="chevron-down" size={18} color={C.textSec} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>New block</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={S.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Emoji + Name */}
          <View style={S.nameRow}>
            <TextInput
              value={icon}
              onChangeText={(t) => { if (t) setIcon(t.slice(-2)); }}
              style={S.iconInput}
              maxLength={2}
              textAlign="center"
            />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Block name"
              placeholderTextColor={C.textDim}
              style={S.nameInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
          </View>

          {/* Type */}
          <Text style={S.sectionLabel}>Type</Text>
          <View style={S.typeRow}>
            <TouchableOpacity
              style={[S.typeCard, type === 'simple' && S.typeCardActive]}
              onPress={() => setType('simple')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={type === 'simple' ? C.bg : C.textSec}
              />
              <Text style={[S.typeTitle, type === 'simple' && S.typeTitleActive]}>
                Checklist
              </Text>
              <Text style={[S.typeSub, type === 'simple' && S.typeSubActive]}>
                Daily habits
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.typeCard, type === 'kanban' && S.typeCardActive]}
              onPress={() => setType('kanban')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={type === 'kanban' ? C.bg : C.textSec}
              />
              <Text style={[S.typeTitle, type === 'kanban' && S.typeTitleActive]}>
                Board
              </Text>
              <Text style={[S.typeSub, type === 'kanban' && S.typeSubActive]}>
                Ongoing projects
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick fill */}
          <View style={S.presetHeaderRow}>
            <Text style={S.sectionLabel}>Quick fill</Text>
            <TouchableOpacity
              onPress={handleSavePreset}
              disabled={!name.trim()}
              style={[S.savePresetBtn, !name.trim() && { opacity: 0.3 }]}
            >
              <Ionicons name="bookmark-outline" size={13} color={C.textSec} />
              <Text style={S.savePresetText}>Save as preset</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 32 }}
          >
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {allPresets.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={S.presetChip}
                  onPress={() => applyPreset(p)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14 }}>{p.icon}</Text>
                  <Text style={S.presetChipText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Add button */}
        <View style={S.footer}>
          <TouchableOpacity
            style={[S.addBtn, !name.trim() && { opacity: 0.3 }]}
            onPress={handleAdd}
            disabled={!name.trim()}
          >
            <Text style={S.addBtnText}>Add block</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: C.text, letterSpacing: -0.5 },

  content: { padding: 20, paddingBottom: 8 },

  nameRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  iconInput: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
    fontSize: 24, color: C.text, textAlign: 'center',
  },
  nameInput: {
    flex: 1, height: 52, backgroundColor: C.card2,
    borderRadius: 12, paddingHorizontal: 14,
    fontSize: 15, color: C.text,
    borderWidth: 1, borderColor: C.border,
  },

  sectionLabel: {
    fontSize: 10, color: C.textSec,
    textTransform: 'uppercase', letterSpacing: 1.5,
    fontWeight: '600', marginBottom: 10,
  },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  typeCard: {
    flex: 1, borderRadius: 14, padding: 16, gap: 6,
    backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
  },
  typeCardActive: { backgroundColor: C.text, borderColor: C.text },
  typeTitle: { fontSize: 14, fontWeight: '600', color: C.textSec },
  typeTitleActive: { color: C.bg },
  typeSub: { fontSize: 11, color: C.textDim },
  typeSubActive: { color: C.bg, opacity: 0.6 },

  presetHeaderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  savePresetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  savePresetText: { fontSize: 11, color: C.textSec },

  presetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card2,
  },
  presetChipText: { fontSize: 13, color: C.textSec },

  footer: { padding: 16, paddingBottom: 8 },
  addBtn: {
    backgroundColor: C.green, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  addBtnText: { fontSize: 15, fontWeight: '600', color: C.bg },
});
