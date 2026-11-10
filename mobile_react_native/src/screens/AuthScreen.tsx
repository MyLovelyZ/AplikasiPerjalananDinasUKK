import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  StatusBar as RNStatusBar,
  useWindowDimensions,
} from 'react-native';
import { Colors, Radii } from '../theme/colors';
import {
  apiLogin,
  getApiUrl,
  setApiUrl,
  ApiError,
  CURRENT_LAN_IP,
} from '../api/client';
import { Pengguna } from '../api/types';

interface AuthScreenProps {
  onLoginSuccess: (user: Pengguna) => void;
}

const AKUN_CONTOH = [
  { peran: 'Super Admin', email: 'admin@citramandiri.test' },
  { peran: 'Supervisor (IT)', email: 'supervisor@citramandiri.test' },
  { peran: 'Supervisor (HR)', email: 'supervisor.hr@citramandiri.test' },
  { peran: 'Supervisor (Marketing)', email: 'supervisor.mkt@citramandiri.test' },
  { peran: 'Supervisor (Operasional)', email: 'supervisor.ops@citramandiri.test' },
  { peran: 'Manajer Keuangan', email: 'finance@citramandiri.test' },
  { peran: 'Karyawan (IT)', email: 'employee@citramandiri.test' },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768;
  const isCompactPhone = width < 380 || height < 730;

  const [email, setEmail] = useState('employee@citramandiri.test');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lupaTerbuka, setLupaTerbuka] = useState(false);

  // Host configurator untuk kemudahan uji di emulator / HP fisik
  const [showUrlSettings, setShowUrlSettings] = useState(false);
  const [customUrl, setCustomUrl] = useState(getApiUrl());

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Harap isi alamat email dan kata sandi.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const data = await apiLogin(email.trim(), password);
      onLoginSuccess(data.user);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.firstError || err.message);
      } else {
        setErrorMsg(err?.message || 'Gagal masuk. Periksa koneksi backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      setApiUrl(customUrl.trim());
      Alert.alert(
        'Host Tersimpan',
        `API Endpoint diatur ke:\n${customUrl.trim()}`
      );
      setShowUrlSettings(false);
    }
  };

  const setPresetUrl = (preset: 'emulator' | 'localhost' | 'lan') => {
    let url = `http://${CURRENT_LAN_IP}:8000/api`;
    if (preset === 'emulator') url = 'http://10.0.2.2:8000/api';
    if (preset === 'localhost') url = 'http://127.0.0.1:8000/api';
    setCustomUrl(url);
    setApiUrl(url);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Sisi Kiri / Atas: Brand Intro (Selaras .login-kiri di LoginPage.tsx) */}
        <View
          style={[
            styles.loginKiri,
            isCompactPhone && styles.loginKiriCompact,
            isWide && styles.loginKiriWide,
          ]}
        >
          <View style={styles.loginBrand}>
            <View style={styles.logoMark}>
              <Text style={styles.logoMarkText}>TP</Text>
            </View>
            <View>
              <Text style={styles.brandName}>Travel Portal</Text>
              <Text style={styles.brandSub}>PT. Citra Mandiri</Text>
            </View>
          </View>

          <View style={styles.loginIntro}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowBar} />
              <Text style={styles.eyebrowText}>SISTEM PERJALANAN DINAS</Text>
            </View>
            <Text
              style={[
                styles.introHeadline,
                isCompactPhone && styles.introHeadlineCompact,
              ]}
            >
              Perjalanan dinas, dari pengajuan sampai pencairan.
            </Text>
            <Text
              style={[
                styles.introDesc,
                isCompactPhone && styles.introDescCompact,
              ]}
            >
              Satu tempat untuk mengajukan perjalanan, memantau persetujuan,
              melaporkan pengeluaran, dan menerima pencairan dana.
            </Text>
          </View>

          <Text style={styles.loginFoot}>
            © {new Date().getFullYear()} PT. Citra Mandiri
          </Text>
        </View>

        {/* Sisi Kanan / Bawah: Form Masuk di atas #DFDFDF (Selaras .login-kanan di LoginPage.tsx) */}
        <View
          style={[
            styles.loginKanan,
            isCompactPhone && styles.loginKananCompact,
            isWide && styles.loginKananWide,
          ]}
        >
          <View style={styles.loginKartu}>
            <Text style={styles.loginTitle}>Masuk</Text>
            <Text style={styles.loginSub}>
              Gunakan akun perusahaan Anda untuk melanjutkan.
            </Text>

            {errorMsg ? (
              <View style={styles.kotakGalat}>
                <Text style={styles.kotakGalatText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="nama@citramandiri.test"
                placeholderTextColor={Colors.tintaRedup}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrorMsg('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Kata Sandi */}
            <View style={styles.field}>
              <View style={styles.barisLabel}>
                <Text style={styles.fieldLabel}>Kata sandi</Text>
                <TouchableOpacity onPress={() => setLupaTerbuka(true)}>
                  <Text style={styles.tautanKecil}>Lupa kata sandi?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputSandiWrap}>
                <TextInput
                  style={[styles.input, styles.inputSandi]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.tintaRedup}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setErrorMsg('');
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.tombolMata}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Text style={styles.tombolMataText}>
                    {showPassword ? 'Sembunyikan' : 'Lihat'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tombol Masuk (.btn.utama) */}
            <TouchableOpacity
              style={[styles.btnUtama, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.utama} size="small" />
              ) : (
                <Text style={styles.btnUtamaText}>Masuk →</Text>
              )}
            </TouchableOpacity>

            {/* Akun contoh (.akun-contoh) */}
            <View style={styles.akunContoh}>
              <View style={styles.akunContohKepala}>
                <Text style={styles.akunContohLabel}>AKUN CONTOH</Text>
                <Text style={styles.akunContohSandi}>
                  sandi: <Text style={styles.mono}>password</Text>
                </Text>
              </View>
              <View style={styles.akunContohDaftar}>
                {AKUN_CONTOH.map((a) => {
                  const aktif = email === a.email;
                  return (
                    <TouchableOpacity
                      key={a.email}
                      style={[
                        styles.akunContohItem,
                        aktif && styles.akunContohItemAktif,
                      ]}
                      onPress={() => {
                        setEmail(a.email);
                        setPassword('password');
                        setErrorMsg('');
                      }}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={styles.akunContohPeran}
                        numberOfLines={1}
                      >
                        {a.peran}
                      </Text>
                      <Text
                        style={[
                          styles.akunContohEmail,
                          aktif && styles.akunContohEmailAktif,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {a.email}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Pengaturan Host Server API (untuk kemudahan tes di HP/Emulator) */}
            <View style={styles.serverBox}>
              <TouchableOpacity
                style={styles.serverHeader}
                onPress={() => setShowUrlSettings((v) => !v)}
                activeOpacity={0.75}
              >
                <Text style={styles.serverLabel}>
                  ENDPOINT API: <Text style={styles.mono}>{getApiUrl()}</Text>
                </Text>
                <Text style={styles.serverToggle}>
                  {showUrlSettings ? 'Tutup' : 'Ubah'}
                </Text>
              </TouchableOpacity>

              {showUrlSettings && (
                <View style={styles.serverBody}>
                  <View style={styles.presetRow}>
                    <TouchableOpacity
                      style={styles.presetBtn}
                      onPress={() => setPresetUrl('lan')}
                    >
                      <Text style={styles.presetBtnText}>
                        LAN ({CURRENT_LAN_IP})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.presetBtn}
                      onPress={() => setPresetUrl('emulator')}
                    >
                      <Text style={styles.presetBtnText}>
                        Emulator (10.0.2.2)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.presetBtn}
                      onPress={() => setPresetUrl('localhost')}
                    >
                      <Text style={styles.presetBtnText}>Localhost</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={customUrl}
                    onChangeText={setCustomUrl}
                    placeholder="http://192.168.1.x:8000/api"
                    placeholderTextColor={Colors.tintaRedup}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.btnSekunder, { marginTop: 8 }]}
                    onPress={handleApplyUrl}
                  >
                    <Text style={styles.btnSekunderText}>Simpan Endpoint</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Dialog Lupa Kata Sandi (Selaras LoginPage.tsx) */}
      <Modal
        visible={lupaTerbuka}
        transparent
        animationType="fade"
        onRequestClose={() => setLupaTerbuka(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalWindow}>
            <View style={styles.modalHead}>
              <View>
                <Text style={styles.modalTitle}>Lupa Kata Sandi</Text>
                <Text style={styles.modalSub}>
                  Cara mengatur ulang kata sandi akun Anda
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setLupaTerbuka(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalParagraf}>
                Untuk keamanan akun perusahaan, pengaturan ulang kata sandi
                dilakukan melalui administrator sistem atau bagian SDM.
              </Text>
              <View style={styles.kotakInfo}>
                <Text style={styles.kotakInfoText}>
                  Hubungi <Text style={styles.bold}>admin@citramandiri.test</Text>{' '}
                  atau datang ke meja layanan TI dengan menyebutkan nomor
                  karyawan Anda.
                </Text>
              </View>
            </View>
            <View style={styles.modalFoot}>
              <TouchableOpacity
                style={styles.btnUtama}
                onPress={() => setLupaTerbuka(false)}
              >
                <Text style={styles.btnUtamaText}>Mengerti</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.latar,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentWide: {
    flexDirection: 'row',
    minHeight: '100%',
  },
  loginKiri: {
    backgroundColor: Colors.kedua,
    paddingHorizontal: 18,
    paddingTop:
      (Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 28) : 12) + 12,
    paddingBottom: 16,
    justifyContent: 'space-between',
    gap: 10,
  },
  loginKiriCompact: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  loginKiriWide: {
    width: '42%',
    paddingHorizontal: 32,
    paddingVertical: 36,
  },
  loginBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.ketiga,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    color: Colors.kedua,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  brandName: {
    color: Colors.utama,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  brandSub: {
    color: Colors.utamaRedup,
    fontSize: 12,
  },
  loginIntro: {
    maxWidth: 440,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  eyebrowBar: {
    width: 18,
    height: 3,
    backgroundColor: Colors.ketiga,
    borderRadius: 2,
  },
  eyebrowText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: Colors.ketiga,
  },
  introHeadline: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Colors.utama,
    marginBottom: 4,
  },
  introHeadlineCompact: {
    fontSize: 17,
    lineHeight: 22,
  },
  introDesc: {
    color: 'rgba(223, 223, 223, 0.78)',
    fontSize: 12.5,
    lineHeight: 18,
  },
  introDescCompact: {
    fontSize: 12,
    lineHeight: 16.5,
  },
  loginFoot: {
    fontSize: 11,
    color: Colors.utamaSamar,
  },
  loginKanan: {
    flex: 1,
    backgroundColor: Colors.latar,
    paddingHorizontal: 18,
    paddingVertical: 18,
    justifyContent: 'flex-start',
  },
  loginKananCompact: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  loginKananWide: {
    flex: 1,
    paddingHorizontal: 36,
    paddingVertical: 36,
    justifyContent: 'center',
  },
  loginKartu: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Colors.tinta,
  },
  loginSub: {
    color: Colors.tintaLembut,
    fontSize: 13.5,
    marginTop: 4,
    marginBottom: 16,
  },
  kotakGalat: {
    backgroundColor: Colors.ketiga,
    borderWidth: 1,
    borderColor: Colors.kedua,
    borderLeftWidth: 4,
    borderLeftColor: Colors.kedua,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  kotakGalatText: {
    color: Colors.kedua,
    fontSize: 13.5,
    fontWeight: '600',
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.tinta,
    marginBottom: 6,
  },
  barisLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tautanKecil: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.tinta,
    textDecorationLine: 'underline',
  },
  input: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.tinta,
    backgroundColor: Colors.latar,
    borderWidth: 1.5,
    borderColor: Colors.garisTegas,
    borderRadius: Radii.md,
  },
  inputSandiWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputSandi: {
    paddingRight: 95,
  },
  tombolMata: {
    position: 'absolute',
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  tombolMataText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.tintaLembut,
  },
  btnUtama: {
    backgroundColor: Colors.tinta,
    borderWidth: 1,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnUtamaText: {
    color: Colors.utama,
    fontSize: 14,
    fontWeight: '600',
  },
  btnSekunder: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  btnSekunderText: {
    color: Colors.tinta,
    fontSize: 13,
    fontWeight: '600',
  },
  akunContoh: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.garis,
  },
  akunContohKepala: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  akunContohLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.tintaLembut,
  },
  akunContohSandi: {
    fontSize: 12,
    color: Colors.tintaLembut,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
    color: Colors.tinta,
  },
  akunContohDaftar: {
    gap: 6,
  },
  akunContohItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    backgroundColor: Colors.latar,
    borderWidth: 1.5,
    borderColor: Colors.garis,
  },
  akunContohItemAktif: {
    borderColor: Colors.tinta,
    backgroundColor: Colors.latarSorot,
  },
  akunContohPeran: {
    fontWeight: '600',
    fontSize: 12.5,
    color: Colors.tinta,
    flexShrink: 0,
  },
  akunContohEmail: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11.5,
    color: Colors.tintaLembut,
    flexShrink: 1,
    textAlign: 'right',
  },
  akunContohEmailAktif: {
    color: Colors.tinta,
    fontWeight: '700',
  },
  serverBox: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.garis,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.tintaLembut,
    flex: 1,
  },
  serverToggle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.tinta,
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  serverBody: {
    marginTop: 10,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.garisTegas,
    alignItems: 'center',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.tinta,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(25, 39, 58, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalWindow: {
    backgroundColor: Colors.latar,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: Colors.tinta,
    overflow: 'hidden',
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.tinta,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.tinta,
  },
  modalBody: {
    padding: 18,
  },
  modalParagraf: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.tinta,
    marginBottom: 12,
  },
  kotakInfo: {
    backgroundColor: Colors.latarSorot,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderLeftWidth: 4,
    borderLeftColor: Colors.ketiga,
    borderRadius: Radii.md,
    padding: 12,
  },
  kotakInfoText: {
    fontSize: 13.5,
    color: Colors.tinta,
    lineHeight: 19,
  },
  bold: {
    fontWeight: '700',
  },
  modalFoot: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.garis,
    alignItems: 'flex-end',
  },
});

