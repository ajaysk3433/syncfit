import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/AuthContext';
import api, {
  type AttendanceRecord,
  getApiBaseUrl,
  setApiBaseUrl,
} from '@/services/api';

export default function ExploreScreen() {
  const { userProfile, signOut, refreshProfile } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState('');
  const [editingApiUrl, setEditingApiUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const loadHistory = useCallback(async () => {
    if (!userProfile?.id) return;
    setIsLoadingHistory(true);
    try {
      const data = await api.getMemberAttendance(userProfile.id);
      if (data?.attendanceLogs) {
        setHistory(data.attendanceLogs);
      }
    } catch (err: any) {
      console.warn('Failed to load attendance history', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    loadHistory();
    getApiBaseUrl().then((url) => {
      setCurrentApiUrl(url);
      setCustomUrlInput(url);
    });
  }, [loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), loadHistory()]);
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of SyncFit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleSaveApiUrl = async () => {
    if (!customUrlInput.trim()) return;
    await setApiBaseUrl(customUrlInput.trim());
    setCurrentApiUrl(customUrlInput.trim());
    setEditingApiUrl(false);
    Alert.alert('Server Updated', `Connecting to: ${customUrlInput.trim()}`);
  };

  const renderHistoryItem = ({ item }: { item: AttendanceRecord }) => {
    const isCompleted = item.status === 'CHECKED_OUT' || item.status === 'AUTO_CHECKED_OUT';
    const isDenied = item.status === 'DENIED';

    const checkInDate = new Date(item.checkInTime);
    const dateFormatted = checkInDate.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
    const checkInFormatted = checkInDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const checkOutFormatted = item.checkOutTime
      ? new Date(item.checkOutTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyCardLeft}>
          <View
            style={[
              styles.historyIconCircle,
              {
                backgroundColor: isDenied
                  ? 'rgba(239, 68, 68, 0.15)'
                  : isCompleted
                  ? 'rgba(0, 242, 254, 0.15)'
                  : 'rgba(16, 185, 129, 0.15)',
              },
            ]}
          >
            <Ionicons
              name={
                isDenied
                  ? 'close-circle'
                  : isCompleted
                  ? 'checkmark-circle'
                  : 'fitness'
              }
              size={20}
              color={
                isDenied ? '#ef4444' : isCompleted ? '#00f2fe' : '#10b981'
              }
            />
          </View>

          <View style={styles.historyDetails}>
            <Text style={styles.historyGymName}>
              {item.gym?.name || item.location || 'SyncFit Facility'}
            </Text>
            <Text style={styles.historyTimeRange}>
              {dateFormatted} • {checkInFormatted}
              {checkOutFormatted ? ` - ${checkOutFormatted}` : ' (Active)'}
            </Text>
            {item.notes ? (
              <Text style={styles.historyNotes} numberOfLines={1}>
                {item.notes}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.historyCardRight}>
          {item.durationMinutes ? (
            <View style={styles.durationBadge}>
              <Ionicons name="flame" size={12} color="#f59e0b" />
              <Text style={styles.durationText}>{item.durationMinutes}m</Text>
            </View>
          ) : (
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isDenied
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: isDenied ? '#ef4444' : '#10b981' },
                ]}
              >
                {item.status === 'CHECKED_IN' ? 'IN GYM' : item.status}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />

      {/* Profile Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity & Account</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00f2fe"
            colors={['#00f2fe']}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Member Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={32} color="#00f2fe" />
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userProfile?.name || 'SyncFit Member'}
                </Text>
                <Text style={styles.profileEmail}>{userProfile?.email}</Text>

                <View style={styles.profileTagsRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {userProfile?.role || 'MEMBER'}
                    </Text>
                  </View>

                  <View style={styles.tierBadge}>
                    <Ionicons name="sparkles" size={11} color="#00f2fe" />
                    <Text style={styles.tierBadgeText}>
                      {userProfile?.memberTier || 'STANDARD'}
                    </Text>
                  </View>

                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>
                      {userProfile?.status || 'ACTIVE'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Server Settings Card */}
            <View style={styles.serverSettingsCard}>
              <View style={styles.serverHeaderRow}>
                <View style={styles.serverTitleRow}>
                  <Ionicons name="server-outline" size={18} color="#38bdf8" />
                  <Text style={styles.serverTitle}>Backend Connection</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditingApiUrl(!editingApiUrl)}
                >
                  <Text style={styles.serverEditText}>
                    {editingApiUrl ? 'Cancel' : 'Change'}
                  </Text>
                </TouchableOpacity>
              </View>

              {editingApiUrl ? (
                <View style={styles.serverEditRow}>
                  <TextInput
                    style={styles.serverInput}
                    value={customUrlInput}
                    onChangeText={setCustomUrlInput}
                    placeholder="http://10.0.2.2:8080"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.serverSaveButton}
                    onPress={handleSaveApiUrl}
                  >
                    <Text style={styles.serverSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.serverStatusPill}>
                  <View style={styles.greenDot} />
                  <Text style={styles.serverUrlText} numberOfLines={1}>
                    {currentApiUrl || 'Auto resolving...'}
                  </Text>
                </View>
              )}
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color="#ff4d4f" />
              <Text style={styles.signOutButtonText}>Sign Out of SyncFit</Text>
            </TouchableOpacity>

            {/* Attendance Logs Title */}
            <View style={styles.historyHeaderRow}>
              <Text style={styles.sectionTitle}>Attendance History</Text>
              <Text style={styles.sessionCountText}>
                {history.length} {history.length === 1 ? 'session' : 'sessions'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No Workout Sessions Yet</Text>
            <Text style={styles.emptySubtitle}>
              Scan the gym turnstile QR code to record your first visit!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listHeader: {
    gap: 16,
    marginBottom: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 16,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  profileTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  roleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  tierBadgeText: {
    color: '#00f2fe',
    fontSize: 10,
    fontWeight: '700',
  },
  activeTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeTagText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  serverSettingsCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  serverHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serverTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serverTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  serverEditText: {
    color: '#00f2fe',
    fontSize: 12,
    fontWeight: '600',
  },
  serverStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  serverUrlText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  serverEditRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  serverInput: {
    flex: 1,
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    color: '#ffffff',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  serverSaveButton: {
    backgroundColor: '#00f2fe',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serverSaveText: {
    color: '#0b0f19',
    fontSize: 12,
    fontWeight: '700',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.3)',
    gap: 8,
  },
  signOutButtonText: {
    color: '#ff4d4f',
    fontSize: 14,
    fontWeight: '700',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sessionCountText: {
    color: '#64748b',
    fontSize: 13,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  historyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDetails: {
    flex: 1,
  },
  historyGymName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  historyTimeRange: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  historyNotes: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  historyCardRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  durationText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});
