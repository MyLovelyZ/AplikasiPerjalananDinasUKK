import React, { useState, useEffect, useCallback } from 'react';
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
import { Colors, Radii } from '../theme/colors';
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
} from '../constants/labels';

interface HomeScreenProps {
  user: Pengguna;
  onNavigate: (screen: string, params?: any) => void;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onNavigate,
}) => {
  const [data, setData] = useState<DashboardPegawai | null>(() =>
    getCachedDashboard()
  );
  const [loading, setLoading] = useState<boolean>(() => !getCachedDashboard());
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

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

  if (loading && !refreshing && !data) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="small" color={Colors.tinta} />
        <Text style={styles.loadingText}>Memuat beranda…</Text>
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
          colors={[Colors.ketiga]}
          tintColor={Colors.ketiga}
        />
      }
    >
      {/* PageHeader (Selaras DashboardPage.tsx) */}
      <View style={styles.pageTitle}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowBar} />
          <Text style={styles.eyebrowText}>
            KARYAWAN · {tanggalHariIni.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.h1}>
          Selamat datang, {user?.name ?? 'Pegawai'}
        </Text>
        <Text style={styles.pageDesc}>
          Ringkasan perjalanan dinas dan tindakan yang perlu diselesaikan.
        </Text>
        <View style={styles.pageActions}>
          <TouchableOpacity
            style={styles.btnUtama}
            onPress={() => onNavigate('TripRequest')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnUtamaText}>+ Ajukan Perjalanan</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Banner Perjalanan sedang berlangsung (current_trip) */}
      {data?.current_trip ? (
        <View style={styles.kotakInfoCurrent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.currentEyebrow}>
              PERJALANAN SEDANG BERLANGSUNG
            </Text>
            <Text style={styles.currentTitle}>
              {data.current_trip.destination} — {data.current_trip.purpose}
            </Text>
            <Text style={styles.currentSub}>
              {data.current_trip.request_number} ·{' '}
              {rentangTanggal(
                data.current_trip.departure_date,
                data.current_trip.return_date
              )}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnSekunderKecil}
            onPress={() =>
              onNavigate('TripDetail', { tripId: data.current_trip?.id })
            }
          >
            <Text style={styles.btnSekunderKecilText}>Lihat detail</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Panel: Perlu tindakan (Selaras BarisTindakan di DashboardPage.tsx) */}
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View>
            <Text style={styles.panelTitle}>Perlu tindakan</Text>
            <Text style={styles.panelSub}>
              Hal yang menunggu tindak lanjut Anda
            </Text>
          </View>
        </View>
        <View style={styles.panelBody}>
          {/* 1. Laporan biaya perlu diisi */}
          <TouchableOpacity
            style={styles.tindakanBaris}
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
                styles.tindakanAngka,
                laporanPerluDiisi > 0 && styles.tindakanAngkaAktif,
              ]}
            >
              <Text style={styles.tindakanAngkaText}>{laporanPerluDiisi}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tindakanJudul}>
                Laporan biaya perlu diisi
              </Text>
              <Text style={styles.tindakanSub}>
                Perjalanan selesai atau dikembalikan keuangan
              </Text>
            </View>
            <Text style={styles.tindakanChevron}>→</Text>
          </TouchableOpacity>

          {/* 2. Draf belum diajukan */}
          <TouchableOpacity
            style={[styles.tindakanBaris, { marginTop: 12 }]}
            onPress={() => onNavigate('TripList', { status: 'draft' })}
            activeOpacity={0.75}
          >
            <View style={styles.tindakanAngka}>
              <Text style={styles.tindakanAngkaText}>{drafCount}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tindakanJudul}>Draf belum diajukan</Text>
              <Text style={styles.tindakanSub}>
                Lengkapi lalu kirim ke supervisor
              </Text>
            </View>
            <Text style={styles.tindakanChevron}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Panel: Tahun ini (.grid-stat / .stat di DashboardPage.tsx) */}
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View>
            <Text style={styles.panelTitle}>
              Tahun ini ({new Date().getFullYear()})
            </Text>
            <Text style={styles.panelSub}>Rekap perjalanan dinas Anda</Text>
          </View>
        </View>
        <View style={styles.panelBody}>
          <View style={styles.statGridRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>PENGAJUAN</Text>
              <Text style={styles.statValue}>
                {data?.this_year?.requests ?? 0}
              </Text>
              <Text style={styles.statNote}>
                {jumlah('completed')} selesai · {jumlah('approved')} disetujui
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>SEDANG DIPROSES</Text>
              <Text style={styles.statValue}>{sedangDiproses}</Text>
              <Text style={styles.statNote}>
                {jumlah('submitted')} di supervisor ·{' '}
                {jumlah('supervisor_approved')} di keuangan
              </Text>
            </View>
          </View>

          <View style={[styles.statGridRow, { marginTop: 16 }]}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>BIAYA DISETUJUI</Text>
              <Text style={styles.statValue}>
                {rupiahRingkas(data?.this_year?.approved_estimated_cost ?? 0)}
              </Text>
              <Text style={styles.statNote}>Total estimasi disetujui</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>BIAYA TERVERIFIKASI</Text>
              <Text style={styles.statValue}>
                {rupiahRingkas(data?.this_year?.verified_expenses ?? 0)}
              </Text>
              <Text style={styles.statNote}>Realisasi laporan biaya</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Panel: Pengajuan terbaru (recent_requests) */}
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Pengajuan terbaru</Text>
            <Text style={styles.panelSub}>
              Ketuk baris untuk melihat detail atau melengkapi laporan biaya
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnSekunderKecil}
            onPress={() => onNavigate('TripList', { status: '' })}
          >
            <Text style={styles.btnSekunderKecilText}>Lihat semua</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.panelBody}>
          {!data?.recent_requests || data.recent_requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                Belum ada pengajuan perjalanan
              </Text>
              <Text style={styles.emptySub}>
                Buat pengajuan pertama Anda untuk memulai proses persetujuan.
              </Text>
              <TouchableOpacity
                style={[styles.btnUtama, { marginTop: 12 }]}
                onPress={() => onNavigate('TripRequest')}
              >
                <Text style={styles.btnUtamaText}>Ajukan perjalanan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            data.recent_requests.map((p: Perjalanan) => {
              const rupa =
                RUPA_STATUS_PERJALANAN[p.status] ??
                RUPA_STATUS_PERJALANAN.draft;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.tableRow}
                  onPress={() => onNavigate('TripDetail', { tripId: p.id })}
                  activeOpacity={0.75}
                >
                  <View style={styles.tableRowTop}>
                    <Text style={styles.monoBold}>{p.request_number}</Text>
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

                  <Text style={styles.rowDestination}>{p.destination}</Text>
                  <Text style={styles.rowPurpose} numberOfLines={1}>
                    {p.purpose}
                  </Text>

                  <View style={styles.tableRowBottom}>
                    <Text style={styles.rowDate}>
                      {rentangTanggal(p.departure_date, p.return_date)}
                    </Text>
                    <Text style={styles.rowAmount}>
                      {formatRupiah(p.estimated_cost)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      {/* Panel: Perjalanan mendatang & Laporan biaya jatuh tempo */}
      {((data?.upcoming_trips?.length ?? 0) > 0 ||
        (data?.expense_reports_due?.length ?? 0) > 0 ||
        (data?.pending_disbursements?.length ?? 0) > 0) && (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <Text style={styles.panelTitle}>Jadwal & tindak lanjut</Text>
              <Text style={styles.panelSub}>
                Perjalanan mendatang, laporan biaya, dan pencairan dana
              </Text>
            </View>
          </View>
          <View style={styles.panelBody}>
            {data?.expense_reports_due?.map((p) => (
              <TouchableOpacity
                key={`due-${p.id}`}
                style={styles.subItemRow}
                onPress={() => onNavigate('ExpenseReport', { tripId: p.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.subItemTag}>
                    LAPORAN BIAYA PERLU DIISI
                  </Text>
                  <Text style={styles.subItemTitle}>
                    {p.request_number} · {p.destination}
                  </Text>
                  <Text style={styles.subItemMeta}>
                    Selesai {rentangTanggal(p.departure_date, p.return_date)}
                  </Text>
                </View>
                <View style={styles.btnUtamaKecil}>
                  <Text style={styles.btnUtamaKecilText}>Isi laporan</Text>
                </View>
              </TouchableOpacity>
            ))}

            {data?.upcoming_trips?.map((p) => (
              <TouchableOpacity
                key={`up-${p.id}`}
                style={styles.subItemRow}
                onPress={() => onNavigate('TripDetail', { tripId: p.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.subItemTag}>PERJALANAN MENDATANG</Text>
                  <Text style={styles.subItemTitle}>
                    {p.destination} — {p.purpose}
                  </Text>
                  <Text style={styles.subItemMeta}>
                    {p.request_number} ·{' '}
                    {rentangTanggal(p.departure_date, p.return_date)}
                  </Text>
                </View>
                <Text style={styles.tindakanChevron}>→</Text>
              </TouchableOpacity>
            ))}

            {data?.pending_disbursements?.map((d) => (
              <TouchableOpacity
                key={`disb-${d.id}`}
                style={styles.subItemRow}
                onPress={() => {
                  if (d.travel_request?.id) {
                    onNavigate('TripDetail', { tripId: d.travel_request.id });
                  }
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.subItemTag}>MENUNGGU PEMBAYARAN</Text>
                  <Text style={styles.subItemTitle}>
                    {d.type_label} · {formatRupiah(d.amount)}
                  </Text>
                  <Text style={styles.subItemMeta}>
                    {d.travel_request?.request_number ?? '-'} ·{' '}
                    {d.travel_request?.destination ?? ''}
                  </Text>
                </View>
                <Text style={styles.tindakanChevron}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.latar,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 28,
  },
  centerBox: {
    flex: 1,
    backgroundColor: Colors.latar,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    color: Colors.tintaLembut,
    fontSize: 13.5,
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
    letterSpacing: 0.7,
    color: Colors.tintaLembut,
    flex: 1,
  },
  h1: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Colors.tinta,
  },
  pageDesc: {
    color: Colors.tintaLembut,
    fontSize: 12.5,
    marginTop: 3,
    lineHeight: 18,
  },
  pageActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  btnUtama: {
    flex: 1,
    backgroundColor: Colors.tinta,
    borderWidth: 1,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnUtamaText: {
    color: Colors.utama,
    fontSize: 13.5,
    fontWeight: '600',
  },
  btnUtamaKecil: {
    backgroundColor: Colors.tinta,
    borderRadius: Radii.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnUtamaKecilText: {
    color: Colors.utama,
    fontSize: 12,
    fontWeight: '600',
  },
  btnSekunderKecil: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnSekunderKecilText: {
    color: Colors.tinta,
    fontSize: 12.5,
    fontWeight: '600',
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
  kotakGalat: {
    backgroundColor: Colors.ketiga,
    borderWidth: 1,
    borderColor: Colors.kedua,
    borderLeftWidth: 4,
    borderLeftColor: Colors.kedua,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 18,
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
  kotakInfoCurrent: {
    backgroundColor: Colors.latarSorot,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderLeftWidth: 4,
    borderLeftColor: Colors.ketiga,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: Colors.tintaLembut,
  },
  currentTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.tinta,
    marginTop: 2,
  },
  currentSub: {
    fontSize: 12.5,
    color: Colors.tintaLembut,
    marginTop: 2,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garisTegas,
    gap: 10,
  },
  panelTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Colors.tinta,
  },
  panelSub: {
    fontSize: 12,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  panelBody: {
    paddingTop: 12,
  },
  tindakanBaris: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: Colors.utama,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderLeftWidth: 3,
    borderLeftColor: Colors.tinta,
  },
  tindakanAngka: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tindakanAngkaAktif: {
    backgroundColor: Colors.ketiga,
  },
  tindakanAngkaText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.tinta,
    fontVariant: ['tabular-nums'],
  },
  tindakanJudul: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  tindakanSub: {
    fontSize: 11.5,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  tindakanChevron: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.tintaLembut,
  },
  statGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    padding: 11,
    backgroundColor: Colors.utama,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderTopWidth: 3,
    borderTopColor: Colors.tinta,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.tintaLembut,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.tinta,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  statNote: {
    fontSize: 11,
    color: Colors.tintaLembut,
    marginTop: 3,
  },
  tableRow: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
  },
  tableRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  monoBold: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.pill,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  rowDestination: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  rowPurpose: {
    fontSize: 12.5,
    color: Colors.tintaLembut,
    marginTop: 1,
  },
  tableRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  rowDate: {
    fontSize: 12.5,
    color: Colors.tintaLembut,
  },
  rowAmount: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.tinta,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.tintaLembut,
    textAlign: 'center',
    marginTop: 4,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
    gap: 10,
  },
  subItemTag: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: Colors.tintaLembut,
  },
  subItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
    marginTop: 2,
  },
  subItemMeta: {
    fontSize: 12,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
});

