import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ScanResult } from '../services/api';

interface ScanResultModalProps {
  visible: boolean;
  result: ScanResult | null;
  onClose: () => void;
}

export default function ScanResultModal({
  visible,
  result,
  onClose,
}: ScanResultModalProps) {
  if (!result) return null;

  const isCheckIn = result.action === 'CHECKED_IN';
  const isCheckOut = result.action === 'CHECKED_OUT';

  const accentColor = isCheckIn ? '#10b981' : isCheckOut ? '#00f2fe' : '#f59e0b';
  const iconName = isCheckIn
    ? 'checkmark-circle'
    : isCheckOut
    ? 'trophy'
    : 'information-circle';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header Icon */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: `${accentColor}20`,
                borderColor: accentColor,
              },
            ]}
          >
            <Ionicons name={iconName} size={48} color={accentColor} />
          </View>

          {/* Badge */}
          <View
            style={[
              styles.badge,
              { backgroundColor: `${accentColor}25`, borderColor: accentColor },
            ]}
          >
            <Text style={[styles.badgeText, { color: accentColor }]}>
              {isCheckIn
                ? 'CHECK-IN CONFIRMED'
                : isCheckOut
                ? 'CHECK-OUT COMPLETED'
                : 'ALREADY CHECKED IN'}
            </Text>
          </View>

          {/* Message */}
          <Text style={styles.messageText}>{result.message}</Text>

          {/* Details Card */}
          <View style={styles.detailsBox}>
            {result.gym && (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={16} color="#94a3b8" />
                <Text style={styles.detailLabel}>Facility</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {result.gym.name}
                </Text>
              </View>
            )}

            {isCheckIn && result.checkInTime && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#94a3b8" />
                <Text style={styles.detailLabel}>Entry Time</Text>
                <Text style={styles.detailValue}>
                  {new Date(result.checkInTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            {isCheckOut && (
              <>
                {result.durationMinutes !== undefined && (
                  <View style={styles.detailRow}>
                    <Ionicons name="flame-outline" size={16} color="#f59e0b" />
                    <Text style={styles.detailLabel}>Session Duration</Text>
                    <Text style={[styles.detailValue, { color: '#00f2fe', fontWeight: '800' }]}>
                      {result.durationMinutes} mins
                    </Text>
                  </View>
                )}
                {result.checkOutTime && (
                  <View style={styles.detailRow}>
                    <Ionicons name="log-out-outline" size={16} color="#94a3b8" />
                    <Text style={styles.detailLabel}>Exit Time</Text>
                    <Text style={styles.detailValue}>
                      {new Date(result.checkOutTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#94a3b8" />
              <Text style={styles.detailLabel}>Access Method</Text>
              <Text style={styles.detailValue}>QR Code Scan</Text>
            </View>
          </View>

          {/* Dismiss Button */}
          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: accentColor }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.dismissButtonText}>
              {isCheckIn ? 'Start Workout' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  detailsBox: {
    backgroundColor: '#0a0f1d',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  detailValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  dismissButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    color: '#0b0f19',
    fontSize: 15,
    fontWeight: '700',
  },
});
