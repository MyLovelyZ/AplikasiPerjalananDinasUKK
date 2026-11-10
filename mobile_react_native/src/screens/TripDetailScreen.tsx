import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { Colors, Radii } from '../theme/colors';
import {
  apiEmployeeRequestDetail,
  apiSubmitEmployeeRequest,
  apiCancelEmployeeRequest,
  ApiError,
} from '../api/client';
import { Perjalanan } from '../api/types';
import {
  formatRupiah,
  formatTanggal,
  formatWaktu,
  rentangTanggal,
  ukuranBerkas,
  RUPA_STATUS_PERJALANAN,
  RUPA_STATUS_LAPORAN,
  RUPA_STATUS_PENCAIRAN,
  LABEL_JENIS_PERJALANAN,
  LABEL_TRANSPORTASI,
  LABEL_KATEGORI_BIAYA,
  LABEL_JENIS_DOKUMEN,
  LABEL_TAHAP,
  LABEL_KEPUTUSAN,
  LABEL_METODE_BAYAR,
  LABEL_PENYELESAIAN,
} from '../constants/labels';

interface TripDetailScreenProps {
  tripId: number;
  onBack: () => void;
  onEdit: (id: number) => void;
  onOpenExpenses: (tripId: number) => void;
  onRefreshList?: () => void;
}

