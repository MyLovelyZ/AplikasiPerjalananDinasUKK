import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors, Radii, LightThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  apiEmployeeDashboard,
  getCachedDashboard,
} from '../api/client';
import { DashboardPegawai, Pengguna, Perjalanan } from '../api/types';
import {
  formatRupiah,
  rupiahRingkas,
  rentangTanggal,
  RUPA_STATUS_PERJALANAN,
  inisial,
  LABEL_PERAN,
} from '../constants/labels';

interface HomeScreenProps {
  user: Pengguna;
  onNavigate: (screen: string, params?: any) => void;
  onLogout: () => void;
}

const KOTA_POPULER = [
  { nama: 'Surabaya', kode: 'SUB', icon: '🏙️' },
  { nama: 'Bandung', kode: 'BDO', icon: '⛰️' },
  { nama: 'Yogyakarta', kode: 'YIA', icon: '🏛️' },
  { nama: 'Medan', kode: 'KNO', icon: '🌴' },
  { nama: 'Bali (DPS)', kode: 'DPS', icon: '🏖️' },
  { nama: 'Semarang', kode: 'SRG', icon: '🚢' },
  { nama: 'Makassar', kode: 'UPG', icon: '🌊' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onNavigate,
}) => {
  const { theme, isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [data, setData] = useState<DashboardPegawai | null>(() =>
    getCachedDashboard()
  );
  const [loading, setLoading] = useState<boolean>(() => !getCachedDashboard());
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Interactive Features State
  const [selectedTransport, setSelectedTransport] = useState<
    'plane' | 'train' | 'car' | 'bus'
  >('plane');
  const [selectedCity, setSelectedCity] = useState<string>('Surabaya');
  const [calcDays, setCalcDays] = useState<number>(3);
  const [calcType, setCalcType] = useState<'domestic' | 'international'>(
    'domestic'
  );
  const [recentFilter, setRecentFilter] = useState<
    'all' | 'submitted' | 'approved' | 'completed'
  >('all');

  const loadDashboard = useCallback(async () => {
    try {
      setErrorMsg('');
      const dashRes = await apiEmployeeDashboard();
      setData(dashRes);
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Gagal memuat beranda. Periksa koneksi backend.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const jamSekarang = new Date().getHours();
  const sapaanWaktu =
    jamSekarang < 11
      ? 'Selamat Pagi'
      : jamSekarang < 15
      ? 'Selamat Siang'
      : jamSekarang < 19
      ? 'Selamat Sore'
      : 'Selamat Malam';

  const tanggalHariIni = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const jumlah = (status: string) => data?.requests_by_status?.[status] ?? 0;
  const sedangDiproses = jumlah('submitted') + jumlah('supervisor_approved');
  const drafCount = jumlah('draft');
  const laporanPerluDiisi = data?.expense_reports_due?.length ?? 0;
  const totalPengajuan = data?.this_year?.requests ?? 0;

  // Real-time interactive allowance calculation
  const dailyRate = calcType === 'domestic' ? 450000 : 1500000;
  const hotelRate = calcType === 'domestic' ? 650000 : 2200000;
  const totalUangHarianSimulasi = dailyRate * calcDays;
  const totalHotelSimulasi = hotelRate * (calcDays - 1 > 0 ? calcDays - 1 : 1);
  const totalEstimasiSimulasi = totalUangHarianSimulasi + totalHotelSimulasi;

  // Filtered recent requests on the fly
  const filteredRecentRequests = useMemo(() => {
    if (!data?.recent_requests) return [];
    if (recentFilter === 'all') return data.recent_requests;
    if (recentFilter === 'submitted') {
      return data.recent_requests.filter(
        (r) => r.status === 'submitted' || r.status === 'supervisor_approved'
      );
    }
    return data.recent_requests.filter((r) => r.status === recentFilter);
  }, [data?.recent_requests, recentFilter]);

  if (loading && !refreshing && !data) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="small" color={colors.tinta} />
        <Text style={styles.loadingText}>Memuat Travel Portal…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.ketiga]}
          tintColor={colors.ketiga}
        />
      }
    >
      {/* ============================================================== */}
      {/* 1. TRAVELOKA-STYLE HEADER GREETING & STATUS CARD               */}
      {/* ============================================================== */}
      <View style={styles.travelokaHeaderCard}>
        <View style={styles.travelokaHeaderTop}>
          <View style={styles.travelokaAvatar}>
            <Text style={styles.travelokaAvatarText}>
              {inisial(user?.name ?? 'P')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.travelokaGreeting}>
              {sapaanWaktu},{' '}
              <Text style={styles.travelokaGreetingBold}>
                {user?.name?.split(' ')[0] ?? 'Pegawai'}
              </Text>{' '}
              👋
            </Text>
            <View style={styles.travelokaBadgeRow}>
              <View style={styles.travelokaCorpDot} />
              <Text style={styles.travelokaCorpText}>
                PT. Citra Mandiri · Karyawan
              </Text>
            </View>
          </View>

          <View style={styles.travelokaPillBadge}>
            <Text style={styles.travelokaPillIcon}>⭐</Text>
            <Text style={styles.travelokaPillText}>Dinas Aktif</Text>
          </View>
        </View>

        <Text style={styles.travelokaDateSubtitle}>
          {tanggalHariIni}
        </Text>
      </View>

      {/* ============================================================== */}
      {/* 2. TRAVELOKA 4-SERVICE ICON GRID (MENU UTAMA)                 */}
      {/* ============================================================== */}
      <View style={styles.serviceSection}>
        <View style={styles.serviceGrid}>
          {/* Menu 1: Ajukan SPPD */}
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => onNavigate('TripRequest')}
            activeOpacity={0.75}
          >
            <View style={[styles.serviceIconSquircle, styles.serviceIconPrimary]}>
              <Text style={styles.serviceIconEmoji}>✈️</Text>
            </View>
            <Text style={styles.serviceItemTitle}>Ajukan SPPD</Text>
            <Text style={styles.serviceItemSub}>Dinas Baru</Text>
          </TouchableOpacity>

          {/* Menu 2: Semua SPPD */}
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => onNavigate('TripList', { status: '' })}
            activeOpacity={0.75}
          >
            <View style={styles.serviceIconSquircle}>
              <Text style={styles.serviceIconEmoji}>📋</Text>
            </View>
            <Text style={styles.serviceItemTitle}>Perjalanan</Text>
            <Text style={styles.serviceItemSub}>{totalPengajuan} SPPD</Text>
          </TouchableOpacity>

          {/* Menu 3: Laporan LPJ */}
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => {
              const firstDue = data?.expense_reports_due?.[0];
              if (firstDue) {
                onNavigate('ExpenseReport', { tripId: firstDue.id });
              } else {
                onNavigate('TripList', { status: 'approved' });
              }
            }}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.serviceIconSquircle,
                laporanPerluDiisi > 0 && styles.serviceIconAlert,
              ]}
            >
              <Text style={styles.serviceIconEmoji}>🧾</Text>
              {laporanPerluDiisi > 0 ? (
                <View style={styles.serviceBadgeNotif}>
                  <Text style={styles.serviceBadgeNotifText}>
                    {laporanPerluDiisi}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.serviceItemTitle}>Laporan LPJ</Text>
            <Text style={styles.serviceItemSub}>Klaim Biaya</Text>
          </TouchableOpacity>

          {/* Menu 4: Pencairan Uang Muka */}
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => onNavigate('TripList', { status: 'approved' })}
            activeOpacity={0.75}
          >
            <View style={styles.serviceIconSquircle}>
              <Text style={styles.serviceIconEmoji}>💳</Text>
            </View>
            <Text style={styles.serviceItemTitle}>Pencairan</Text>
            <Text style={styles.serviceItemSub}>Uang Muka</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Galat jika gagal koneksi */}
      {errorMsg ? (
        <View style={styles.kotakGalat}>
          <Text style={styles.kotakGalatText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.btnKecilOutline}
            onPress={loadDashboard}
          >
            <Text style={styles.btnKecilOutlineText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ============================================================== */}
      {/* 3. TRAVELOKA INTERACTIVE BOOKING & CITY SELECTOR CARD          */}
      {/* ============================================================== */}
      <View style={styles.travelokaBookingCard}>
        <View style={styles.bookingCardHeader}>
          <View>
            <Text style={styles.bookingCardTitle}>Mau dinas ke mana?</Text>
            <Text style={styles.bookingCardSubtitle}>
              Pilih moda transportasi & kota tujuan dinas
            </Text>
          </View>
          <Text style={styles.bookingCardBadge}>SPPD Online</Text>
        </View>

        {/* Interactive Transport Selector Tabs */}
        <View style={styles.transportTabRow}>
          <TouchableOpacity
            style={[
              styles.transportTab,
              selectedTransport === 'plane' && styles.transportTabActive,
            ]}
            onPress={() => setSelectedTransport('plane')}
            activeOpacity={0.75}
          >
            <Text style={styles.transportTabEmoji}>✈️</Text>
            <Text
              style={[
                styles.transportTabText,
                selectedTransport === 'plane' && styles.transportTabTextActive,
              ]}
            >
              Pesawat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportTab,
              selectedTransport === 'train' && styles.transportTabActive,
            ]}
            onPress={() => setSelectedTransport('train')}
            activeOpacity={0.75}
          >
            <Text style={styles.transportTabEmoji}>🚆</Text>
            <Text
              style={[
                styles.transportTabText,
                selectedTransport === 'train' && styles.transportTabTextActive,
              ]}
            >
              Kereta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportTab,
              selectedTransport === 'car' && styles.transportTabActive,
            ]}
            onPress={() => setSelectedTransport('car')}
            activeOpacity={0.75}
          >
            <Text style={styles.transportTabEmoji}>🚗</Text>
            <Text
              style={[
                styles.transportTabText,
                selectedTransport === 'car' && styles.transportTabTextActive,
              ]}
            >
              Mobil
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.transportTab,
              selectedTransport === 'bus' && styles.transportTabActive,
            ]}
            onPress={() => setSelectedTransport('bus')}
            activeOpacity={0.75}
          >
            <Text style={styles.transportTabEmoji}>🚌</Text>
            <Text
              style={[
                styles.transportTabText,
                selectedTransport === 'bus' && styles.transportTabTextActive,
              ]}
            >
              Bus
            </Text>
          </TouchableOpacity>
        </View>

        {/* Route Selector Preview Box */}
        <TouchableOpacity
          style={styles.routeSelectorBox}
          onPress={() => onNavigate('TripRequest')}
          activeOpacity={0.8}
        >
          <View style={styles.routeTrack}>
            <View style={styles.routeDotOrigin} />
            <View style={styles.routeLineDashed} />
            <Text style={styles.routePlaneIcon}>
              {selectedTransport === 'plane'
                ? '✈️'
                : selectedTransport === 'train'
                ? '🚆'
                : selectedTransport === 'car'
                ? '🚗'
                : '🚌'}
            </Text>
            <View style={styles.routeLineDashed} />
            <View style={styles.routeDotDest} />
          </View>

          <View style={styles.routeLocations}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>DARI</Text>
              <Text style={styles.routeCityOrigin}>Kantor Pusat (Jakarta)</Text>
            </View>

            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.routeLabel}>TUJUAN DINAS</Text>
              <Text style={styles.routeCityDest}>{selectedCity} ➔</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Interactive Popular City Chips */}
        <View style={styles.popularCitiesSection}>
          <Text style={styles.popularCitiesLabel}>KOTA TUJUAN POPULER:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularCitiesScroll}
          >
            {KOTA_POPULER.map((k) => {
              const active = selectedCity.includes(k.nama);
              return (
                <TouchableOpacity
                  key={k.kode}
                  style={[
                    styles.popularCityChip,
                    active && styles.popularCityChipActive,
                  ]}
                  onPress={() => setSelectedCity(k.nama)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.popularCityIcon}>{k.icon}</Text>
                  <Text
                    style={[
                      styles.popularCityText,
                      active && styles.popularCityTextActive,
                    ]}
                  >
                    {k.nama}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tombol CTA Traveloka Style */}
        <TouchableOpacity
          style={styles.travelokaCtaButton}
          onPress={() => onNavigate('TripRequest')}
          activeOpacity={0.85}
        >
          <Text style={styles.travelokaCtaIcon}>🛫</Text>
          <Text style={styles.travelokaCtaText}>
            Ajukan SPPD ke {selectedCity}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 4. INTERACTIVE KALKULATOR ESTIMASI BIAYA DINAS                 */}
      {/* ============================================================== */}
      <View style={styles.calculatorCard}>
        <View style={styles.calculatorHeader}>
          <View>
            <Text style={styles.calculatorTitle}>
              Simulasi Uang Harian & Penginapan
            </Text>
            <Text style={styles.calculatorSubtitle}>
              Hitung estimasi tunjangan dinas berdasarkan durasi
            </Text>
          </View>
          <Text style={styles.calculatorBadge}>Kalkulator</Text>
        </View>

        {/* Controls: Durasi & Tipe */}
        <View style={styles.calcControlsRow}>
          {/* Tipe Dinas Selector */}
          <View style={styles.calcTypeToggle}>
            <TouchableOpacity
              style={[
                styles.calcTypeBtn,
                calcType === 'domestic' && styles.calcTypeBtnActive,
              ]}
              onPress={() => setCalcType('domestic')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.calcTypeText,
                  calcType === 'domestic' && styles.calcTypeTextActive,
                ]}
              >
                Domestik
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.calcTypeBtn,
                calcType === 'international' && styles.calcTypeBtnActive,
              ]}
              onPress={() => setCalcType('international')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.calcTypeText,
                  calcType === 'international' && styles.calcTypeTextActive,
                ]}
              >
                Luar Negeri
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stepper Durasi Hari */}
          <View style={styles.calcCounter}>
            <TouchableOpacity
              style={styles.calcBtn}
              onPress={() => setCalcDays((d) => Math.max(1, d - 1))}
              activeOpacity={0.7}
            >
              <Text style={styles.calcBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.calcDaysText}>{calcDays} Hari</Text>

            <TouchableOpacity
              style={styles.calcBtn}
              onPress={() => setCalcDays((d) => Math.min(30, d + 1))}
              activeOpacity={0.7}
            >
              <Text style={styles.calcBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Calculation Output Card */}
        <View style={styles.calcResultBox}>
          <View style={styles.calcResultRow}>
            <Text style={styles.calcResultLabel}>
              Uang Harian ({calcDays} hari @ {formatRupiah(dailyRate)})
            </Text>
            <Text style={styles.calcResultVal}>
              {formatRupiah(totalUangHarianSimulasi)}
            </Text>
          </View>

          <View style={styles.calcResultRow}>
            <Text style={styles.calcResultLabel}>
              Estimasi Hotel / Akomodasi
            </Text>
            <Text style={styles.calcResultVal}>
              {formatRupiah(totalHotelSimulasi)}
            </Text>
          </View>

          <View style={styles.calcTotalRow}>
            <Text style={styles.calcTotalLabel}>Perkiraan Total Anggaran</Text>
            <Text style={styles.calcTotalVal}>
              {formatRupiah(totalEstimasiSimulasi)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.btnPakaiEstimasi}
          onPress={() => onNavigate('TripRequest')}
          activeOpacity={0.8}
        >
          <Text style={styles.btnPakaiEstimasiText}>
            Gunakan Estimasi Ini ➔ Buat Pengajuan
          </Text>
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* 5. INTERACTIVE ALUR & TIMELINE SPPD (FLOW TRACKER)            */}
      {/* ============================================================== */}
      <View style={styles.stepFlowCard}>
        <View style={styles.sectionHeadRow}>
          <View>
            <Text style={styles.sectionHeadTitle}>Alur Persetujuan SPPD</Text>
            <Text style={styles.sectionHeadSub}>
              Proses perjalanan dinas dari draf sampai LPJ selesai
            </Text>
          </View>
        </View>

        <View style={styles.stepFlowRow}>
          <View style={styles.stepNode}>
            <View style={[styles.stepIconWrap, styles.stepIconWrapActive]}>
              <Text style={styles.stepIcon}>📝</Text>
            </View>
            <Text style={styles.stepLabel}>1. Ajukan</Text>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.stepNode}>
            <View
              style={[
                styles.stepIconWrap,
                sedangDiproses > 0 && styles.stepIconWrapActive,
              ]}
            >
              <Text style={styles.stepIcon}>👤</Text>
            </View>
            <Text style={styles.stepLabel}>2. Supervisor</Text>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.stepNode}>
            <View style={styles.stepIconWrap}>
              <Text style={styles.stepIcon}>💰</Text>
            </View>
            <Text style={styles.stepLabel}>3. Keuangan</Text>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.stepNode}>
            <View
              style={[
                styles.stepIconWrap,
                laporanPerluDiisi > 0 && styles.stepIconWrapAlert,
              ]}
            >
              <Text style={styles.stepIcon}>🧾</Text>
            </View>
            <Text style={styles.stepLabel}>4. LPJ Biaya</Text>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 6. TRAVELOKA BOARDING PASS / E-TIKET (PERJALANAN AKTIF)        */}
      {/* ============================================================== */}
      {data?.current_trip ? (
        <View style={styles.boardingPassCard}>
          {/* Header Boarding Pass */}
          <View style={styles.boardingPassTop}>
            <View style={styles.boardingPassBrand}>
              <Text style={styles.boardingPassIcon}>✈️</Text>
              <Text style={styles.boardingPassType}>TIKET PERJALANAN AKTIF</Text>
            </View>
            <View style={styles.boardingPassStatusBadge}>
              <View style={styles.boardingPassStatusDot} />
              <Text style={styles.boardingPassStatusText}>
                Sedang Berlangsung
              </Text>
            </View>
          </View>

          {/* Rute Boarding Pass */}
          <View style={styles.boardingPassRoute}>
            <View>
              <Text style={styles.boardingPassCity}>JKT</Text>
              <Text style={styles.boardingPassAirport}>Kantor Pusat</Text>
            </View>

            <View style={styles.boardingPassFlight}>
              <Text style={styles.boardingPassPlane}>➔ ✈️ ➔</Text>
              <Text style={styles.boardingPassRequestNumber}>
                {data.current_trip.request_number}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.boardingPassCity}>
                {data.current_trip.destination.substring(0, 3).toUpperCase()}
              </Text>
              <Text style={styles.boardingPassAirport}>
                {data.current_trip.destination}
              </Text>
            </View>
          </View>

          {/* Dashed Perforated Separator with Notches */}
          <View style={styles.perforatedRow}>
            <View style={styles.perforatedNotchLeft} />
            <View style={styles.perforatedLine} />
            <View style={styles.perforatedNotchRight} />
          </View>

          {/* Detail Boarding Pass */}
          <View style={styles.boardingPassBottom}>
            <View>
              <Text style={styles.boardingPassMetaLabel}>JADWAL PERJALANAN</Text>
              <Text style={styles.boardingPassMetaVal}>
                {rentangTanggal(
                  data.current_trip.departure_date,
                  data.current_trip.return_date
                )}
              </Text>
              <Text style={styles.boardingPassPurpose} numberOfLines={1}>
                {data.current_trip.purpose}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.boardingPassActionBtn}
              onPress={() =>
                onNavigate('TripDetail', { tripId: data.current_trip?.id })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.boardingPassActionBtnText}>
                Lihat SPPD ➔
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* ============================================================== */}
      {/* 7. TRAVELOKA TO-DO: TUGAS PRIORITAS & REMINDER               */}
      {/* ============================================================== */}
      {(laporanPerluDiisi > 0 || drafCount > 0) && (
        <View style={styles.travelokaSectionCard}>
          <View style={styles.sectionHeadRow}>
            <View>
              <Text style={styles.sectionHeadTitle}>Tindakan Prioritas</Text>
              <Text style={styles.sectionHeadSub}>
                Tugas yang memerlukan perhatian Anda segera
              </Text>
            </View>
          </View>

          {laporanPerluDiisi > 0 && (
            <TouchableOpacity
              style={[styles.taskItemCard, styles.taskItemCardAlert]}
              onPress={() => {
                const firstDue = data?.expense_reports_due?.[0];
                if (firstDue) {
                  onNavigate('ExpenseReport', { tripId: firstDue.id });
                } else {
                  onNavigate('TripList', { status: 'approved' });
                }
              }}
              activeOpacity={0.75}
            >
              <View style={styles.taskIconBubble}>
                <Text style={styles.taskIconEmoji}>🧾</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskItemTitle}>
                  {laporanPerluDiisi} Laporan Biaya (LPJ) Perlu Diisi
                </Text>
                <Text style={styles.taskItemSub}>
                  Selesaikan bukti pengeluaran agar pencairan dapat diproses.
                </Text>
              </View>
              <View style={styles.taskPillBtn}>
                <Text style={styles.taskPillBtnText}>Isi LPJ ➔</Text>
              </View>
            </TouchableOpacity>
          )}

          {drafCount > 0 && (
            <TouchableOpacity
              style={[styles.taskItemCard, { marginTop: 8 }]}
              onPress={() => onNavigate('TripList', { status: 'draft' })}
              activeOpacity={0.75}
            >
              <View style={styles.taskIconBubble}>
                <Text style={styles.taskIconEmoji}>📝</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskItemTitle}>
                  {drafCount} Draf Pengajuan Belum Dikirim
                </Text>
                <Text style={styles.taskItemSub}>
                  Lengkapi data dan kirimkan ke supervisor untuk persetujuan.
                </Text>
              </View>
              <View style={styles.taskPillBtnSecondary}>
                <Text style={styles.taskPillBtnSecondaryText}>Buka ➔</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ============================================================== */}
      {/* 8. TRAVELOKA REKAP TAHUNAN & STATUS PILLS                    */}
      {/* ============================================================== */}
      <View style={styles.travelokaSectionCard}>
        <View style={styles.sectionHeadRow}>
          <View>
            <Text style={styles.sectionHeadTitle}>
              Statistik Dinas ({new Date().getFullYear()})
            </Text>
            <Text style={styles.sectionHeadSub}>
              Ringkasan perjalanan kerja dan biaya
            </Text>
          </View>
        </View>

        <View style={styles.statGrid2Col}>
          <TouchableOpacity
            style={styles.statCardItem}
            onPress={() => onNavigate('TripList', { status: '' })}
            activeOpacity={0.75}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardIcon}>🛫</Text>
              <Text style={styles.statCardArrow}>↗</Text>
            </View>
            <Text style={styles.statCardVal}>
              {data?.this_year?.requests ?? 0}
            </Text>
            <Text style={styles.statCardLabel}>Total Pengajuan</Text>
            <Text style={styles.statCardSub}>
              {jumlah('completed')} selesai · {jumlah('approved')} disetujui
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCardItem}
            onPress={() => onNavigate('TripList', { status: 'submitted' })}
            activeOpacity={0.75}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardIcon}>⏳</Text>
              <Text style={styles.statCardArrow}>↗</Text>
            </View>
            <Text
              style={[
                styles.statCardVal,
                sedangDiproses > 0 && styles.statHighlightVal,
              ]}
            >
              {sedangDiproses}
            </Text>
            <Text style={styles.statCardLabel}>Sedang Diproses</Text>
            <Text style={styles.statCardSub}>
              {jumlah('submitted')} supervisor ·{' '}
              {jumlah('supervisor_approved')} finance
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statGrid2Col, { marginTop: 10 }]}>
          <TouchableOpacity
            style={styles.statCardItem}
            onPress={() => onNavigate('TripList', { status: 'approved' })}
            activeOpacity={0.75}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardIcon}>💵</Text>
              <Text style={styles.statCardArrow}>↗</Text>
            </View>
            <Text style={styles.statCardVal}>
              {rupiahRingkas(data?.this_year?.approved_estimated_cost ?? 0)}
            </Text>
            <Text style={styles.statCardLabel}>Biaya Disetujui</Text>
            <Text style={styles.statCardSub}>Estimasi biaya disetujui</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCardItem}
            onPress={() => onNavigate('TripList', { status: 'completed' })}
            activeOpacity={0.75}
          >
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardIcon}>✅</Text>
              <Text style={styles.statCardArrow}>↗</Text>
            </View>
            <Text style={styles.statCardVal}>
              {rupiahRingkas(data?.this_year?.verified_expenses ?? 0)}
            </Text>
            <Text style={styles.statCardLabel}>Biaya Realisasi</Text>
            <Text style={styles.statCardSub}>LPJ diverifikasi keuangan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 9. TRAVELOKA TIPS & PANDUAN PERJALANAN DINAS                   */}
      {/* ============================================================== */}
      <View style={styles.travelokaSectionCard}>
        <View style={styles.sectionHeadRow}>
          <View>
            <Text style={styles.sectionHeadTitle}>Panduan & Info Dinas</Text>
            <Text style={styles.sectionHeadSub}>
              Kebijakan SOP perjalanan dinas PT Citra Mandiri
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tipsScrollContainer}
        >
          <View style={styles.tipCard}>
            <Text style={styles.tipCardEmoji}>⏰</Text>
            <Text style={styles.tipCardTitle}>Aturan Pengajuan H-3</Text>
            <Text style={styles.tipCardDesc}>
              Ajukan SPPD minimal H-3 sebelum jadwal tugas agar pencairan Uang Muka tepat waktu.
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipCardEmoji}>🧾</Text>
            <Text style={styles.tipCardTitle}>Kuitansi & Bukti LPJ</Text>
            <Text style={styles.tipCardDesc}>
              Simpan bukti transfer & kuitansi asli hotel/tiket untuk mempermudah verifikasi keuangan.
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipCardEmoji}>🏨</Text>
            <Text style={styles.tipCardTitle}>Fasilitas Hotel Rekanan</Text>
            <Text style={styles.tipCardDesc}>
              Manfaatkan tarif korporat rekanan PT Citra Mandiri untuk efisiensi biaya akomodasi.
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* ============================================================== */}
      {/* 10. RIWAYAT PENGAJUAN DENGAN FILTER CEPAT (INTERAKTIF)        */}
      {/* ============================================================== */}
      <View style={styles.travelokaSectionCard}>
        <View style={styles.sectionHeadRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionHeadTitle}>Pengajuan Terbaru</Text>
            <Text style={styles.sectionHeadSub}>
              Ketuk untuk melihat e-tiket dan detail SPPD
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnLihatSemua}
            onPress={() => onNavigate('TripList', { status: '' })}
          >
            <Text style={styles.btnLihatSemuaText}>Lihat Semua ➔</Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Quick Filter Chips */}
        <View style={styles.recentFilterRow}>
          <TouchableOpacity
            style={[
              styles.recentFilterChip,
              recentFilter === 'all' && styles.recentFilterChipActive,
            ]}
            onPress={() => setRecentFilter('all')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.recentFilterText,
                recentFilter === 'all' && styles.recentFilterTextActive,
              ]}
            >
              Semua ({data?.recent_requests?.length ?? 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recentFilterChip,
              recentFilter === 'submitted' && styles.recentFilterChipActive,
            ]}
            onPress={() => setRecentFilter('submitted')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.recentFilterText,
                recentFilter === 'submitted' && styles.recentFilterTextActive,
              ]}
            >
              Diproses ({sedangDiproses})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recentFilterChip,
              recentFilter === 'approved' && styles.recentFilterChipActive,
            ]}
            onPress={() => setRecentFilter('approved')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.recentFilterText,
                recentFilter === 'approved' && styles.recentFilterTextActive,
              ]}
            >
              Disetujui ({jumlah('approved')})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.recentFilterChip,
              recentFilter === 'completed' && styles.recentFilterChipActive,
            ]}
            onPress={() => setRecentFilter('completed')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.recentFilterText,
                recentFilter === 'completed' && styles.recentFilterTextActive,
              ]}
            >
              Selesai ({jumlah('completed')})
            </Text>
          </TouchableOpacity>
        </View>

        {filteredRecentRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyTitle}>Tidak ada pengajuan di filter ini</Text>
            <Text style={styles.emptySub}>
              Coba pilih tab filter lain atau buat pengajuan baru.
            </Text>
            <TouchableOpacity
              style={styles.travelokaCtaButton}
              onPress={() => onNavigate('TripRequest')}
            >
              <Text style={styles.travelokaCtaText}>+ Ajukan Sekarang</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredRecentRequests.map((p: Perjalanan) => {
            const rupa =
              RUPA_STATUS_PERJALANAN[p.status] ??
              RUPA_STATUS_PERJALANAN.draft;
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.tripTicketRow}
                onPress={() => onNavigate('TripDetail', { tripId: p.id })}
                activeOpacity={0.75}
              >
                <View style={styles.tripTicketTop}>
                  <View style={styles.ticketBadgeCode}>
                    <Text style={styles.ticketBadgeCodeText}>
                      {p.request_number}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: rupa.badgeBg,
                        borderColor: rupa.border,
                        borderStyle: rupa.dashed ? 'dashed' : 'solid',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: rupa.dot },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: rupa.badgeText },
                      ]}
                    >
                      {p.status_label || rupa.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.tripTicketRoute}>
                  <Text style={styles.tripDestIcon}>📍</Text>
                  <Text style={styles.tripTicketDest}>{p.destination}</Text>
                </View>

                <Text style={styles.tripTicketPurpose} numberOfLines={1}>
                  {p.purpose}
                </Text>

                <View style={styles.tripTicketBottom}>
                  <View style={styles.tripTicketDateWrap}>
                    <Text style={styles.tripTicketDateIcon}>📅</Text>
                    <Text style={styles.tripTicketDate}>
                      {rentangTanggal(p.departure_date, p.return_date)}
                    </Text>
                  </View>
                  <Text style={styles.tripTicketAmount}>
                    {formatRupiah(p.estimated_cost)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

// ==============================================================
// STYLES: 100% 60-30-10 PALETTE DENGAN TRAVELOKA-STYLE UX
// ==============================================================
const getStyles = (Colors: typeof LightThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.latar,
    },
    scrollContent: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 32,
    },
    centerBox: {
      flex: 1,
      backgroundColor: Colors.latar,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 10,
      color: Colors.tintaLembut,
      fontSize: 13.5,
      fontWeight: '600',
    },

    // 1. Traveloka Header Card
    travelokaHeaderCard: {
      backgroundColor: Colors.latarSorot,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 16,
      marginBottom: 12,
    },
    travelokaHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    travelokaAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: Colors.kedua,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: Colors.ketiga,
    },
    travelokaAvatarText: {
      color: Colors.utama,
      fontSize: 16,
      fontWeight: '800',
    },
    travelokaGreeting: {
      fontSize: 16,
      color: Colors.tinta,
      fontWeight: '600',
    },
    travelokaGreetingBold: {
      fontWeight: '800',
      color: Colors.tinta,
    },
    travelokaBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 3,
    },
    travelokaCorpDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: Colors.ketiga,
    },
    travelokaCorpText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: Colors.tintaLembut,
    },
    travelokaPillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: Radii.pill,
      backgroundColor: Colors.latar,
      borderWidth: 1,
      borderColor: Colors.garis,
    },
    travelokaPillIcon: {
      fontSize: 12,
    },
    travelokaPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: Colors.tinta,
    },
    travelokaDateSubtitle: {
      fontSize: 11.5,
      color: Colors.tintaLembut,
      marginTop: 10,
      fontWeight: '600',
    },

    // 2. Traveloka Service Grid (4 Kolom)
    serviceSection: {
      marginBottom: 14,
    },
    serviceGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    serviceItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 4,
      backgroundColor: Colors.latarSorot,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: Colors.garis,
    },
    serviceIconSquircle: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: Colors.latar,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: Colors.garis,
      marginBottom: 8,
      position: 'relative',
    },
    serviceIconPrimary: {
      borderColor: Colors.ketiga,
      borderWidth: 2,
    },
    serviceIconAlert: {
      borderColor: Colors.kedua,
      borderWidth: 2,
    },
    serviceIconEmoji: {
      fontSize: 22,
    },
    serviceBadgeNotif: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: Colors.kedua,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    serviceBadgeNotifText: {
      fontSize: 10,
      fontWeight: '800',
      color: Colors.utama,
    },
    serviceItemTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: Colors.tinta,
      textAlign: 'center',
    },
    serviceItemSub: {
      fontSize: 10,
      color: Colors.tintaLembut,
      marginTop: 2,
      textAlign: 'center',
    },

    // 3. Traveloka Booking Widget ("Mau dinas ke mana?")
    travelokaBookingCard: {
      backgroundColor: Colors.latarSorot,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 16,
      marginBottom: 14,
    },
    bookingCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    bookingCardTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: Colors.tinta,
      letterSpacing: -0.3,
    },
    bookingCardSubtitle: {
      fontSize: 12,
      color: Colors.tintaLembut,
      marginTop: 2,
    },
    bookingCardBadge: {
      fontSize: 10,
      fontWeight: '800',
      color: Colors.ketiga,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      paddingVertical: 3,
      paddingHorizontal: 7,
      borderRadius: Radii.sm,
      backgroundColor: isDark
        ? 'rgba(224, 136, 6, 0.15)'
        : 'rgba(224, 136, 6, 0.12)',
      borderWidth: 1,
      borderColor: Colors.ketiga,
    },

    // Transport tabs
    transportTabRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
    },
    transportTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 7,
      borderRadius: Radii.pill,
      backgroundColor: Colors.latar,
      borderWidth: 1,
      borderColor: Colors.garis,
    },
    transportTabActive: {
      backgroundColor: Colors.tinta,
      borderColor: Colors.tinta,
    },
    transportTabEmoji: {
      fontSize: 12,
    },
    transportTabText: {
      fontSize: 11,
      fontWeight: '700',
      color: Colors.tintaLembut,
    },
    transportTabTextActive: {
      color: Colors.utama,
    },

    routeSelectorBox: {
      backgroundColor: Colors.latar,
      borderRadius: Radii.md,
      borderWidth: 1.5,
      borderColor: Colors.garis,
      padding: 12,
      marginBottom: 12,
    },
    routeTrack: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    routeDotOrigin: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.ketiga,
    },
    routeDotDest: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.kedua,
    },
    routeLineDashed: {
      flex: 1,
      height: 1,
      backgroundColor: Colors.garisTegas,
      marginHorizontal: 6,
    },
    routePlaneIcon: {
      fontSize: 14,
    },
    routeLocations: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    routeLabel: {
      fontSize: 9.5,
      fontWeight: '800',
      color: Colors.tintaLembut,
      letterSpacing: 0.7,
      marginBottom: 2,
    },
    routeCityOrigin: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.tinta,
    },
    routeCityDest: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.ketiga,
    },

    // Popular cities
    popularCitiesSection: {
      marginBottom: 14,
    },
    popularCitiesLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: Colors.tintaLembut,
      letterSpacing: 0.7,
      marginBottom: 6,
    },
    popularCitiesScroll: {
      gap: 6,
    },
    popularCityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: Radii.pill,
      backgroundColor: Colors.latar,
      borderWidth: 1,
      borderColor: Colors.garis,
    },
    popularCityChipActive: {
      borderColor: Colors.ketiga,
      borderWidth: 1.5,
      backgroundColor: isDark
        ? 'rgba(224, 136, 6, 0.2)'
        : 'rgba(224, 136, 6, 0.12)',
    },
    popularCityIcon: {
      fontSize: 12,
    },
    popularCityText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: Colors.tinta,
    },
    popularCityTextActive: {
      color: Colors.ketiga,
      fontWeight: '800',
    },

    travelokaCtaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: Colors.tinta,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: Radii.md,
    },
    travelokaCtaIcon: {
      fontSize: 16,
    },
    travelokaCtaText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: Colors.utama,
      letterSpacing: 0.2,
    },

    // 4. Interactive Calculator
    calculatorCard: {
      backgroundColor: Colors.latarSorot,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 14,
      marginBottom: 14,
    },
    calculatorHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    calculatorTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: Colors.tinta,
      letterSpacing: -0.2,
    },
    calculatorSubtitle: {
      fontSize: 11.5,
      color: Colors.tintaLembut,
      marginTop: 2,
    },
    calculatorBadge: {
      fontSize: 10,
      fontWeight: '800',
      color: Colors.ketiga,
      letterSpacing: 0.5,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: Radii.sm,
      backgroundColor: isDark
        ? 'rgba(224, 136, 6, 0.15)'
        : 'rgba(224, 136, 6, 0.12)',
      borderWidth: 1,
      borderColor: Colors.ketiga,
    },
    calcControlsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    calcTypeToggle: {
      flexDirection: 'row',
      backgroundColor: Colors.latar,
      borderRadius: Radii.pill,
      padding: 2,
      borderWidth: 1,
      borderColor: Colors.garis,
    },
    calcTypeBtn: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: Radii.pill,
    },
    calcTypeBtnActive: {
      backgroundColor: Colors.tinta,
    },
    calcTypeText: {
      fontSize: 11,
      fontWeight: '700',
      color: Colors.tintaLembut,
    },
    calcTypeTextActive: {
      color: Colors.utama,
    },
    calcCounter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    calcBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: Colors.tinta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calcBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: Colors.utama,
    },
    calcDaysText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: Colors.tinta,
      minWidth: 50,
      textAlign: 'center',
    },
    calcResultBox: {
      backgroundColor: Colors.latar,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 12,
      marginBottom: 10,
    },
    calcResultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    calcResultLabel: {
      fontSize: 11.5,
      color: Colors.tintaLembut,
    },
    calcResultVal: {
      fontSize: 12.5,
      fontWeight: '700',
      color: Colors.tinta,
    },
    calcTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: Colors.garis,
    },
    calcTotalLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: Colors.tinta,
    },
    calcTotalVal: {
      fontSize: 15,
      fontWeight: '800',
      color: Colors.ketiga,
      fontVariant: ['tabular-nums'],
    },
    btnPakaiEstimasi: {
      borderWidth: 1.5,
      borderColor: Colors.tinta,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: Radii.md,
      alignItems: 'center',
    },
    btnPakaiEstimasiText: {
      fontSize: 12,
      fontWeight: '700',
      color: Colors.tinta,
    },

    // 5. Flow tracker
    stepFlowCard: {
      backgroundColor: Colors.latarSorot,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 14,
      marginBottom: 14,
    },
    stepFlowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    stepNode: {
      alignItems: 'center',
      flex: 1,
    },
    stepIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: Colors.latar,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: Colors.garis,
      marginBottom: 4,
    },
    stepIconWrapActive: {
      borderColor: Colors.ketiga,
      borderWidth: 2,
      backgroundColor: isDark
        ? 'rgba(224, 136, 6, 0.2)'
        : 'rgba(224, 136, 6, 0.15)',
    },
    stepIconWrapAlert: {
      borderColor: Colors.kedua,
      borderWidth: 2,
      backgroundColor: isDark
        ? 'rgba(25, 39, 58, 0.3)'
        : 'rgba(25, 39, 58, 0.15)',
    },
    stepIcon: {
      fontSize: 14,
    },
    stepLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: Colors.tintaLembut,
      textAlign: 'center',
    },
    stepLine: {
      height: 2,
      backgroundColor: Colors.garisTegas,
      flex: 0.6,
      marginBottom: 16,
    },

    // 6. Boarding Pass Card
    boardingPassCard: {
      backgroundColor: Colors.latarSorot,
      borderRadius: Radii.lg,
      borderWidth: 1.5,
      borderColor: Colors.ketiga,
      paddingTop: 14,
      paddingBottom: 14,
      marginBottom: 14,
      overflow: 'hidden',
    },
    boardingPassTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    boardingPassBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    boardingPassIcon: {
      fontSize: 15,
    },
    boardingPassType: {
      fontSize: 11,
      fontWeight: '800',
      color: Colors.ketiga,
      letterSpacing: 0.6,
    },
    boardingPassStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: Radii.pill,
      backgroundColor: isDark
        ? 'rgba(224, 136, 6, 0.16)'
        : 'rgba(224, 136, 6, 0.14)',
      borderWidth: 1,
      borderColor: Colors.ketiga,
    },
    boardingPassStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: Colors.ketiga,
    },
    boardingPassStatusText: {
      fontSize: 11,
      fontWeight: '700',
      color: Colors.tinta,
    },
    boardingPassRoute: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    boardingPassCity: {
      fontSize: 22,
      fontWeight: '900',
      color: Colors.tinta,
      letterSpacing: 1,
    },
    boardingPassAirport: {
      fontSize: 11,
      color: Colors.tintaLembut,
      fontWeight: '600',
      marginTop: 2,
    },
    boardingPassFlight: {
      alignItems: 'center',
    },
    boardingPassPlane: {
      fontSize: 12,
      color: Colors.ketiga,
      fontWeight: '700',
    },
    boardingPassRequestNumber: {
      fontSize: 11,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontWeight: '700',
      color: Colors.tintaLembut,
      marginTop: 2,
    },
    perforatedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 4,
      position: 'relative',
    },
    perforatedNotchLeft: {
      width: 14,
      height: 24,
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
      backgroundColor: Colors.latar,
      borderWidth: 1,
      borderColor: Colors.ketiga,
      borderLeftWidth: 0,
      marginLeft: -1,
    },
    perforatedLine: {
      flex: 1,
      height: 1,
      borderWidth: 1,
      borderColor: Colors.garisTegas,
      borderStyle: 'dashed',
      marginHorizontal: 8,
    },
    perforatedNotchRight: {
      width: 14,
      height: 24,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
      backgroundColor: Colors.latar,
      borderWidth: 1,
      borderColor: Colors.ketiga,
      borderRightWidth: 0,
      marginRight: -1,
    },
    boardingPassBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    boardingPassMetaLabel: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: Colors.tintaLembut,
    },
    boardingPassMetaVal: {
      fontSize: 12.5,
      fontWeight: '700',
      color: Colors.tinta,
      marginTop: 2,
    },
    boardingPassPurpose: {
      fontSize: 11.5,
      color: Colors.tintaLembut,
      marginTop: 2,
      maxWidth: 200,
    },
    boardingPassActionBtn: {
      backgroundColor: Colors.tinta,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: Radii.md,
    },
    boardingPassActionBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: Colors.utama,
    },

    // 7. Traveloka Section Card
    travelokaSectionCard: {
      backgroundColor: Colors.latarSorot,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 14,
      marginBottom: 14,
    },
    sectionHeadRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: Colors.garisTegas,
    },
    sectionHeadTitle: {
      fontSize: 15.5,
      fontWeight: '800',
      color: Colors.tinta,
      letterSpacing: -0.2,
    },
    sectionHeadSub: {
      fontSize: 11.5,
      color: Colors.tintaLembut,
      marginTop: 2,
    },

    // Tasks
    taskItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: Colors.latar,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 10,
    },
    taskItemCardAlert: {
      borderLeftWidth: 4,
      borderLeftColor: Colors.kedua,
    },
    taskIconBubble: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.latarSorot,
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskIconEmoji: {
      fontSize: 18,
    },
    taskItemTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.tinta,
    },
    taskItemSub: {
      fontSize: 11,
      color: Colors.tintaLembut,
      marginTop: 2,
    },
    taskPillBtn: {
      backgroundColor: Colors.tinta,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: Radii.md,
    },
    taskPillBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: Colors.utama,
    },
    taskPillBtnSecondary: {
      borderWidth: 1.5,
      borderColor: Colors.tinta,
      paddingVertical: 5,
      paddingHorizontal: 9,
      borderRadius: Radii.md,
    },
    taskPillBtnSecondaryText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: Colors.tinta,
    },

    // 8. Stat Grid
    statGrid2Col: {
      flexDirection: 'row',
      gap: 10,
    },
    statCardItem: {
      flex: 1,
      backgroundColor: Colors.latar,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 12,
    },
    statCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    statCardIcon: {
      fontSize: 16,
    },
    statCardArrow: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.ketiga,
    },
    statCardVal: {
      fontSize: 18,
      fontWeight: '800',
      color: Colors.tinta,
      fontVariant: ['tabular-nums'],
    },
    statHighlightVal: {
      color: Colors.ketiga,
    },
    statCardLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: Colors.tinta,
      marginTop: 2,
    },
    statCardSub: {
      fontSize: 10.5,
      color: Colors.tintaLembut,
      marginTop: 2,
    },

    // 9. Traveloka Tips Carousel
    tipsScrollContainer: {
      gap: 10,
      paddingVertical: 2,
    },
    tipCard: {
      width: 220,
      backgroundColor: Colors.latar,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 12,
    },
    tipCardEmoji: {
      fontSize: 22,
      marginBottom: 6,
    },
    tipCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.tinta,
      marginBottom: 4,
    },
    tipCardDesc: {
      fontSize: 11,
      color: Colors.tintaLembut,
      lineHeight: 16,
    },

    // 10. Riwayat Pengajuan
    btnLihatSemua: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    btnLihatSemuaText: {
      fontSize: 12,
      fontWeight: '700',
      color: Colors.ketiga,
    },
    recentFilterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    recentFilterChip: {
      paddingVertical: 5,
      paddingHorizontal: 9,
      borderRadius: Radii.pill,
      backgroundColor: Colors.latar,
      borderWidth: 1,
      borderColor: Colors.garis,
    },
    recentFilterChipActive: {
      backgroundColor: Colors.tinta,
      borderColor: Colors.tinta,
    },
    recentFilterText: {
      fontSize: 11,
      fontWeight: '700',
      color: Colors.tintaLembut,
    },
    recentFilterTextActive: {
      color: Colors.utama,
    },
    tripTicketRow: {
      backgroundColor: Colors.latar,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: Colors.garis,
      padding: 12,
      marginBottom: 10,
    },
    tripTicketTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    ticketBadgeCode: {
      backgroundColor: Colors.latarSorot,
      paddingVertical: 3,
      paddingHorizontal: 7,
      borderRadius: Radii.sm,
      borderWidth: 1,
      borderColor: Colors.garis,
    },
    ticketBadgeCodeText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 12,
      fontWeight: '700',
      color: Colors.tinta,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: Radii.pill,
      borderWidth: 1.5,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
    },
    tripTicketRoute: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    tripDestIcon: {
      fontSize: 14,
    },
    tripTicketDest: {
      fontSize: 15,
      fontWeight: '800',
      color: Colors.tinta,
    },
    tripTicketPurpose: {
      fontSize: 12,
      color: Colors.tintaLembut,
      marginTop: 2,
      paddingLeft: 20,
    },
    tripTicketBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingLeft: 20,
    },
    tripTicketDateWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    tripTicketDateIcon: {
      fontSize: 12,
    },
    tripTicketDate: {
      fontSize: 12,
      color: Colors.tintaLembut,
    },
    tripTicketAmount: {
      fontSize: 13.5,
      fontWeight: '800',
      color: Colors.tinta,
      fontVariant: ['tabular-nums'],
    },
    emptyState: {
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyIcon: {
      fontSize: 32,
      marginBottom: 6,
    },
    emptyTitle: {
      fontSize: 14.5,
      fontWeight: '700',
      color: Colors.tinta,
    },
    emptySub: {
      fontSize: 12,
      color: Colors.tintaLembut,
      textAlign: 'center',
      marginTop: 3,
      marginBottom: 12,
    },

    // Galat
    kotakGalat: {
      backgroundColor: Colors.ketiga,
      borderWidth: 1,
      borderColor: Colors.kedua,
      borderLeftWidth: 4,
      borderLeftColor: Colors.kedua,
      borderRadius: Radii.md,
      padding: 12,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    kotakGalatText: {
      color: Colors.kedua,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    btnKecilOutline: {
      borderWidth: 1.5,
      borderColor: Colors.kedua,
      borderRadius: Radii.sm,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    btnKecilOutlineText: {
      color: Colors.kedua,
      fontSize: 12,
      fontWeight: '700',
    },
  });
