import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { apiLogin, apiProfile, setApiUrl, getApiUrl } from '../api/client';

const { width } = Dimensions.get('window');

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [customIp, setCustomIp] = useState(getApiUrl());

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Perhatian', 'Mohon isi email dan password.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        Alert.alert(
          'Info Registrasi',
          'Akun pegawai dikelola langsung oleh administrator PT. Citra Mandiri. Silakan gunakan akun contoh yang tersedia atau hubungi bagian IT.'
        );
        setIsRegister(false);
        setLoading(false);
        return;
      }

      await apiLogin(email.trim(), password);
      const profileRes = await apiProfile();
      const userData = profileRes?.data ?? profileRes;
      onLoginSuccess(userData);
    } catch (err: any) {
      Alert.alert(
        'Gagal Masuk',
        err.message || 'Tidak dapat terhubung ke server backend. Pastikan backend Laravel sedang berjalan.'
      );
    } finally {
      setLoading(false);
    }
  };

  const autofill = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Decorative Dark Navy Circles from Figma */}
      <View style={styles.decorCircleTopRight} />
      <View style={styles.decorCircleBottomLeft} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Main Golden/Mustard Card from Figma */}
        <View style={styles.goldCard}>
          {/* Left / Top Brand Section */}
          <View style={styles.brandSection}>
            <Text style={styles.brandTitle}>Perjalanan Dinas</Text>
            <Text style={styles.brandSubtitle}>PT. Citra Mandiri</Text>
          </View>

          {/* Divider Line */}
          <View style={styles.divider} />

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Title: Login / Register */}
            <View style={styles.tabRow}>
              <TouchableOpacity onPress={() => setIsRegister(false)}>
                <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>Login</Text>
              </TouchableOpacity>
              <Text style={styles.tabSeparator}>|</Text>
              <TouchableOpacity onPress={() => setIsRegister(true)}>
                <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>Register</Text>
              </TouchableOpacity>
            </View>

            {isRegister && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Lengkap :</Text>
                <TextInput
                  style={styles.pillInput}
                  placeholder="Nama Lengkap"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gmail :</Text>
              <TextInput
                style={styles.pillInput}
                placeholder="nama@citramandiri.test"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password :</Text>
              <TextInput
                style={styles.pillInput}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Submit Pill Button (Dark Navy from Figma) */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{isRegister ? 'Daftar' : 'Masuk'}</Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Accounts */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>Akun Pengujian (Sandi: password):</Text>
              <View style={styles.demoChips}>
                {[
                  { label: 'Admin', email: 'admin@citramandiri.test' },
                  { label: 'Supervisor', email: 'supervisor@citramandiri.test' },
                  { label: 'Finance', email: 'finance@citramandiri.test' },
                  { label: 'Pegawai', email: 'employee@citramandiri.test' },
                ].map((acc) => (
                  <TouchableOpacity
                    key={acc.email}
                    style={styles.chip}
                    onPress={() => autofill(acc.email)}
                  >
                    <Text style={styles.chipText}>{acc.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Server Settings Toggle */}
            <TouchableOpacity
              style={styles.serverConfigToggle}
              onPress={() => setShowConfig(!showConfig)}
            >
              <Text style={styles.serverConfigToggleText}>
                {showConfig ? 'Sembunyikan Pengaturan IP' : '⚙️ Atur Alamat Backend API'}
              </Text>
            </TouchableOpacity>

            {showConfig && (
              <View style={styles.configBox}>
                <Text style={styles.configLabel}>URL API Backend:</Text>
                <TextInput
                  style={styles.configInput}
                  value={customIp}
                  onChangeText={(val) => {
                    setCustomIp(val);
                    setApiUrl(val);
                  }}
                  placeholder="http://192.168.1.xxx:8000/api"
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8ECEF', // Main Colour from Figma
    position: 'relative',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  // Decorative Large Navy Circles from Figma Mockup
  decorCircleTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primary, // #0C2340
    zIndex: 0,
  },
  decorCircleBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: Colors.primary, // #0C2340
    zIndex: 0,
  },
  // Mustard Gold Card from Figma Mockup
  goldCard: {
    width: Math.min(width - 36, 420),
    backgroundColor: Colors.secondary, // #DE8B0E
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    zIndex: 1,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 2,
    opacity: 0.95,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginVertical: 12,
  },
  formSection: {
    width: '100%',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  tabText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  tabTextActive: {
    color: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
    paddingBottom: 2,
  },
  tabSeparator: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    marginLeft: 8,
  },
  pillInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButton: {
    backgroundColor: Colors.primary, // #0C2340 from Figma
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  demoSection: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
  },
  demoTitle: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  demoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  serverConfigToggle: {
    marginTop: 14,
    alignItems: 'center',
  },
  serverConfigToggleText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    textDecorationLine: 'underline',
  },
  configBox: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 10,
  },
  configLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  configInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: Colors.primary,
  },
});
