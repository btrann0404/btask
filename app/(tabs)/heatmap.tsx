import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';

const C = {
  bg:      '#080808',
  card:    '#101010',
  text:    '#E2E2E2',
  textSec: '#5A5A5A',
  textDim: '#2A2A2A',
  border:  '#181818',
  heat:    ['#161616', '#0D2818', '#145C30', '#1E8A47', '#3DD68C'],
};

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function scoreToIdx(score: number) {
  if (score < 0.01) return 0;
  if (score < 0.3)  return 1;
  if (score < 0.55) return 2;
  if (score < 0.75) return 3;
  return 4;
}

function generateYearData(year: number) {
  const data: { date: string; score: number }[] = [];
  const today = new Date();
  const start = new Date(year, 0, 1);

  for (let d = new Date(start); d <= new Date(year, 11, 31) && d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = isWeekend ? 0.25 : 0.6;
    const noise = (seededRand(dayOfYear + year * 365) - 0.5) * 0.55;
    const score = Math.max(0, Math.min(1, base + noise));
    const missed = seededRand(dayOfYear * 3 + year) < 0.15;
    data.push({ date: dateStr, score: missed ? 0 : score });
  }
  return data;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL = 10, GAP = 2;

function Grid({ data, year }: { data: { date: string; score: number }[]; year: number }) {
  const firstDay = new Date(year, 0, 1).getDay();
  const weeks: ({ date: string; score: number } | null)[][] = [];
  let week: ({ date: string; score: number } | null)[] = Array(firstDay).fill(null);

  data.forEach((day) => {
    week.push(day);
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const monthPos: { label: string; wi: number }[] = [];
  weeks.forEach((w, wi) => {
    const first = w.find(Boolean) as any;
    if (first) {
      const d = new Date(first.date + 'T00:00:00');
      if (d.getDate() <= 7 || wi === 0) {
        const label = MONTHS[d.getMonth()];
        if (!monthPos.find((m) => m.label === label)) monthPos.push({ label, wi });
      }
    }
  });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={{ flexDirection: 'row', marginBottom: 4, marginLeft: 18 }}>
          {weeks.map((_, wi) => {
            const m = monthPos.find((x) => x.wi === wi);
            return (
              <View key={wi} style={{ width: CELL + GAP }}>
                {m && <Text style={{ fontSize: 8, color: C.textDim }}>{m.label}</Text>}
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ marginRight: 4 }}>
            {DAYS.map((d, i) => (
              <View key={i} style={{ width: 14, height: CELL, marginBottom: GAP, justifyContent: 'center' }}>
                <Text style={{ fontSize: 7, color: C.textDim }}>{i % 2 === 1 ? d : ''}</Text>
              </View>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ marginRight: GAP }}>
              {week.map((day, di) => (
                <View
                  key={di}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 2,
                    marginBottom: GAP,
                    backgroundColor: day ? C.heat[scoreToIdx(day.score)] : 'transparent',
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function computeStats(data: { date: string; score: number }[]) {
  const avg = data.length ? data.reduce((s, d) => s + d.score, 0) / data.length : 0;
  let currentStreak = 0, longestStreak = 0, run = 0, hitGap = false;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].score > 0.1) {
      run++;
      if (!hitGap) currentStreak = run;
      longestStreak = Math.max(longestStreak, run);
    } else {
      hitGap = true;
      run = 0;
    }
  }
  return { avg, currentStreak, longestStreak };
}

export default function HeatmapScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const data = useMemo(() => generateYearData(year), [year]);
  const { avg, currentStreak, longestStreak } = useMemo(() => computeStats(data), [data]);
  const last7 = data.slice(-7).reverse();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Text style={S.title}>Heatmap</Text>

        <View style={S.yearRow}>
          <TouchableOpacity onPress={() => setYear((y) => y - 1)}>
            <Text style={S.yearNav}>← {year - 1}</Text>
          </TouchableOpacity>
          <Text style={S.yearLabel}>{year}</Text>
          <TouchableOpacity
            onPress={() => setYear((y) => y + 1)}
            style={year >= currentYear ? { opacity: 0.2 } : {}}
            disabled={year >= currentYear}
          >
            <Text style={S.yearNav}>{year + 1} →</Text>
          </TouchableOpacity>
        </View>

        <View style={S.card}>
          <Grid data={data} year={year} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
            <Text style={{ fontSize: 9, color: C.textDim }}>Less</Text>
            {C.heat.map((color, i) => (
              <View key={i} style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: color, borderWidth: 1, borderColor: C.border }} />
            ))}
            <Text style={{ fontSize: 9, color: C.textDim }}>More</Text>
          </View>
        </View>

        <View style={S.statsRow}>
          {[
            { val: String(currentStreak), label: 'Streak' },
            { val: String(longestStreak), label: 'Best' },
            { val: `${Math.round(avg * 100)}%`, label: 'Average' },
          ].map((s) => (
            <View key={s.label} style={S.statCard}>
              <Text style={S.statVal}>{s.val}</Text>
              <Text style={S.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={S.sectionLabel}>Last 7 Days</Text>
        {last7.map((day) => (
          <View key={day.date} style={S.dayRow}>
            <View style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: C.heat[scoreToIdx(day.score)], marginRight: 12, borderWidth: 1, borderColor: C.border }} />
            <Text style={{ flex: 1, fontSize: 13, color: C.textSec }}>
              {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <Text style={{ fontSize: 13, color: C.textDim }}>{Math.round(day.score * 100)}%</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 20, letterSpacing: -1 },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  yearNav: { fontSize: 12, color: C.textSec },
  yearLabel: { fontSize: 16, fontWeight: '600', color: C.text },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statVal: { fontSize: 24, fontWeight: '700', color: C.text, letterSpacing: -1 },
  statLbl: { fontSize: 10, color: C.textDim, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 },
  sectionLabel: { fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 },
  dayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, padding: 12, marginBottom: 5, borderWidth: 1, borderColor: C.border },
});
