import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Colors, Radii } from '../theme/colors';
import { apiUpdateProfile, apiLogout, ApiError } from '../api/client';
import { Pengguna } from '../api/types';
import {
  LABEL_PERAN,
  formatWaktu,
  inisial,
} from '../constants/labels';

interface ProfileScreenProps {
  user: Pengguna;
  onBack: () => void;
  onLogout: () => void;
  onProfileUpdated: (updatedUser: Pengguna) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onLogout,
  onProfileUpdated,
}) => {
  const [currentUser, setCurrentUser] = useState<Pengguna>(user);

  // Form Ubah Profil (Selaras ProfilPage.tsx)
  const [name, setName] = useState<string>(user?.name ?? '');
  const [phone, setPhone] = useState<string>(user?.phone ?? '');
  const [bankName, setBankName] = useState<string>(user?.bank_name ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(
    user?.bank_account_number ?? ''
  );
  const [bankAccountName, setBankAccountName] = useState<string>(
    user?.bank_account_name ?? ''
  );
  const [menyimpanProfil, setMenyimpanProfil] = useState<boolean>(false);
  const [infoProfil, setInfoProfil] = useState<string | null>(null);
  const [galatProfil, setGalatProfil] = useState<string | null>(null);

  // Form Ganti Kata Sandi (Selaras ProfilPage.tsx)
  const [sandiLama, setSandiLama] = useState<string>('');
  const [sandiBaru, setSandiBaru] = useState<string>('');
  const [sandiKonfirmasi, setSandiKonfirmasi] = useState<string>('');
  const [menyimpanSandi, setMenyimpanSandi] = useState<boolean>(false);
  const [infoSandi, setInfoSandi] = useState<string | null>(null);
  const [galatSandi, setGalatSandi] = useState<string | null>(null);

  const handleSimpanProfil = async () => {
    setInfoProfil(null);
    setGalatProfil(null);
    if (!name.trim()) {
      setGalatProfil('Nama wajib diisi.');
      return;
    }

    setMenyimpanProfil(true);
    try {
      const res = await apiUpdateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        bank_name: bankName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        bank_account_name: bankAccountName.trim() || null,
      });
      setCurrentUser(res.data);
      onProfileUpdated(res.data);
      setInfoProfil('Profil berhasil diperbarui.');
    } catch (err: any) {
      setGalatProfil(
        err instanceof ApiError
          ? err.firstError || err.message
          : err?.message || 'Gagal menyimpan profil.'
      );
    } finally {
      setMenyimpanProfil(false);
    }
  };

  const handleSimpanSandi = async () => {
    setInfoSandi(null);
    setGalatSandi(null);
    if (!sandiLama || !sandiBaru) {
      setGalatSandi('Isi kata sandi saat ini dan kata sandi baru.');
      return;
    }
    if (sandiBaru !== sandiKonfirmasi) {
      setGalatSandi('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setMenyimpanSandi(true);
    try {
      const res = await apiUpdateProfile({
        name: currentUser.name,
        current_password: sandiLama,
        password: sandiBaru,
        password_confirmation: sandiKonfirmasi,
      });
      setCurrentUser(res.data);
      onProfileUpdated(res.data);
      setSandiLama('');
      setSandiBaru('');
      setSandiKonfirmasi('');
      setInfoSandi('Kata sandi berhasil diperbarui.');
    } catch (err: any) {
      setGalatSandi(
        err instanceof ApiError
          ? err.firstError || err.message
          : err?.message || 'Gagal mengganti kata sandi.'
      );
    } finally {
      setMenyimpanSandi(false);
    }
  };

  const handleConfirmLogout = () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Keluar dari akun Anda?')) return;
      apiLogout().finally(() => onLogout());
      return;
    }

    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await apiLogout();
          onLogout();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* PageHeader (Selaras ProfilPage.tsx) */}
      <View style={styles.pageTitle}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowBar} />
          <Text style={styles.eyebrowText}>AKUN</Text>
        </View>
        <Text style={styles.h1}>Profil</Text>
        <Text style={styles.pageDesc}>
          Informasi akun, rekening pencairan dana, dan pengaturan kata sandi.
        </Text>
      </View>

      {/* Panel: Profil Akun (.kartu-profil + .pasangan di ProfilPage.tsx) */}
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View>
            <Text style={styles.panelTitle}>Profil Akun</Text>
            <Text style={styles.panelSub}>
              Data kepegawaian yang terdaftar di sistem
            </Text>
          </View>
        </View>
        <View style={styles.panelBody}>
          <View style={styles.kartuProfil}>
            <View style={styles.avatarBesar}>
              <Text style={styles.avatarBesarText}>
                {inisial(currentUser.name)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profilNama}>{currentUser.name}</Text>
              <Text style={styles.profilEmail}>{currentUser.email}</Text>
              <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                <View style={styles.roleBadge}>
                  <View style={styles.roleDot} />
                  <Text style={styles.roleBadgeText}>
                    {currentUser.role_label || LABEL_PERAN[currentUser.role]}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Nomor karyawan</Text>
            <Text style={styles.pasanganDd}>
              {currentUser.employee_number || '—'}
            </Text>
          </View>
          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Jabatan</Text>
            <Text style={styles.pasanganDd}>
              {currentUser.position || '—'}
            </Text>
          </View>
          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Departemen</Text>
            <Text style={styles.pasanganDd}>
              {currentUser.department?.name || '—'}
            </Text>
          </View>
          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Supervisor</Text>
            <Text style={styles.pasanganDd}>
              {currentUser.supervisor?.name || '—'}
            </Text>
          </View>
          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Rekening</Text>
            <Text style={styles.pasanganDd}>
              {currentUser.bank_name
                ? `${currentUser.bank_name} · ${
                    currentUser.bank_account_number ?? ''
                  } (${currentUser.bank_account_name ?? ''})`
                : 'Belum diatur'}
            </Text>
          </View>
          <View style={[styles.pasanganRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.pasanganDt}>Terakhir masuk</Text>
            <Text style={styles.pasanganDd}>
              {formatWaktu(currentUser.last_login_at)}
            </Text>
          </View>
        </View>
      </View>

      {/* Panel: Ubah Profil */}
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View>
            <Text style={styles.panelTitle}>Ubah Profil</Text>
            <Text style={styles.panelSub}>
              Perbarui nama, telepon, dan rekening bank untuk pencairan dana
            </Text>
          </View>
        </View>
        <View style={styles.panelBody}>
          {galatProfil ? (
            <View style={styles.kotakGalat}>
              <Text style={styles.kotakGalatText}>{galatProfil}</Text>
            </View>
          ) : null}
          {infoProfil ? (
            <View style={styles.kotakInfo}>
              <Text style={styles.kotakInfoText}>{infoProfil}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Nama lengkap *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nomor telepon</Text>
            <TextInput
              style={styles.input}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={Colors.tintaRedup}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nama bank</Text>
            <TextInput
              style={styles.input}
              placeholder="Mis. BCA, Mandiri, BNI"
              placeholderTextColor={Colors.tintaRedup}
              value={bankName}
              onChangeText={setBankName}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nomor rekening</Text>
            <TextInput
              style={styles.input}
              value={bankAccountNumber}
              onChangeText={setBankAccountNumber}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nama pemilik rekening</Text>
            <TextInput
              style={styles.input}
              value={bankAccountName}
              onChangeText={setBankAccountName}
            />
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity
              style={[styles.btnUtama, menyimpanProfil && styles.btnDisabled]}
              onPress={handleSimpanProfil}
              disabled={menyimpanProfil}
            >
              <Text style={styles.btnUtamaText}>
                {menyimpanProfil ? 'Menyimpan…' : 'Simpan Profil'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Panel: Ganti Kata Sandi */}
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View>
            <Text style={styles.panelTitle}>Ganti Kata Sandi</Text>
            <Text style={styles.panelSub}>
              Gunakan kata sandi minimal 8 karakter
            </Text>
          </View>
        </View>
        <View style={styles.panelBody}>
          {galatSandi ? (
            <View style={styles.kotakGalat}>
              <Text style={styles.kotakGalatText}>{galatSandi}</Text>
            </View>
          ) : null}
          {infoSandi ? (
            <View style={styles.kotakInfo}>
              <Text style={styles.kotakInfoText}>{infoSandi}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Kata sandi saat ini *</Text>
            <TextInput
              style={styles.input}
              value={sandiLama}
              onChangeText={setSandiLama}
              secureTextEntry
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kata sandi baru *</Text>
            <TextInput
              style={styles.input}
              value={sandiBaru}
              onChangeText={setSandiBaru}
              secureTextEntry
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ulangi kata sandi baru *</Text>
            <TextInput
              style={styles.input}
              value={sandiKonfirmasi}
              onChangeText={setSandiKonfirmasi}
              secureTextEntry
            />
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity
              style={[styles.btnSekunder, menyimpanSandi && styles.btnDisabled]}
              onPress={handleSimpanSandi}
              disabled={menyimpanSandi}
            >
              <Text style={styles.btnSekunderText}>
                {menyimpanSandi ? 'Memperbarui…' : 'Perbarui Kata Sandi'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tombol Keluar (Selaras Sidebar.tsx tombol-keluar) */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.btnSekunder}
          onPress={handleConfirmLogout}
        >
          <Text style={styles.btnSekunderText}>Keluar dari Akun</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.latar,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: Colors.latarSorot,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderRadius: Radii.lg,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  eyebrowBar: {
    width: 16,
    height: 3,
    backgroundColor: Colors.ketiga,
    borderRadius: 2,
  },
  eyebrowText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: Colors.tintaLembut,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Colors.tinta,
  },
  pageDesc: {
    color: Colors.tintaLembut,
    fontSize: 13.5,
    marginTop: 4,
    lineHeight: 19,
  },
  panel: {
    marginBottom: 16,
    backgroundColor: Colors.latarSorot,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderRadius: Radii.lg,
    padding: 14,
  },
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garisTegas,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.tinta,
  },
  panelSub: {
    fontSize: 13,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  panelBody: {
    paddingTop: 14,
  },
  kartuProfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
  },
  avatarBesar: {
    width: 54,
    height: 54,
    borderRadius: Radii.pill,
    backgroundColor: Colors.ketiga,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBesarText: {
    color: Colors.kedua,
    fontSize: 18,
    fontWeight: '800',
  },
  profilNama: {
    fontSize: 16.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  profilEmail: {
    fontSize: 13,
    color: Colors.tintaLembut,
    marginTop: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    backgroundColor: Colors.ketiga,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.tinta,
  },
  roleBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  pasanganRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
  },
  pasanganDt: {
    fontSize: 12,
    color: Colors.tintaLembut,
    marginBottom: 2,
  },
  pasanganDd: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.tinta,
  },
  kotakGalat: {
    backgroundColor: Colors.ketiga,
    borderWidth: 1,
    borderColor: Colors.kedua,
    borderLeftWidth: 4,
    borderLeftColor: Colors.kedua,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 14,
  },
  kotakGalatText: {
    color: Colors.kedua,
    fontSize: 13,
    fontWeight: '600',
  },
  kotakInfo: {
    backgroundColor: Colors.latarSorot,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderLeftWidth: 4,
    borderLeftColor: Colors.ketiga,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 14,
  },
  kotakInfoText: {
    color: Colors.tinta,
    fontSize: 13,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.tinta,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: Colors.tinta,
    backgroundColor: Colors.latar,
    borderWidth: 1.5,
    borderColor: Colors.garisTegas,
    borderRadius: Radii.md,
  },
  btnUtama: {
    backgroundColor: Colors.tinta,
    borderWidth: 1,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  btnUtamaText: {
    color: Colors.utama,
    fontSize: 13,
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
  btnDisabled: {
    opacity: 0.5,
  },
  logoutSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.garisTegas,
  },
});

