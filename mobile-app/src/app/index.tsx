import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/AuthContext';
import api, { type ScanResult } from '@/services/api';
import QRScannerModal from '@/components/QRScannerModal';
import ScanResultModal from '@/components/ScanResultModal';

export default function HomeScreen() {
  const { userProfile, activeGym, activeAttendance, activeMembership, refreshProfile, signOut } =
    useAuth();

  const [scannerVisible, setScannerVisible] = useState(false);
  const [preferredScanAction, setPreferredScanAction] = useState<
    'AUTO' | 'CHECK_IN' | 'CHECK_OUT'
  >('AUTO');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [occupancy, setOccupancy] = useState<{
    currentlyActiveCount: number;
    maxCapacity: number;
    occupancyPercentage: number;
    status: string;
  } | null>(null);

  const fetchOccupancy = useCallback(async () => {
    try {
      const data = await api.getOccupancy();
      if (data) {
        setOccupancy(data);
      }
    } catch (e) {
      // ignore silently if endpoint is unavailable
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), fetchOccupancy()]);
    setRefreshing(false);
  }, [refreshProfile, fetchOccupancy]);

  useEffect(() => {
    fetchOccupancy();
  }, [fetchOccupancy]);

  const openScanner = (action: 'AUTO' | 'CHECK_IN' | 'CHECK_OUT' = 'AUTO') => {
    setPreferredScanAction(action);
    setScannerVisible(true);
  };

  const handleScanSuccess = (result: ScanResult) => {
    setScanResult(result);
    setResultModalVisible(true);
    fetchOccupancy();
  };

  // Direct fast check-out action if already checked in
  const handleFastCheckOut = async () => {
    if (!activeAttendance) return;
    try {
      const res = await api.checkOut(activeAttendance.id);
      await refreshProfile();
      handleScanSuccess(res);
    } catch (err: any) {
      Alert.alert('Check-Out Failed', err.message || 'Could not process check-out.');
    }
  };

  const isCheckedIn = !!activeAttendance;
  const memberName = userProfile?.name || 'Athlete';
  const memberTier = userProfile?.memberTier || 'STANDARD';

  // Calculate elapsed workout time if checked in
  let workoutElapsed = '';
  if (activeAttendance?.checkInTime) {
    const start = new Date(activeAttendance.checkInTime).getTime();
    const now = Date.now();
    const mins = Math.max(1, Math.round((now - start) / (1000 * 60)));
    workoutElapsed = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00f2fe"
            colors={['#00f2fe']}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Ionicons name="barbell" size={20} color="#00f2fe" />
              <Text style={styles.brandText}>SYNC<Text style={styles.brandAccent}>FIT</Text></Text>
            </View>
            <Text style={styles.greetingText}>Hello, {memberName}</Text>
          </View>

          <View style={styles.headerBadges}>
            {activeGym && (
              <View style={styles.gymPill}>
                <Ionicons name="business" size={12} color="#00f2fe" />
                <Text style={styles.gymPillText}>{activeGym.code}</Text>
              </View>
            )}
            <View style={styles.tierPill}>
              <Ionicons name="shield-checkmark" size={13} color="#00f2fe" />
              <Text style={styles.tierText}>{memberTier}</Text>
            </View>
          </View>
        </View>

        {/* Current Status Banner (Checked In vs Checked Out) */}
        <View style={[styles.statusCard, isCheckedIn ? styles.statusCardActive : styles.statusCardInactive]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIndicatorRow}>
              <View style={[styles.statusDot, isCheckedIn ? styles.statusDotActive : styles.statusDotInactive]} />
              <Text style={styles.statusTitle}>
                {isCheckedIn ? 'CURRENTLY IN GYM' : 'NOT CHECKED IN'}
              </Text>
            </View>

            {isCheckedIn && (
              <View style={styles.timeBadge}>
                <Ionicons name="stopwatch-outline" size={14} color="#10b981" />
                <Text style={styles.timeBadgeText}>{workoutElapsed}</Text>
              </View>
            )}
          </View>

          {isCheckedIn ? (
            <View style={styles.activeDetails}>
              <Text style={styles.activeGymName}>
                {activeAttendance?.gym?.name || activeAttendance?.location || 'SyncFit Flagship Gym'}
              </Text>
              <Text style={styles.activeTimestamp}>
                Entry confirmed at{' '}
                {new Date(activeAttendance.checkInTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              <TouchableOpacity
                style={styles.checkOutActionButton}
                onPress={handleFastCheckOut}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                <Text style={styles.checkOutActionText}>Check Out Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inactiveDetails}>
              <Text style={styles.inactivePrompt}>
                Ready for today&apos;s workout session?
              </Text>
              <Text style={styles.inactiveSub}>
                Scan the facility entry QR code at the turnstile to gain access.
              </Text>
            </View>
          )}
        </View>

        {/* Primary QR Scanner Card */}
        <View style={styles.scannerBanner}>
          <View style={styles.scannerIconWrapper}>
            <Ionicons name="qr-code" size={36} color="#00f2fe" />
          </View>

          <View style={styles.scannerInfo}>
            <Text style={styles.scannerHeading}>Turnstile QR Scanner</Text>
            <Text style={styles.scannerSub}>
              Scan gym facility QR code to automatically check in or check out
            </Text>
          </View>

          <TouchableOpacity
            style={styles.openScanButton}
            onPress={() => openScanner('AUTO')}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={20} color="#0b0f19" />
            <Text style={styles.openScanButtonText}>
              {isCheckedIn ? 'Scan to Check Out' : 'Scan to Check In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => openScanner('CHECK_IN')}
            activeOpacity={0.7}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="log-in" size={22} color="#10b981" />
            </View>
            <Text style={styles.tileTitle}>Check In</Text>
            <Text style={styles.tileDesc}>Entry scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => openScanner('CHECK_OUT')}
            activeOpacity={0.7}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="log-out" size={22} color="#ef4444" />
            </View>
            <Text style={styles.tileTitle}>Check Out</Text>
            <Text style={styles.tileDesc}>Finish session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => openScanner('AUTO')}
            activeOpacity={0.7}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
              <Ionicons name="sync" size={22} color="#00f2fe" />
            </View>
            <Text style={styles.tileTitle}>Auto Mode</Text>
            <Text style={styles.tileDesc}>Smart detect</Text>
          </TouchableOpacity>
        </View>

        {/* Live Facility Occupancy */}
        {occupancy && (
          <View style={styles.occupancyCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.occupancyHeaderLeft}>
                <Ionicons name="people-outline" size={20} color="#38bdf8" />
                <Text style={styles.cardHeaderTitle}>Live Facility Occupancy</Text>
              </View>
              <Text style={styles.occupancyValue}>
                {occupancy.currentlyActiveCount} / {occupancy.maxCapacity}
              </Text>
            </View>

            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, occupancy.occupancyPercentage || 0)}%` },
                ]}
              />
            </View>

            <View style={styles.occupancyFooter}>
              <Text style={styles.occupancyFooterText}>
                Facility Status: <Text style={{ color: '#10b981', fontWeight: '700' }}>{occupancy.status || 'NORMAL'}</Text>
              </Text>
              <Text style={styles.occupancyPercent}>{occupancy.occupancyPercentage}% full</Text>
            </View>
          </View>
        )}

        {/* Membership Pass Card */}
        <View style={styles.membershipCard}>
          <View style={styles.membershipTop}>
            <View>
              <Text style={styles.membershipLabel}>ACTIVE MEMBERSHIP</Text>
              <Text style={styles.membershipName}>
                {activeMembership?.plan?.name || 'All-Access Standard Pass'}
              </Text>
            </View>
            <Ionicons name="card" size={28} color="#00f2fe" />
          </View>

          <View style={styles.membershipDivider} />

          <View style={styles.membershipPerks}>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={15} color="#10b981" />
              <Text style={styles.perkText}>QR Turnstile Access</Text>
            </View>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={15} color="#10b981" />
              <Text style={styles.perkText}>Unlimited Gym Floor</Text>
            </View>
            <View style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={15} color="#10b981" />
              <Text style={styles.perkText}>Locker Room & Showers</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanSuccess={handleScanSuccess}
        preferredAction={preferredScanAction}
      />

      {/* Scan Feedback Modal */}
      <ScanResultModal
        visible={resultModalVisible}
        result={scanResult}
        onClose={() => setResultModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandAccent: {
    color: '#00f2fe',
  },
  greetingText: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gymPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 5,
  },
  gymPillText: {
    color: '#00f2fe',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 6,
  },
  tierText: {
    color: '#00f2fe',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  statusCardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  statusCardInactive: {
    backgroundColor: '#131b2e',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDotInactive: {
    backgroundColor: '#64748b',
  },
  statusTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  timeBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  activeDetails: {
    marginTop: 14,
  },
  activeGymName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  activeTimestamp: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 16,
  },
  checkOutActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  checkOutActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  inactiveDetails: {
    marginTop: 10,
  },
  inactivePrompt: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  inactiveSub: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  scannerBanner: {
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    alignItems: 'center',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  scannerIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  scannerInfo: {
    alignItems: 'center',
    marginBottom: 18,
  },
  scannerHeading: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  scannerSub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  openScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00f2fe',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  openScanButtonText: {
    color: '#0b0f19',
    fontSize: 16,
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionTile: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tileIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tileTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  tileDesc: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  occupancyCard: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  occupancyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  occupancyValue: {
    color: '#00f2fe',
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#0a0f1d',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00f2fe',
    borderRadius: 4,
  },
  occupancyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  occupancyFooterText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  occupancyPercent: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  membershipCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.15)',
  },
  membershipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membershipLabel: {
    color: '#00f2fe',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  membershipName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  membershipDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  membershipPerks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perkText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '500',
  },
});
