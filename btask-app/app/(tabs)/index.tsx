import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  TextInput,
  PanResponder,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useBlocks,
  SimpleBlock,
  KanbanBlock,
  Block,
  Reminder,
  Weight,
  isBlockDone,
} from "@/store/blocks";
import { Image } from "expo-image";

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#080808",
  card: "#101010",
  card2: "#161616",
  text: "#E2E2E2",
  textSec: "#5A5A5A",
  textDim: "#2A2A2A",
  border: "#181818",
  green: "#3DD68C",
};

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const W = { high: 3, medium: 2, low: 1 };
const PANEL_W = SCREEN_WIDTH - 56; // hero paddingHorizontal 28*2
const NUM_PANELS = 9;
const CENTER = 4; // today is always at index 4

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatLong(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function dayLabel(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  if (offset > 0) return `In ${offset} days`;
  return `${Math.abs(offset)} days ago`;
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

function sortBlocks(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => {
    const aDone = isBlockDone(a),
      bDone = isBlockDone(b);
    if (aDone !== bDone) return aDone ? 1 : -1;
    return W[b.weight] - W[a.weight];
  });
}

function sortReminders(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return W[b.weight] - W[a.weight];
  });
}

// ─── Cat GIF ──────────────────────────────────────────────────────────────────

const catGif = require("@/assets/gif/cats-transparent.gif");

// ─── Hero ─────────────────────────────────────────────────────────────────────

function panelOpacity(dist: number) {
  if (dist === 0) return 1;
  if (dist === 1) return 0.22;
  if (dist === 2) return 0.1;
  return 0.04;
}