export const TripDetailScreen: React.FC<TripDetailScreenProps> = ({
  tripId,
  onBack,
  onEdit,
  onOpenExpenses,
  onRefreshList,
}) => {
  const [trip, setTrip] = useState<Perjalanan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchDetail = useCallback(async () => {
    try {
      setErrorMsg('');
      const data = await apiEmployeeRequestDetail(tripId);
      setTrip(data);
    } catch (err: any) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : err?.message || 'Gagal memuat detail perjalanan'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => {
    setLoading(true);
    fetchDetail();
  }, [fetchDetail]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  const handleSubmitDraft = async () => {
    setSubmittingAction(true);
    setErrorMsg('');
    try {
      await apiSubmitEmployeeRequest(tripId);
      await fetchDetail();
      onRefreshList?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengajukan perjalanan.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancelRequest = () => {
    if (Platform.OS === 'web') {
      const ok = window.confirm('Batalkan pengajuan perjalanan ini?');
      if (!ok) return;
      runCancel();
      return;
    }

    Alert.alert('Batalkan Pengajuan', 'Batalkan pengajuan perjalanan ini?', [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Ya, Batalkan',
        style: 'destructive',
        onPress: runCancel,
      },
    ]);
  };

  const runCancel = async () => {
    setSubmittingAction(true);
    setErrorMsg('');
    try {
      await apiCancelEmployeeRequest(tripId);
      await fetchDetail();
      onRefreshList?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal membatalkan perjalanan.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading && !trip) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={Colors.tinta} />
        <Text style={styles.loadingText}>Memuat detail perjalanan…</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          {errorMsg || 'Data perjalanan tidak ditemukan.'}
        </Text>
        <TouchableOpacity style={styles.btnSekunder} onPress={onBack}>
          <Text style={styles.btnSekunderText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rupaStatus =
    RUPA_STATUS_PERJALANAN[trip.status] ?? RUPA_STATUS_PERJALANAN.draft;

  const langkahBerikutnya = () => {
    if (trip.status === 'submitted')
      return 'Menunggu persetujuan Supervisor';
    if (trip.status === 'supervisor_approved')
      return 'Menunggu persetujuan akhir Keuangan';
    return null;
  };

  const bisaIsiLaporan =
    trip.status === 'approved' || trip.status === 'completed';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
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
        {/* Header Detail (Selaras DetailPerjalananModal.tsx) */}
        <View style={styles.pageHead}>
          <TouchableOpacity style={styles.backLink} onPress={onBack}>
            <Text style={styles.backLinkText}>← Kembali ke daftar</Text>
          </TouchableOpacity>

          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Detail Perjalanan</Text>
              <Text style={styles.subTitle}>
                {trip.request_number} · {trip.purpose}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: rupaStatus.badgeBg,
                  borderColor: rupaStatus.border,
                  borderStyle: rupaStatus.dashed ? 'dashed' : 'solid',
                },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: rupaStatus.dot }]}
              />
              <Text
                style={[styles.statusText, { color: rupaStatus.badgeText }]}
              >
                {trip.status_label || rupaStatus.label}
              </Text>
            </View>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.kotakGalat}>
            <Text style={styles.kotakGalatText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Ringkasan 4 Kotak (.ringkas-detail di DetailPerjalananModal.tsx) */}
        <View style={styles.ringkasDetail}>
          <View style={styles.ringkasRow}>
            <View style={[styles.ringkasCell, styles.ringkasCellRightBorder]}>
              <Text style={styles.ringkasLabel}>TUJUAN</Text>
              <Text style={styles.ringkasValue}>{trip.destination}</Text>
              <Text style={styles.ringkasNote}>
                {trip.trip_type_label ||
                  LABEL_JENIS_PERJALANAN[trip.trip_type]}
              </Text>
            </View>
            <View style={styles.ringkasCell}>
              <Text style={styles.ringkasLabel}>TANGGAL</Text>
              <Text style={styles.ringkasValue}>
                {rentangTanggal(trip.departure_date, trip.return_date)}
              </Text>
              <Text style={styles.ringkasNote}>
                {trip.duration_days} hari ·{' '}
                {trip.transportation_label ||
                  LABEL_TRANSPORTASI[trip.transportation]}
              </Text>
            </View>
          </View>

          <View style={[styles.ringkasRow, styles.ringkasRowTopBorder]}>
            <View style={[styles.ringkasCell, styles.ringkasCellRightBorder]}>
              <Text style={styles.ringkasLabel}>ESTIMASI BIAYA</Text>
              <Text style={[styles.ringkasValue, styles.tabular]}>
                {formatRupiah(trip.estimated_cost)}
              </Text>
              <Text style={styles.ringkasNote}>
                {trip.cost_estimates?.length ?? 0} pos biaya
              </Text>
            </View>
            <View style={styles.ringkasCell}>
              <Text style={styles.ringkasLabel}>UANG MUKA DIMINTA</Text>
              <Text style={[styles.ringkasValue, styles.tabular]}>
                {formatRupiah(trip.advance_requested)}
              </Text>
              <Text style={styles.ringkasNote}>
                {trip.advance_approved !== null
                  ? `Disetujui ${formatRupiah(trip.advance_approved)}`
                  : 'Belum diputuskan'}
              </Text>
            </View>
          </View>
        </View>

        {/* Panel: Informasi Perjalanan (.pasangan) */}
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Informasi Perjalanan</Text>
          </View>
          <View style={styles.panelBody}>
            {trip.employee && (
              <View style={styles.pasanganRow}>
                <Text style={styles.pasanganDt}>Pemohon</Text>
                <Text style={styles.pasanganDd}>
                  {trip.employee.name}
                  {trip.employee.position
                    ? ` · ${trip.employee.position}`
                    : ''}
                  {trip.employee.department?.name
                    ? ` (${trip.employee.department.name})`
                    : ''}
                </Text>
              </View>
            )}
            <View style={styles.pasanganRow}>
              <Text style={styles.pasanganDt}>Keperluan</Text>
              <Text style={styles.pasanganDd}>{trip.purpose}</Text>
            </View>
            {trip.description ? (
              <View style={styles.pasanganRow}>
                <Text style={styles.pasanganDt}>Deskripsi</Text>
                <Text style={styles.pasanganDd}>{trip.description}</Text>
              </View>
            ) : null}
            {trip.notes ? (
              <View style={styles.pasanganRow}>
                <Text style={styles.pasanganDt}>Catatan pemohon</Text>
                <Text style={styles.pasanganDd}>{trip.notes}</Text>
              </View>
            ) : null}
            <View style={[styles.pasanganRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.pasanganDt}>Diajukan pada</Text>
              <Text style={styles.pasanganDd}>
                {trip.submitted_at
                  ? formatWaktu(trip.submitted_at)
                  : 'Belum diajukan (draf)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Panel: Rincian Estimasi Biaya (trip.cost_estimates) */}
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <Text style={styles.panelTitle}>Rincian Estimasi Biaya</Text>
              <Text style={styles.panelSub}>
                Perkiraan biaya yang diajukan sebelum keberangkatan
              </Text>
            </View>
          </View>
          <View style={styles.panelBody}>
            {!trip.cost_estimates || trip.cost_estimates.length === 0 ? (
              <Text style={styles.mutedText}>Belum ada rincian biaya.</Text>
            ) : (
              <>
                {trip.cost_estimates.map((b, idx) => (
                  <View key={b.id ?? idx} style={styles.costRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.costCategory}>
                        {b.category_label || LABEL_KATEGORI_BIAYA[b.category]}
                      </Text>
                      <Text style={styles.costDesc}>
                        {b.description || '—'}
                      </Text>
                      <Text style={styles.costMeta}>
                        {b.quantity} × {formatRupiah(b.unit_price)}
                      </Text>
                    </View>
                    <Text style={styles.costSubtotal}>
                      {formatRupiah(b.subtotal)}
                    </Text>
                  </View>
                ))}
                <View style={styles.costTotalRow}>
                  <Text style={styles.costTotalLabel}>Total Estimasi</Text>
                  <Text style={styles.costTotalValue}>
                    {formatRupiah(trip.estimated_cost)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Panel: Dokumen Pendukung (trip.documents) */}
        {trip.documents && trip.documents.length > 0 && (
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Dokumen Pendukung</Text>
            </View>
            <View style={styles.panelBody}>
              {trip.documents.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.berkasItem}
                  onPress={() => {
                    if (d.url) Linking.openURL(d.url).catch(() => {});
                  }}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.berkasNama}>{d.original_name}</Text>
                    <Text style={styles.berkasMeta}>
                      {d.type_label || LABEL_JENIS_DOKUMEN[d.type]} ·{' '}
                      {ukuranBerkas(d.size)}
                    </Text>
                  </View>
                  <Text style={styles.tautanText}>Buka</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Panel: Riwayat Persetujuan (.linimasa) */}
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <Text style={styles.panelTitle}>Riwayat Persetujuan</Text>
              <Text style={styles.panelSub}>
                Jejak keputusan supervisor dan bagian keuangan
              </Text>
            </View>
          </View>
          <View style={styles.panelBody}>
            {(!trip.approvals || trip.approvals.length === 0) &&
            !langkahBerikutnya() ? (
              <Text style={styles.mutedText}>
                Belum ada keputusan persetujuan tercatat.
              </Text>
            ) : (
              <View style={styles.linimasa}>
                {trip.approvals?.map((p) => {
                  const disetujui = p.decision === 'approved';
                  return (
                    <View key={p.id} style={styles.linimasaItem}>
                      <View
                        style={[
                          styles.linimasaTitik,
                          disetujui ? styles.titikSelesai : styles.titikTolak,
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.linimasaJudul}>
                          {p.stage_label || LABEL_TAHAP[p.stage]} —{' '}
                          {p.decision_label || LABEL_KEPUTUSAN[p.decision]}
                        </Text>
                        <Text style={styles.linimasaWaktu}>
                          {p.approver?.name ?? 'Pejabat berwenang'} ·{' '}
                          {formatWaktu(p.decided_at)}
                        </Text>
                        {p.note ? (
                          <View style={styles.linimasaCatatan}>
                            <Text style={styles.linimasaCatatanText}>
                              “{p.note}”
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
                {langkahBerikutnya() && (
                  <View style={styles.linimasaItem}>
                    <View style={[styles.linimasaTitik, styles.titikTunggu]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.linimasaJudul}>
                        {langkahBerikutnya()}
                      </Text>
                      <Text style={styles.linimasaWaktu}>Sedang berjalan</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Panel: Laporan Biaya (trip.expense_report) */}
        {trip.expense_report && (
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Laporan Biaya</Text>
                <Text style={styles.panelSub}>
                  Pertanggungjawaban pengeluaran setelah perjalanan
                </Text>
              </View>
              {(() => {
                const rupaLap =
                  RUPA_STATUS_LAPORAN[trip.expense_report.status] ??
                  RUPA_STATUS_LAPORAN.draft;
                return (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: rupaLap.badgeBg,
                        borderColor: rupaLap.border,
                        borderStyle: rupaLap.dashed ? 'dashed' : 'solid',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: rupaLap.dot },
                      ]}
                    />
                    <Text
                      style={[styles.statusText, { color: rupaLap.badgeText }]}
                    >
                      {trip.expense_report.status_label || rupaLap.label}
                    </Text>
                  </View>
                );
              })()}
            </View>
            <View style={styles.panelBody}>
              <View style={styles.pasanganRow}>
                <Text style={styles.pasanganDt}>Total diklaim</Text>
                <Text style={[styles.pasanganDd, styles.tabular]}>
                  {formatRupiah(trip.expense_report.total_claimed)}
                </Text>
              </View>
              <View style={styles.pasanganRow}>
                <Text style={styles.pasanganDt}>Total disetujui</Text>
                <Text style={[styles.pasanganDd, styles.tabular]}>
                  {formatRupiah(trip.expense_report.total_approved)}
                </Text>
              </View>
              {trip.expense_report.settlement_type && (
                <View style={styles.pasanganRow}>
                  <Text style={styles.pasanganDt}>Penyelesaian</Text>
                  <Text style={styles.pasanganDd}>
                    {LABEL_PENYELESAIAN[trip.expense_report.settlement_type]} (
                    {formatRupiah(Math.abs(trip.expense_report.difference))})
                  </Text>
                </View>
              )}
              {trip.expense_report.summary ? (
                <View style={styles.pasanganRow}>
                  <Text style={styles.pasanganDt}>Ringkasan kegiatan</Text>
                  <Text style={styles.pasanganDd}>
                    {trip.expense_report.summary}
                  </Text>
                </View>
              ) : null}
              {trip.expense_report.verification_note ? (
                <View style={[styles.pasanganRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.pasanganDt}>Catatan verifikasi</Text>
                  <Text style={styles.pasanganDd}>
                    {trip.expense_report.verification_note}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Panel: Pencairan Dana (trip.disbursements) */}
        {trip.disbursements && trip.disbursements.length > 0 && (
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>Pencairan Dana</Text>
            </View>
            <View style={styles.panelBody}>
              {trip.disbursements.map((c) => {
                const rupaCair =
                  RUPA_STATUS_PENCAIRAN[c.status] ??
                  RUPA_STATUS_PENCAIRAN.pending;
                return (
                  <View key={c.id} style={styles.costRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.disbTopRow}>
                        <Text style={styles.costCategory}>{c.type_label}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: rupaCair.badgeBg,
                              borderColor: rupaCair.border,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: rupaCair.dot },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: rupaCair.badgeText },
                            ]}
                          >
                            {c.status_label || rupaCair.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.costMeta}>
                        Metode:{' '}
                        {c.method
                          ? c.method_label || LABEL_METODE_BAYAR[c.method]
                          : '—'}{' '}
                        · Ref: {c.reference_number || '—'} · Dibayar:{' '}
                        {c.paid_at ? formatTanggal(c.paid_at) : '—'}
                      </Text>
                    </View>
                    <Text style={styles.costSubtotal}>
                      {formatRupiah(c.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Panel: Alur Flowchart Perjalanan Dinas (Tahap 1 s/d Tahap 9) */}
        {(() => {
          const st = trip.status;
          const repSt = trip.expense_report?.status;
          const activeStep =
            st === 'draft'
              ? 2
              : st === 'submitted'
              ? 3
              : st === 'rejected'
              ? 3
              : st === 'supervisor_approved'
              ? 4
              : st === 'approved' && (!repSt || repSt === 'draft' || repSt === 'returned')
              ? 6
              : st === 'approved' && repSt === 'submitted'
              ? 8
              : st === 'completed'
              ? 9
              : 2;

          const flowchartSteps = [
            {
              no: 1,
              title: '1. Karyawan Login App Mobile',
              desc: 'Autentikasi akun perusahaan PT. Citra Mandiri',
            },
            {
              no: 2,
              title: '2. Input Form SPPD Digital & Cek Travel Policy',
              desc:
                trip.estimated_cost > Math.max(1, trip.duration_days) * 2500000
                  ? '⚠ Ditandai Over-Budget (Melebihi Plafon Travel Policy) · Push & Email terkirim'
                  : '✓ Form Lengkap & Sesuai Travel Policy · Push & Email terkirim',
            },
            {
              no: 3,
              title: '3. Review Atasan / Dept Head',
              desc:
                st === 'rejected'
                  ? 'Status: REJECTED / REVISION NEEDED — Perlu revisi SPPD'
                  : 'Disetujui Atasan → Lanjut ke Approval Level 2 / Keuangan',
            },
            {
              no: 4,
              title: '4. Verifikasi & Approval Keuangan + Pencairan Uang Muka',
              desc:
                trip.advance_approved
                  ? `Status: APPROVED · Uang Muka ${formatRupiah(trip.advance_approved)}`
                  : 'Verifikasi anggaran departemen & pencairan uang muka / booking',
            },
            {
              no: 5,
              title: '5. Karyawan Selesai Dinas',
              desc: `Pelaksanaan dinas ke ${trip.destination} (${trip.duration_days} hari)`,
            },
            {
              no: 6,
              title: '6. Scan / Unggah Nota via Kamera & Cek Nota Duplikat',
              desc: 'Validasi keaslian nota & blokir otomatis apabila ditemukan nota duplikat',
            },
            {
              no: 7,
              title: '7. Hitung Selisih: Real Cost − Uang Muka',
              desc: trip.expense_report
                ? `Real Cost ${formatRupiah(trip.expense_report.total_claimed)} · Selisih ${formatRupiah(
                    Math.abs(trip.expense_report.difference)
                  )}`
                : 'Penentuan Pelaporan Sesuai / Pengembalian Sisa Uang Muka / Klaim Reimbursement',
            },
            {
              no: 8,
              title: '8. Verifikasi Nota oleh Keuangan (CLOSED & SETTLED)',
              desc:
                st === 'completed'
                  ? 'Status: CLOSED & SETTLED — Seluruh nota terverifikasi & lunas'
                  : 'Pemeriksaan bukti pengeluaran oleh bagian Keuangan',
            },
            {
              no: 9,
              title: '9. Catat Audit Log & Sync Payroll / Akuntansi',
              desc:
                st === 'completed'
                  ? `Tercatat di Audit Log (${formatWaktu(trip.completed_at || trip.updated_at)}) & tersinkron ke Akuntansi`
                  : 'Pencatatan otomatis jejak audit & sinkronisasi buku besar akuntansi',
            },
          ];

          return (
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <View>
                  <Text style={styles.panelTitle}>
                    Alur Flowchart Perjalanan Dinas (Tahap 1–9)
                  </Text>
                  <Text style={styles.panelSub}>
                    Posisi SPPD saat ini: Tahap {activeStep} dari 9
                  </Text>
                </View>
              </View>
              <View style={styles.panelBody}>
                {flowchartSteps.map((step) => {
                  const isDone = step.no < activeStep || st === 'completed';
                  const isCurrent = step.no === activeStep && st !== 'completed';
                  return (
                    <View
                      key={step.no}
                      style={[
                        styles.costRow,
                        { alignItems: 'flex-start', gap: 10 },
                        isCurrent && {
                          borderColor: Colors.ketiga,
                          backgroundColor: Colors.ketigaLembut,
                          paddingHorizontal: 10,
                          borderRadius: Radii.md,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          backgroundColor: isDone
                            ? Colors.tinta
                            : isCurrent
                            ? Colors.ketiga
                            : Colors.garis,
                          borderColor:
                            isDone || isCurrent ? Colors.tinta : Colors.garisTegas,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: isDone
                              ? Colors.utama
                              : isCurrent
                              ? Colors.tinta
                              : Colors.tintaLembut,
                          }}
                        >
                          {isDone ? '✓' : String(step.no)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.costCategory}>{step.title}</Text>
                        <Text style={styles.costMeta}>{step.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Footer Actions Card */}
        {(trip.is_cancellable ||
          trip.is_editable ||
          trip.status === 'draft' ||
          bisaIsiLaporan) && (
          <View style={styles.footerBar}>
            {trip.is_cancellable && (
              <TouchableOpacity
                style={styles.btnBahaya}
                onPress={handleCancelRequest}
                disabled={submittingAction}
              >
                <Text style={styles.btnBahayaText}>Batalkan</Text>
              </TouchableOpacity>
            )}

            {trip.is_editable && (
              <TouchableOpacity
                style={styles.btnSekunder}
                onPress={() => onEdit(trip.id)}
                disabled={submittingAction}
              >
                <Text style={styles.btnSekunderText}>Ubah</Text>
              </TouchableOpacity>
            )}

            {trip.status === 'draft' && (
              <TouchableOpacity
                style={styles.btnUtama}
                onPress={handleSubmitDraft}
                disabled={submittingAction}
              >
                <Text style={styles.btnUtamaText}>
                  {submittingAction ? 'Mengajukan…' : 'Ajukan ke Supervisor'}
                </Text>
              </TouchableOpacity>
            )}

            {bisaIsiLaporan && (
              <TouchableOpacity
                style={styles.btnUtama}
                onPress={() => onOpenExpenses(trip.id)}
              >
                <Text style={styles.btnUtamaText}>Laporan biaya</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.latar,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.latar,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13.5,
    color: Colors.tintaLembut,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.tintaLembut,
    marginBottom: 14,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 80,
  },
  pageHead: {
    marginBottom: 14,
    padding: 14,
    backgroundColor: Colors.latarSorot,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderRadius: Radii.lg,
  },
  backLink: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.tinta,
    textDecorationLine: 'underline',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  h1: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.tinta,
  },
  subTitle: {
    fontSize: 12.5,
    color: Colors.tintaLembut,
    marginTop: 2,
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
  kotakGalat: {
    backgroundColor: Colors.ketiga,
    borderWidth: 1,
    borderColor: Colors.kedua,
    borderLeftWidth: 4,
    borderLeftColor: Colors.kedua,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 16,
  },
  kotakGalatText: {
    color: Colors.kedua,
    fontSize: 13,
    fontWeight: '600',
  },
  ringkasDetail: {
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    marginBottom: 22,
    overflow: 'hidden',
  },
  ringkasRow: {
    flexDirection: 'row',
  },
  ringkasRowTopBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.garis,
  },
  ringkasCell: {
    flex: 1,
    padding: 12,
  },
  ringkasCellRightBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.garis,
  },
  ringkasLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.tintaLembut,
  },
  ringkasValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.tinta,
    marginTop: 3,
  },
  ringkasNote: {
    fontSize: 11.5,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garisTegas,
    gap: 10,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.tinta,
  },
  panelSub: {
    fontSize: 12.5,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  panelBody: {
    paddingTop: 12,
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
  mutedText: {
    fontSize: 13,
    color: Colors.tintaLembut,
    paddingVertical: 6,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
    gap: 12,
  },
  costCategory: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  costDesc: {
    fontSize: 12.5,
    color: Colors.tinta,
    marginTop: 2,
  },
  costMeta: {
    fontSize: 12,
    color: Colors.tintaLembut,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  costSubtotal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
    fontVariant: ['tabular-nums'],
  },
  costTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: Colors.tinta,
  },
  costTotalLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  costTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.tinta,
    fontVariant: ['tabular-nums'],
  },
  berkasItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: Colors.garis,
    borderRadius: Radii.md,
    marginBottom: 6,
  },
  berkasNama: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.tinta,
  },
  berkasMeta: {
    fontSize: 11.5,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  tautanText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.tinta,
    textDecorationLine: 'underline',
    marginLeft: 10,
  },
  linimasa: {
    gap: 12,
  },
  linimasaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  linimasaTitik: {
    width: 12,
    height: 12,
    borderRadius: Radii.pill,
    borderWidth: 2,
    borderColor: Colors.tinta,
    marginTop: 3,
  },
  titikSelesai: {
    backgroundColor: Colors.tinta,
  },
  titikTunggu: {
    backgroundColor: Colors.ketiga,
  },
  titikTolak: {
    backgroundColor: Colors.latar,
    borderColor: Colors.tinta,
  },
  linimasaJudul: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  linimasaWaktu: {
    fontSize: 12,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  linimasaCatatan: {
    marginTop: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: Colors.latarSorot,
    borderLeftWidth: 3,
    borderLeftColor: Colors.tinta,
    borderRadius: Radii.sm,
  },
  linimasaCatatanText: {
    fontSize: 12.5,
    color: Colors.tinta,
  },
  disbTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.garisTegas,
    backgroundColor: Colors.latar,
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
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  btnSekunderText: {
    color: Colors.tinta,
    fontSize: 13,
    fontWeight: '600',
  },
  btnBahaya: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  btnBahayaText: {
    color: Colors.tinta,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

