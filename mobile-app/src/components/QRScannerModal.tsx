import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import api, { type ScanResult } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const SCAN_FRAME_SIZE = Math.min(width * 0.72, 280);

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (result: ScanResult) => void;
  preferredAction?: 'AUTO' | 'CHECK_IN' | 'CHECK_OUT';
}

export default function QRScannerModal({
  visible,
  onClose,
  onScanSuccess,
  preferredAction = 'AUTO',
}: QRScannerModalProps) {
  const { refreshProfile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [action, setAction] = useState<'AUTO' | 'CHECK_IN' | 'CHECK_OUT'>(preferredAction);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Scanning laser animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setAction(preferredAction);
  }, [preferredAction]);

  useEffect(() => {
    if (visible) {
      setIsProcessing(false);
      setStatusMessage('');
      // Loop laser line animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, laserAnim]);

  const handleProcessQr = async (scannedData: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatusMessage('Processing gym access...');

    try {
      let qrToken = scannedData.trim();
      // If scanned payload is a JSON object with qrCodeKey
      if (qrToken.startsWith('{') && qrToken.endsWith('}')) {
        try {
          const parsed = JSON.parse(qrToken);
          if (parsed.qrCodeKey) {
            qrToken = parsed.qrCodeKey;
          }
        } catch {
          // keep original
        }
      }

      const result = await api.scanGymQr(qrToken, action);
      await refreshProfile();
      onScanSuccess(result);
      onClose();
    } catch (err: any) {
      console.warn('QR scan failed:', err);
      const msg = err.message || 'Access denied or invalid QR token.';
      setStatusMessage(msg);
      Alert.alert('Scan Failed', msg, [
        {
          text: 'Try Again',
          onPress: () => {
            setIsProcessing(false);
            setStatusMessage('');
          },
        },
      ]);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isProcessing) return;
    handleProcessQr(data);
  };

  /**
   * Fast Simulator / Test Helper:
   * Fetches active gym QR key from backend GET /v1/gym/qr and submits it immediately!
   */
  const handleSimulateActiveGymScan = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatusMessage('Fetching active gym QR from facility server...');
    try {
      const activeGym = await api.getActiveGymQr();
      if (!activeGym?.qrCodeKey) {
        throw new Error('No active gym QR code available on server.');
      }
      await handleProcessQr(activeGym.qrCodeKey);
    } catch (err: any) {
      setIsProcessing(false);
      setStatusMessage(err.message || 'Failed to fetch test gym QR.');
      Alert.alert('Simulation Error', err.message || 'Could not fetch gym QR.');
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      Alert.alert('Input Required', 'Please enter a valid gym QR code or token.');
      return;
    }
    handleProcessQr(manualCode.trim());
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_FRAME_SIZE - 4],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Permission Denied / Loading State */}
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color="#00f2fe" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionSubtitle}>
              SyncFit uses your camera to scan gym turnstile QR codes for instant check-in and check-out.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simulateFallbackButton}
              onPress={handleSimulateActiveGymScan}
            >
              <Ionicons name="flash-outline" size={18} color="#38bdf8" />
              <Text style={styles.simulateFallbackText}>
                Test with Flagship Gym QR (Simulator Mode)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closePermissionButton} onPress={onClose}>
              <Text style={styles.closePermissionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
          >
            {/* Dark Mask Overlay with Viewfinder Hole */}
            <View style={styles.overlay}>
              {/* Header Controls */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={onClose}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Scan Facility QR</Text>

                <View style={styles.headerRightActions}>
                  <TouchableOpacity
                    style={[styles.headerButton, torch && styles.headerButtonActive]}
                    onPress={() => setTorch(!torch)}
                  >
                    <Ionicons
                      name={torch ? 'flash' : 'flash-outline'}
                      size={20}
                      color={torch ? '#00f2fe' : '#ffffff'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                  >
                    <Ionicons name="camera-reverse-outline" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Mode Selector */}
              <View style={styles.actionSelector}>
                <TouchableOpacity
                  style={[
                    styles.actionTab,
                    action === 'AUTO' && styles.actionTabActive,
                  ]}
                  onPress={() => setAction('AUTO')}
                >
                  <Ionicons
                    name="sync-outline"
                    size={14}
                    color={action === 'AUTO' ? '#0b0f19' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.actionTabText,
                      action === 'AUTO' && styles.actionTabTextActive,
                    ]}
                  >
                    Auto
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionTab,
                    action === 'CHECK_IN' && styles.actionTabActive,
                  ]}
                  onPress={() => setAction('CHECK_IN')}
                >
                  <Ionicons
                    name="log-in-outline"
                    size={14}
                    color={action === 'CHECK_IN' ? '#0b0f19' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.actionTabText,
                      action === 'CHECK_IN' && styles.actionTabTextActive,
                    ]}
                  >
                    Check In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionTab,
                    action === 'CHECK_OUT' && styles.actionTabActive,
                  ]}
                  onPress={() => setAction('CHECK_OUT')}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={14}
                    color={action === 'CHECK_OUT' ? '#0b0f19' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.actionTabText,
                      action === 'CHECK_OUT' && styles.actionTabTextActive,
                    ]}
                  >
                    Check Out
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Viewfinder Target */}
              <View style={styles.viewfinderContainer}>
                <View style={styles.viewfinderFrame}>
                  {/* Corner Reticle Accents */}
                  <View style={[styles.corner, styles.cornerTopLeft]} />
                  <View style={[styles.corner, styles.cornerTopRight]} />
                  <View style={[styles.corner, styles.cornerBottomLeft]} />
                  <View style={[styles.corner, styles.cornerBottomRight]} />

                  {/* Animated Scanning Laser */}
                  {!isProcessing && (
                    <Animated.View
                      style={[
                        styles.laserLine,
                        { transform: [{ translateY: laserTranslateY }] },
                      ]}
                    />
                  )}

                  {/* Processing Overlay */}
                  {isProcessing && (
                    <View style={styles.processingOverlay}>
                      <ActivityIndicator size="large" color="#00f2fe" />
                      <Text style={styles.processingText}>Verifying Access...</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.instructionText}>
                  Align the gym entry/exit QR code inside the frame
                </Text>
                {statusMessage ? (
                  <Text style={styles.statusErrorText}>{statusMessage}</Text>
                ) : null}
              </View>

              {/* Bottom Quick Actions (Simulator / Manual Entry) */}
              <View style={styles.bottomControls}>
                <TouchableOpacity
                  style={styles.simulatorButton}
                  onPress={handleSimulateActiveGymScan}
                  disabled={isProcessing}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={18} color="#00f2fe" />
                  <Text style={styles.simulatorButtonText}>
                    Simulate Flagship Gym Scan
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.manualEntryToggle}
                  onPress={() => setShowManualInput(!showManualInput)}
                >
                  <Text style={styles.manualEntryToggleText}>
                    {showManualInput ? 'Hide Manual Code' : 'Enter QR Key Manually'}
                  </Text>
                </TouchableOpacity>

                {showManualInput && (
                  <View style={styles.manualInputRow}>
                    <TextInput
                      style={styles.manualInput}
                      placeholder="e.g. gym_qr_xxxx"
                      placeholderTextColor="#64748b"
                      value={manualCode}
                      onChangeText={setManualCode}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.manualSubmitButton}
                      onPress={handleManualSubmit}
                      disabled={isProcessing}
                    >
                      <Text style={styles.manualSubmitText}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </CameraView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#00f2fe',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  permissionButtonText: {
    color: '#0b0f19',
    fontSize: 16,
    fontWeight: '700',
  },
  simulateFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    gap: 8,
  },
  simulateFallbackText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  closePermissionButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  closePermissionText: {
    color: '#64748b',
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerButtonActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.25)',
    borderColor: '#00f2fe',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionSelector: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 10,
  },
  actionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 6,
  },
  actionTabActive: {
    backgroundColor: '#00f2fe',
  },
  actionTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  actionTabTextActive: {
    color: '#0b0f19',
    fontWeight: '700',
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#00f2fe',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  laserLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  processingText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  instructionText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statusErrorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomControls: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
  },
  simulatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1.5,
    borderColor: '#00f2fe',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  simulatorButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  manualEntryToggle: {
    marginTop: 14,
    paddingVertical: 6,
  },
  manualEntryToggleText: {
    color: '#94a3b8',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  manualInputRow: {
    flexDirection: 'row',
    marginTop: 10,
    width: '100%',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
  },
  manualSubmitButton: {
    backgroundColor: '#00f2fe',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualSubmitText: {
    color: '#0b0f19',
    fontWeight: '700',
    fontSize: 14,
  },
});