function Hero({
  dayOffset,
  onPrev,
  onNext,
  blocks,
  reminders,
  onOpenCalendar,
  onSwipeStart,
  onSwipeEnd,
}: {
  dayOffset: number;
  onPrev: () => void;
  onNext: () => void;
  blocks: Block[];
  reminders: Reminder[];
  onOpenCalendar: () => void;
  onSwipeStart: () => void;
  onSwipeEnd: () => void;
}) {
  const isToday = dayOffset === 0;
  const isFuture = dayOffset > 0;

  // 9-panel carousel: today always at index CENTER
  const carouselX = useRef(new Animated.Value(-PANEL_W * CENTER)).current;
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  const onSwipeStartRef = useRef(onSwipeStart);
  const onSwipeEndRef = useRef(onSwipeEnd);
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;
  onSwipeStartRef.current = onSwipeStart;
  onSwipeEndRef.current = onSwipeEnd;

  const pan = useRef(
    PanResponder.create({
      // Only claim clearly horizontal swipes — let vertical ones pass through
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderGrant: () => {
        // Immediately kill outer vertical scroll so diagonal swipes stay in hero
        onSwipeStartRef.current();
      },
      onPanResponderMove: (_, gs) => {
        carouselX.setValue(-PANEL_W * CENTER + gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        onSwipeEndRef.current();
        const snapTo = (toValue: number, cb: () => void) => {
          Animated.timing(carouselX, {
            toValue,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            cb();
            carouselX.setValue(-PANEL_W * CENTER);
          });
        };
        // Any movement in a direction commits — no bounce back
        if (gs.dx < 0)
          snapTo(-PANEL_W * (CENTER + 1), () => onNextRef.current());
        else if (gs.dx > 0)
          snapTo(-PANEL_W * (CENTER - 1), () => onPrevRef.current());
        else carouselX.setValue(-PANEL_W * CENTER);
      },
      onPanResponderTerminate: () => {
        onSwipeEndRef.current();
        carouselX.setValue(-PANEL_W * CENTER);
      },
    }),
  ).current;

  // Stats
  const { total, done } = useMemo(() => {
    let total = 0,
      done = 0;
    blocks.forEach((b) => {
      total += b.tasks.length;
      if (b.type === "simple")
        done += (b as SimpleBlock).tasks.filter((t) => t.completed).length;
      else
        done += (b as KanbanBlock).tasks.filter(
          (t) => t.column === "done",
        ).length;
    });
    total += reminders.length;
    done += reminders.filter((r) => r.completed).length;
    return { total, done };
  }, [blocks, reminders]);

  const pct = total > 0 ? done / total : 0;
  const remaining = total - done;
  const productivityWord = pct > 0.38 ? "more" : pct < 0.22 ? "less" : "as";
  const productivityColor = productivityWord === "more" ? C.green : C.text;

  const topItem = [
    ...blocks
      .filter((b) => !isBlockDone(b) && b.tasks.length > 0)
      .map((b) => ({ label: `${b.icon} ${b.name}`, weight: b.weight })),
    ...reminders
      .filter((r) => !r.completed)
      .map((r) => ({ label: r.text, weight: r.weight })),
  ].sort((a, b) => W[b.weight] - W[a.weight])[0];

  const panels = Array.from({ length: NUM_PANELS }, (_, i) => i - CENTER);

  return (
    <View style={S.hero} {...pan.panHandlers}>
      {/* Fixed top: date nav */}
      <View style={S.dateRow}>
        <TouchableOpacity onPress={onPrev} hitSlop={16} style={S.dateArrow}>
          <Ionicons name="chevron-back" size={14} color={C.textSec} />
        </TouchableOpacity>
        <View style={{ alignItems: "center", gap: 1 }}>
          <Text style={S.dateDayLabel}>{dayLabel(dayOffset)}</Text>
          <Text style={S.dateFormatted}>{formatLong(dayOffset)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={onNext} hitSlop={16} style={S.dateArrow}>
            <Ionicons name="chevron-forward" size={14} color={C.textSec} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenCalendar}
            hitSlop={12}
            style={S.dateArrow}
          >
            <Ionicons name="calendar-outline" size={14} color={C.textSec} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 9-panel carousel */}
      <View style={{ flex: 1, overflow: "hidden" }}>
        <Animated.View
          style={{
            flexDirection: "row",
            width: PANEL_W * NUM_PANELS,
            flex: 1,
            transform: [{ translateX: carouselX }],
          }}
        >
          {panels.map((offset) => {
            const dist = Math.abs(offset);
            const isCurrent = offset === 0;
            const panelDayOffset = dayOffset + offset;

            if (!isCurrent) {
              return (
                <View
                  key={offset}
                  style={{
                    width: PANEL_W,
                    justifyContent: "center",
                    gap: 24,
                    opacity: panelOpacity(dist),
                  }}
                >
                  <Text style={S.heroName}>{dayLabel(panelDayOffset)}.</Text>
                  <View style={S.progressTrack}>
                    <View
                      style={[
                        S.progressFill,
                        { width: panelDayOffset > 0 ? "10%" : "55%" },
                      ]}
                    />
                  </View>
                  <Text style={S.heroMeta}> </Text>
                </View>
              );
            }

            return (
              <View
                key={offset}
                style={{ width: PANEL_W, justifyContent: "center", gap: 32 }}
              >
                {isToday ? (
                  <>
                    <Image
                      source={catGif}
                      style={{
                        position: "absolute",
                        top: "50%",
                        right: -10,
                        marginTop: -60,
                        width: PANEL_W / 2,
                        height: 120,
                      }}
                      contentFit="contain"
                      autoplay
                    />
                    <Text style={S.heroName}>Hi Brandon.</Text>
                    <Text style={S.heroStatus}>
                      You are{" "}
                      <Text
                        style={[S.heroStatusBold, { color: productivityColor }]}
                      >
                        {productivityWord} productive
                      </Text>
                      {"\n"}than yesterday.
                    </Text>
                    <View style={S.progressTrack}>
                      <View
                        style={[
                          S.progressFill,
                          { width: `${Math.round(pct * 100)}%` as any },
                        ]}
                      />
                    </View>
                    {remaining > 0 ? (
                      <Text style={S.heroMeta}>
                        {remaining} left
                        {topItem ? (
                          <Text style={S.heroMetaDim}>
                            {"  ·  "}
                            {topItem.label}
                          </Text>
                        ) : null}
                      </Text>
                    ) : (
                      <Text style={[S.heroMeta, { color: C.green }]}>
                        All done today.
                      </Text>
                    )}
                  </>
                ) : isFuture ? (
                  <>
                    <Text style={S.heroName}>Planning.</Text>
                    <Text style={S.heroStatus}>
                      {reminders.length === 0
                        ? "Nothing planned yet."
                        : `${reminders.length} item${reminders.length !== 1 ? "s" : ""} planned.`}
                    </Text>
                    <View style={S.progressTrack}>
                      <View
                        style={[
                          S.progressFill,
                          { width: reminders.length > 0 ? "15%" : "0%" },
                        ]}
                      />
                    </View>
                    <Text style={S.heroMeta}>
                      Add reminders below to plan your day.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={S.heroName}>Looking back.</Text>
                    <Text style={S.heroStatus}>
                      {done > 0
                        ? `Completed ${done} of ${total} items.`
                        : "No activity recorded."}
                    </Text>
                    <View style={S.progressTrack}>
                      <View
                        style={[
                          S.progressFill,
                          {
                            width: `${Math.round(pct * 100)}%` as any,
                            opacity: 0.5,
                          },
                        ]}
                      />
                    </View>
                    <Text style={S.heroMeta} />
                  </>
                )}
              </View>
            );
          })}
        </Animated.View>
      </View>

      {/* Fixed bottom: scroll hint */}
      <Ionicons
        name="chevron-down"
        size={13}
        color={C.textSec}
        style={{ alignSelf: "center" }}
      />
    </View>
  );
}

