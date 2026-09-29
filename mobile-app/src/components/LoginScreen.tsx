import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn, isLoading, activeGymId, activeGym } = useAuth();
  const [gymId, setGymId] = useState(activeGymId || 'SYNCLINK-MAIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedGymName, setVerifiedGymName] = useState<string | null>(
    activeGym?.name || 'SyncFit Flagship Gym'
  );

  // Sync with context if activeGymId updates
  React.useEffect(() => {
    if (activeGymId) {
      setGymId(activeGymId);
    }
    if (activeGym?.name) {
      setVerifiedGymName(activeGym.name);
    }
  }, [activeGymId, activeGym]);

  const handleGymIdChange = (text: string) => {
    const formatted = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setGymId(formatted);
    setErrorMessage(null);
  };

  const handleLogin = async () => {
    if (!gymId.trim()) {
      setErrorMessage('Please enter your alphanumeric Gym ID (e.g. SYNCLINK-MAIN or SYNC-8F2B).');
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setErrorMessage(null);
    try {
      await signIn(gymId.trim(), email.trim(), password);
    } catch (err: any) {
      console.warn('Sign-in error:', err);
      let message = 'Failed to sign in. Please verify your credentials and Gym ID.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        message = 'Invalid email or password for this gym. Please check your credentials.';
      } else if (err.code === 'auth/user-not-found') {
        message = `No active member account found for ${gymId.trim()} with this email.`;
      } else if (err.code === 'auth/invalid-email') {
        message = 'Invalid email address format.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMessage(message);
    }
  };

  const handleQuickFillAdmin = () => {
    setGymId('SYNCLINK-MAIN');
    setEmail('admin@syncfit.com');
    setPassword('AdminPassword123!');
    setErrorMessage(null);
    setVerifiedGymName('SyncFit Flagship Gym');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header / Brand */}
        <View style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="barbell" size={42} color="#00f2fe" />
          </View>
          <Text style={styles.brandTitle}>
            SYNC<Text style={styles.brandHighlight}>FIT</Text>
          </Text>
          <Text style={styles.brandSubtitle}>Member Check-In & Facility Access</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Member Sign In</Text>
          <Text style={styles.cardSubheading}>
            Enter your Gym ID, email and password to access facility turnstiles
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#ff4d4f" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Gym ID Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Gym Facility ID</Text>
              {verifiedGymName && (
                <View style={styles.facilityBadge}>
                  <Ionicons name="business" size={11} color="#00f2fe" />
                  <Text style={styles.facilityBadgeText} numberOfLines={1}>
                    {verifiedGymName}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Ionicons
                name="business-outline"
                size={20}
                color="#00f2fe"
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.gymIdInput]}
                placeholder="e.g. SYNCLINK-MAIN or SYNC-8F2B"
                placeholderTextColor="#475569"
                autoCapitalize="characters"
                autoCorrect={false}
                value={gymId}
                onChangeText={handleGymIdChange}
                editable={!isLoading}
              />
            </View>
            <Text style={styles.inputHint}>
              Alphanumeric ID provided by your gym (e.g. SYNC-XXXX)
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Member Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#0f172a" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.loginButtonText}>Sign In to Gym</Text>
                <Ionicons name="arrow-forward" size={18} color="#0f172a" />
              </View>
            )}
          </TouchableOpacity>

          {/* Quick Fill Admin for Fast Testing */}
          <TouchableOpacity
            style={styles.quickFillButton}
            onPress={handleQuickFillAdmin}
            disabled={isLoading}
          >
            <Ionicons name="key-outline" size={14} color="#38bdf8" />
            <Text style={styles.quickFillText}>Quick-fill Flagship Gym Demo</Text>
          </TouchableOpacity>
        </View>

        {/* Multi-Gym & Membership Notice */}
        <View style={styles.noticeBox}>
          <Ionicons name="swap-horizontal-outline" size={22} color="#00f2fe" />
          <View style={styles.noticeTextContainer}>
            <Text style={styles.noticeTitle}>Joining a New Gym?</Text>
            <Text style={styles.noticeDesc}>
              If you leave one gym and join another on SyncFit, enter your new gym's ID above. You can register with the same email and contact number across multiple gyms without conflict.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#ffffff',
  },
  brandHighlight: {
    color: '#00f2fe',
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  cardSubheading: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 79, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 79, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    gap: 8,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  facilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    maxWidth: '55%',
  },
  facilityBadgeText: {
    color: '#00f2fe',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  gymIdInput: {
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#00f2fe',
  },
  inputHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 5,
    paddingLeft: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#00f2fe',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#0b0f19',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quickFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 8,
    gap: 6,
  },
  quickFillText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '500',
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 242, 254, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.15)',
    gap: 12,
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
});
