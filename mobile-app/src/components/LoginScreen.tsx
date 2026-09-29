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
  Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn, isLoading, activeGymId, activeGym, sendPasswordReset } = useAuth();
  const [gymId, setGymId] = useState(activeGymId || 'SYNCLINK-MAIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedGymName, setVerifiedGymName] = useState<string | null>(
    activeGym?.name || 'SyncFit Flagship Gym'
  );

  // Option 1 Password Reset State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetGymId, setResetGymId] = useState(activeGymId || 'SYNCLINK-MAIN');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleOpenResetModal = () => {
    setResetGymId(gymId || activeGymId || 'SYNCLINK-MAIN');
    setResetEmail(email.trim());
    setResetStatus(null);
    setResetModalVisible(true);
  };

  const handleSendResetEmail = async () => {
    const cleanGId = resetGymId.trim().toUpperCase();
    const cleanMail = resetEmail.trim().toLowerCase();

    if (!cleanGId) {
      setResetStatus({
        type: 'error',
        message: 'Please enter your alphanumeric Gym Facility ID (e.g. SPAR-4531).',
      });
      return;
    }
    if (!cleanMail || !cleanMail.includes('@')) {
      setResetStatus({
        type: 'error',
        message: 'Please enter a valid member email address.',
      });
      return;
    }

    setIsResetting(true);
    setResetStatus(null);
    try {
      await sendPasswordReset(cleanGId, cleanMail);
      setResetStatus({
        type: 'success',
        message: `Password reset link sent! Firebase has dispatched a secure reset link to ${cleanMail}. Check your inbox (including promotions/spam) to set a new password, then sign in below.`,
      });
    } catch (err: any) {
      console.warn('Password reset error:', err);
      let msg = 'Failed to send password reset email. Please verify your Gym ID and email.';
      if (err.code === 'auth/user-not-found') {
        msg = `No member account found for "${cleanMail}" registered at gym "${cleanGId}".`;
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many requests. Please wait a moment before requesting another reset email.';
      } else if (err.message) {
        msg = err.message;
      }
      setResetStatus({ type: 'error', message: msg });
    } finally {
      setIsResetting(false);
    }
  };

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

          {/* Forgot Password Trigger */}
          <View style={styles.forgotPasswordRow}>
            <TouchableOpacity
              onPress={handleOpenResetModal}
              disabled={isLoading}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
            </TouchableOpacity>
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

      {/* Option 1 Password Reset Modal */}
      <Modal
        visible={resetModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setResetModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="key-outline" size={22} color="#00f2fe" />
              </View>
              <View style={styles.modalHeaderTextContainer}>
                <Text style={styles.modalTitle}>Reset Gym Password</Text>
                <Text style={styles.modalSubtitle}>
                  Firebase will send a reset link to your email inbox
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setResetModalVisible(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* How it works info banner */}
            <View style={styles.resetInfoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#38bdf8" />
              <Text style={styles.resetInfoText}>
                Because your account uses multi-tenant routing, enter the Gym ID of the facility you are accessing. The reset link will arrive in your real inbox.
              </Text>
            </View>

            {/* Status Feedback Banner */}
            {resetStatus && (
              <View
                style={[
                  styles.statusBanner,
                  resetStatus.type === 'success'
                    ? styles.statusBannerSuccess
                    : styles.statusBannerError,
                ]}
              >
                <Ionicons
                  name={
                    resetStatus.type === 'success'
                      ? 'checkmark-circle'
                      : 'alert-circle'
                  }
                  size={18}
                  color={resetStatus.type === 'success' ? '#22c55e' : '#ff4d4f'}
                />
                <Text
                  style={[
                    styles.statusBannerText,
                    resetStatus.type === 'success'
                      ? styles.statusSuccessText
                      : styles.statusErrorText,
                  ]}
                >
                  {resetStatus.message}
                </Text>
              </View>
            )}

            {/* Gym ID Field */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Gym Facility ID</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="business-outline"
                  size={18}
                  color="#00f2fe"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.gymIdInput]}
                  placeholder="e.g. SPAR-4531"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={resetGymId}
                  onChangeText={(t) =>
                    setResetGymId(t.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
                  }
                  editable={!isResetting}
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Registered Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={18}
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
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  editable={!isResetting}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[
                styles.resetSubmitButton,
                isResetting && styles.buttonDisabled,
              ]}
              onPress={handleSendResetEmail}
              disabled={isResetting}
              activeOpacity={0.8}
            >
              {isResetting ? (
                <ActivityIndicator color="#0f172a" size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="paper-plane-outline" size={16} color="#0f172a" />
                  <Text style={styles.resetSubmitButtonText}>
                    Send Reset Link
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setResetModalVisible(false)}
              disabled={isResetting}
            >
              <Text style={styles.modalCancelText}>
                {resetStatus?.type === 'success' ? 'Back to Sign In' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  forgotPasswordLink: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  modalHeaderTextContainer: {
    flex: 1,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 6,
  },
  resetInfoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    gap: 10,
    alignItems: 'flex-start',
  },
  resetInfoText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 10,
  },
  statusBannerSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusBannerError: {
    backgroundColor: 'rgba(255, 77, 79, 0.12)',
    borderColor: 'rgba(255, 77, 79, 0.3)',
  },
  statusBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  statusSuccessText: {
    color: '#4ade80',
    fontWeight: '500',
  },
  statusErrorText: {
    color: '#ff7875',
    fontWeight: '500',
  },
  resetSubmitButton: {
    backgroundColor: '#00f2fe',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  resetSubmitButtonText: {
    color: '#0b0f19',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  modalCancelText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});