// ─── Simple Block ─────────────────────────────────────────────────────────────

function SimpleExpanded({ block }: { block: SimpleBlock }) {
  const { toggleSimpleTask } = useBlocks();
  return (
    <View style={S.expandWrap}>
      {block.tasks.map((task) => (
        <Pressable
          key={task.id}
          onPress={() => toggleSimpleTask(block.id, task.id)}
          style={S.taskRow}
        >
          <View style={[S.checkbox, task.completed && S.checkboxDone]}>
            {task.completed && (
              <Ionicons name="checkmark" size={10} color={C.bg} />
            )}
          </View>
          <Text style={[S.taskText, task.completed && S.taskDone]}>
            {task.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Block Card ───────────────────────────────────────────────────────────────

function BlockCard({
  block,
  expanded,
  onToggle,
}: {
  block: Block;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const { removeBlock } = useBlocks();
  const isKanban = block.type === "kanban";
  const done = isKanban
    ? (block as KanbanBlock).tasks.filter((t) => t.column === "done").length
    : (block as SimpleBlock).tasks.filter((t) => t.completed).length;
  const total = block.tasks.length;
  const pct = total > 0 ? done / total : 0;

  const handleDelete = () =>
    Alert.alert("Delete block", `Remove "${block.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeBlock(block.id) },
    ]);

  return (
    <View style={[S.card, isBlockDone(block) && { opacity: 0.35 }]}>
      <TouchableOpacity
        onPress={() =>
          isKanban ? router.push(`/kanban/${block.id}`) : onToggle()
        }
        onLongPress={handleDelete}
        activeOpacity={0.6}
        style={S.cardRow}
      >
        <Text style={S.cardIcon}>{block.icon}</Text>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={S.cardName}>{block.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={S.barTrack}>
              <View style={[S.barFill, { width: `${pct * 100}%` as any }]} />
            </View>
            <Text style={S.barLabel}>
              {done}/{total}
            </Text>
          </View>
        </View>
        {isKanban ? (
          <Ionicons name="arrow-forward-outline" size={14} color={C.textDim} />
        ) : (
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={C.textDim}
          />
        )}
      </TouchableOpacity>
      {expanded && !isKanban && <SimpleExpanded block={block as SimpleBlock} />}
    </View>
  );
}

// ─── Reminder Card ────────────────────────────────────────────────────────────

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const { toggleReminder, removeReminder } = useBlocks();
  return (
    <Pressable
      onPress={() => toggleReminder(reminder.id)}
      style={[S.reminderCard, reminder.completed && { opacity: 0.35 }]}
    >
      <View style={[S.checkbox, reminder.completed && S.checkboxDone]}>
        {reminder.completed && (
          <Ionicons name="checkmark" size={10} color={C.bg} />
        )}
      </View>
      <Text
        style={[S.reminderText, reminder.completed && S.taskDone]}
        numberOfLines={2}
      >
        {reminder.text}
      </Text>
      <TouchableOpacity onPress={() => removeReminder(reminder.id)} hitSlop={8}>
        <Ionicons name="close" size={13} color={C.textDim} />
      </TouchableOpacity>
    </Pressable>
  );
}

// ─── Add Reminder Modal ───────────────────────────────────────────────────────

function AddReminderModal({
  visible,
  onClose,
  dateStr,
}: {
  visible: boolean;
  onClose: () => void;
  dateStr: string;
}) {
  const { addReminder } = useBlocks();
  const [text, setText] = useState("");
  const [weight, setWeight] = useState<Weight>("medium");

  const handleAdd = () => {
    if (!text.trim()) return;
    addReminder(text.trim(), weight, dateStr);
    setText("");
    setWeight("medium");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable style={S.overlay} onPress={onClose}>
          <Pressable style={S.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Add reminder</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="What do you need to remember?"
              placeholderTextColor={C.textDim}
              style={S.reminderInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <Text style={S.sheetSubLabel}>Priority</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {(["low", "medium", "high"] as Weight[]).map((w) => (
                <TouchableOpacity
                  key={w}
                  onPress={() => setWeight(w)}
                  style={[S.weightChip, weight === w && S.weightChipActive]}
                >
                  <Text
                    style={[
                      S.weightChipText,
                      weight === w && S.weightChipTextActive,
                    ]}
                  >
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={S.addConfirmBtn} onPress={handleAdd}>
              <Text style={S.addConfirmText}>Add</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { blocks, reminders, calDate, setCalDate } = useBlocks();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"blocks" | "misc">("blocks");
  const [reminderModal, setReminderModal] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = calDate === todayStr;

  const dayOffset = useMemo(() => {
    const t = new Date(todayStr + "T00:00:00");
    const s = new Date(calDate + "T00:00:00");
    return Math.round((s.getTime() - t.getTime()) / 86400000);
  }, [calDate, todayStr]);

  const shiftDay = (delta: number) => {
    const d = new Date(calDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setCalDate(d.toISOString().split("T")[0]);
  };

  const dayReminders = useMemo(
    () => sortReminders(reminders.filter((r) => r.date === calDate)),
    [reminders, calDate],
  );
  const sortedBlocks = useMemo(() => sortBlocks(blocks), [blocks]);

  // Outer scroll ref — we disable it while hero is being swiped horizontally
  const outerScrollRef = useRef<any>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [heroH, setHeroH] = useState(SCREEN_HEIGHT);

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, heroH * 0.4],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const disableOuterScroll = () =>
    outerScrollRef.current?.setNativeProps({ scrollEnabled: false });
  const enableOuterScroll = () =>
    outerScrollRef.current?.setNativeProps({ scrollEnabled: true });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Animated.ScrollView
        ref={outerScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 64 }}
        snapToOffsets={[0, heroH]}
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        <Animated.View
          onLayout={(e) => setHeroH(e.nativeEvent.layout.height)}
          style={{ opacity: heroOpacity }}
        >
          <Hero
            dayOffset={dayOffset}
            onPrev={() => shiftDay(-1)}
            onNext={() => shiftDay(1)}
            blocks={isToday ? blocks : []}
            reminders={dayReminders}
            onOpenCalendar={() => router.push("/calendar")}
            onSwipeStart={disableOuterScroll}
            onSwipeEnd={enableOuterScroll}
          />
        </Animated.View>

        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 8,
            minHeight: SCREEN_HEIGHT,
          }}
        >
          {/* ── Section toggle ── */}
          <View style={S.tabRow}>
            <TouchableOpacity
              style={[S.tabBtn, activeTab === "blocks" && S.tabBtnActive]}
              onPress={() => setActiveTab("blocks")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  S.tabBtnText,
                  activeTab === "blocks" && S.tabBtnTextActive,
                ]}
              >
                Blocks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.tabBtn, activeTab === "misc" && S.tabBtnActive]}
              onPress={() => setActiveTab("misc")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  S.tabBtnText,
                  activeTab === "misc" && S.tabBtnTextActive,
                ]}
              >
                Misc
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Blocks ── */}
          {activeTab === "blocks" && (
            <>
              {sortedBlocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  expanded={expandedId === block.id}
                  onToggle={() =>
                    setExpandedId((p) => (p === block.id ? null : block.id))
                  }
                />
              ))}
              <TouchableOpacity
                style={S.addBtn}
                onPress={() => router.push("/add-block")}
              >
                <Ionicons name="add" size={13} color="#606060" />
                <Text style={S.addBtnText}>Add block</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Misc ── */}
          {activeTab === "misc" && (
            <>
              {dayReminders.map((r) => (
                <ReminderCard key={r.id} reminder={r} />
              ))}
              {dayReminders.length === 0 && (
                <Text style={S.emptySection}>
                  {dayOffset === 0
                    ? "No reminders today."
                    : "Nothing planned for this day."}
                </Text>
              )}
              <TouchableOpacity
                style={S.addBtn}
                onPress={() => setReminderModal(true)}
              >
                <Ionicons name="add" size={13} color="#606060" />
                <Text style={S.addBtnText}>Add reminder</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.ScrollView>

      <AddReminderModal
        visible={reminderModal}
        onClose={() => setReminderModal(false)}
        dateStr={calDate}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  hero: {
    height: SCREEN_HEIGHT,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 44,
    justifyContent: "space-between",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateArrow: { padding: 4 },
  dateDayLabel: {
    fontSize: 10,
    color: C.textDim,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  dateFormatted: { fontSize: 13, color: C.textSec, textAlign: "center" },
  heroName: {
    fontSize: 44,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -2,
    lineHeight: 50,
  },
  heroStatus: {
    fontSize: 20,
    color: C.textSec,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  heroStatusBold: { fontWeight: "700" },
  progressTrack: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 3, backgroundColor: C.green, borderRadius: 2 },
  heroMeta: { fontSize: 15, color: C.text, letterSpacing: -0.3 },
  heroMetaDim: { fontSize: 15, color: C.textSec },

  tabRow: { flexDirection: "row", gap: 6, marginBottom: 12, marginTop: 4 },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabBtnActive: { backgroundColor: C.text, borderColor: C.text },
  tabBtnText: { fontSize: 12, color: C.textSec, fontWeight: "500" },
  tabBtnTextActive: { color: C.bg, fontWeight: "600" },
  emptySection: {
    fontSize: 12,
    color: C.textDim,
    paddingBottom: 8,
    paddingLeft: 2,
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { fontSize: 22 },
  cardName: {
    fontSize: 14,
    fontWeight: "500",
    color: C.text,
    letterSpacing: -0.3,
  },
  barTrack: {
    flex: 1,
    height: 2,
    backgroundColor: C.border,
    borderRadius: 1,
    overflow: "hidden",
  },
  barFill: { height: 2, backgroundColor: C.green, borderRadius: 1 },
  barLabel: { fontSize: 10, color: C.textDim },

  expandWrap: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 2,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    gap: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: C.green, borderColor: C.green },
  taskText: { fontSize: 13, color: C.text, flex: 1 },
  taskDone: { color: C.textDim, textDecorationLine: "line-through" },

  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
  },
  reminderText: { fontSize: 13, color: C.text, flex: 1 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    backgroundColor: "#0D0D0D",
    marginBottom: 4,
  },
  addBtnText: { fontSize: 12, color: "#606060" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: C.border,
  },
  sheetHandle: {
    width: 28,
    height: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: C.text,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  sheetSubLabel: {
    fontSize: 10,
    color: C.textDim,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  reminderInput: {
    backgroundColor: C.card2,
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 18,
  },
  weightChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  weightChipActive: { backgroundColor: C.text, borderColor: C.text },
  weightChipText: { fontSize: 12, color: C.textSec },
  weightChipTextActive: { color: C.bg, fontWeight: "600" },
  addConfirmBtn: {
    backgroundColor: C.green,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  addConfirmText: { fontSize: 14, fontWeight: "600", color: C.bg },
});
