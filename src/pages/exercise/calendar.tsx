import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { DailyExercise } from '@/src/db/model';

interface CalendarProps {
  records: DailyExercise[];
}

export default function Calendar({ records }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Create a map of date to exercise data
  const exerciseMap = new Map<string, DailyExercise>();
  records.forEach(record => {
    exerciseMap.set(record.date, record);
  });

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getBadgeStatus = (record?: DailyExercise) => {
    if (!record) return 'none';
    return record.allCompleted ? 'success' : 'partial';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth}>
          <Text style={styles.navButton}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {format(currentDate, 'yyyy年MM月', { locale: zhCN })}
        </Text>
        <TouchableOpacity onPress={nextMonth}>
          <Text style={styles.navButton}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdays}>
        {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
          <Text key={index} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {/* Empty cells for days before month starts */}
        {Array.from({ length: monthStart.getDay() }).map((_, index) => (
          <View key={`empty-${index}`} style={styles.dayCell} />
        ))}

        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const exercise = exerciseMap.get(dateStr);
          const badgeStatus = getBadgeStatus(exercise);
          const isToday = isSameDay(day, new Date());

          return (
            <View key={index} style={styles.dayCell}>
              <View
                style={[
                  styles.dayNumber,
                  isToday && styles.today,
                  badgeStatus === 'success' && styles.successDay,
                  badgeStatus === 'partial' && styles.partialDay,
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    !isSameMonth(day, currentDate) && styles.otherMonth,
                  ]}>
                  {format(day, 'd')}
                </Text>
              </View>
              {exercise && (
                <View style={styles.badgeContainer}>
                  <View
                    style={[
                      styles.badge,
                      badgeStatus === 'success' ? styles.successBadge : styles.partialBadge,
                    ]}>
                    <Text style={styles.badgeText}>
                      {badgeStatus === 'success' ? '✓' : exercise.exercises.length}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  navButton: {
    fontSize: 24,
    color: '#007bff',
    padding: 10,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    backgroundColor: '#007bff',
  },
  successDay: {
    backgroundColor: '#4CAF50',
  },
  partialDay: {
    backgroundColor: '#FFB74D',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  otherMonth: {
    color: '#ccc',
  },
  badgeContainer: {
    marginTop: 2,
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBadge: {
    backgroundColor: '#4CAF50',
  },
  partialBadge: {
    backgroundColor: '#FFB74D',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
