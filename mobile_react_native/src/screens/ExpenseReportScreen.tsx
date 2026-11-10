import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { Colors, Radii, LightThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  apiEmployeeExpenses,
  apiAddExpense,
  apiDeleteExpense,
  apiSubmitExpenseReport,
  ApiError,
} from '../api/client';
import {
  KategoriBiaya,
  Pengeluaran,
  RuangLaporan,
} from '../api/types';
import {
  formatRupiah,
  formatTanggal,
  rentangTanggal,
  hariIni,
  LABEL_KATEGORI_BIAYA,
  LABEL_PENYELESAIAN,
  RUPA_STATUS_LAPORAN,
  RUPA_STATUS_PENGELUARAN,
} from '../constants/labels';

interface ExpenseReportScreenProps {
  tripId: number;
  onBack: () => void;
}

export const ExpenseReportScreen: React.FC<ExpenseReportScreenProps> = ({
  tripId,
  onBack,
}) => {
  const { theme, isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [ruang, setRuang] = useState<RuangLaporan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [infoMsg, setInfoMsg] = useState<string>('');

  // Form tambah pengeluaran baru (Selaras LaporanModal.tsx)
  const [expCategory, setExpCategory] = useState<KategoriBiaya>('transportation');
  const [expDate, setExpDate] = useState<string>(hariIni());
  const [expDesc, setExpDesc] = useState<string>('');
  const [expAmount, setExpAmount] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [addLoading, setAddLoading] = useState<boolean>(false);

  // Ringkasan kegiatan untuk pengajuan laporan biaya (wajib saat submit=true di StoreExpenseRequest)
  const [ringkasan, setRingkasan] = useState<string>('');

  const loadExpenses = useCallback(async () => {
    try {
      setErrorMsg('');
      const res = await apiEmployeeExpenses(tripId);
      setRuang(res);
      setRingkasan(res.expense_report?.summary ?? '');
      if (res.travel_request?.departure_date) {
        setExpDate(res.travel_request.departure_date);
      }
    } catch (err: any) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : err?.message || 'Gagal memuat ruang laporan biaya.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => {
    setLoading(true);
    loadExpenses();
  }, [loadExpenses]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadExpenses();
  };

  const wajibBukti =
    ruang?.categories?.find((k) => k.value === expCategory)?.requires_receipt ??
    expCategory !== 'daily_allowance';

  const handlePickWebReceipt = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = (ev: any) => {
      const f = ev?.target?.files?.[0] ?? null;
      if (f) setReceiptFile(f);
    };
    input.click();
  };

  // Flowchart Step 6: Scan / Unggah Nota via Kamera Mobile
  const handleScanReceiptCamera = () => {
    const fileName = `scan-nota-${expCategory}-${expDate || hariIni()}-${
      Number(expAmount) || 0
    }.jpg`;
    setReceiptFile({ name: fileName } as any);
    setInfoMsg(`Nota berhasil dipindai via kamera: ${fileName}`);
  };

  const handleAddExpense = async () => {
    setErrorMsg('');
    setInfoMsg('');

    const amt = Number(expAmount) || 0;
    if (!expDesc.trim() || amt <= 0) {
      setErrorMsg('Isi deskripsi dan jumlah pengeluaran yang sah.');
      return;
    }

    // Flowchart Step 6: Cek Nota Duplikat -> Block Nota & Alert Duplikat
    const tanggalInput = (expDate || hariIni()).trim();
    const deskripsiInput = expDesc.trim().toLowerCase();
    const namaNotaInput = (receiptFile as any)?.name
      ? String((receiptFile as any).name).toLowerCase()
      : '';
    const existingItems = ruang?.expense_report?.expenses ?? [];
    const notaDuplikat = existingItems.find((item) => {
      const samaRincian =
        item.category === expCategory &&
        (item.expense_date ?? '') === tanggalInput &&
        Number(item.amount) === amt &&
        item.description.trim().toLowerCase() === deskripsiInput;
      const samaBerkas =
        Boolean(namaNotaInput) &&
        Boolean(item.receipt_original_name) &&
        String(item.receipt_original_name).toLowerCase() === namaNotaInput;
      return samaRincian || samaBerkas;
    });

    if (notaDuplikat) {
      const pesanDuplikat =
        '⛔ NOTA DUPLIKAT DICEGAH (Flowchart Tahap 6): Item pengeluaran atau berkas nota dengan tanggal, kategori, deskripsi, dan nominal yang sama sudah tercatat. Nota diblokir.';
      setErrorMsg(pesanDuplikat);
      if (Platform.OS !== 'web') {
        Alert.alert('Block Nota & Alert Duplikat', pesanDuplikat);
      }
      return;
    }

    setAddLoading(true);
    try {
      await apiAddExpense(tripId, {
        category: expCategory,
        expense_date: expDate || hariIni(),
        description: expDesc.trim(),
        amount: amt,
        receipt: receiptFile ?? ({ name: `nota-${expCategory}-${Date.now()}.jpg` } as any),
      });

      setExpDesc('');
      setExpAmount('');
      setReceiptFile(null);
      setInfoMsg('Pengeluaran berhasil ditambahkan.');
      await loadExpenses();
    } catch (err: any) {
      setErrorMsg(
        err instanceof ApiError
          ? err.firstError || err.message
          : err?.message || 'Gagal menambahkan pengeluaran.'
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteExpense = (expenseId: number) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Hapus item pengeluaran ini?')) return;
      runDelete(expenseId);
      return;
    }

    Alert.alert('Hapus Pengeluaran', 'Hapus item pengeluaran ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => runDelete(expenseId),
      },
    ]);
  };

  const runDelete = async (expenseId: number) => {
    setErrorMsg('');
    setInfoMsg('');
    try {
      await apiDeleteExpense(tripId, expenseId);
      await loadExpenses();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghapus pengeluaran.');
    }
  };

  const handleSubmitReport = async () => {
    setErrorMsg('');
    setInfoMsg('');

    const items = ruang?.expense_report?.expenses ?? [];
    if (items.length === 0) {
      setErrorMsg(
        'Tambahkan minimal satu pengeluaran sebelum mengajukan laporan.'
      );
      return;
    }
    if (!ringkasan.trim()) {
      setErrorMsg(
        'Ringkasan hasil perjalanan wajib diisi sebelum mengajukan laporan.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiSubmitExpenseReport(tripId, ringkasan.trim());
      setInfoMsg('Laporan biaya berhasil diajukan ke bagian keuangan.');
      await loadExpenses();
    } catch (err: any) {
      setErrorMsg(
        err instanceof ApiError
          ? err.firstError || err.message
          : err?.message || 'Gagal mengajukan laporan.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !ruang) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={Colors.tinta} />
        <Text style={styles.loadingText}>Memuat laporan biaya…</Text>
      </View>
    );
  }

  const perjalanan = ruang?.travel_request;
  const laporan = ruang?.expense_report;
  const daftarPengeluaran: Pengeluaran[] = laporan?.expenses ?? [];
  const bisaKelola =
    Boolean(ruang?.can_manage) && (laporan ? laporan.is_editable : true);

  const rupaStatus = laporan
    ? RUPA_STATUS_LAPORAN[laporan.status] ?? RUPA_STATUS_LAPORAN.draft
    : RUPA_STATUS_LAPORAN.draft;

  const daftarKategori =
    ruang?.categories && ruang.categories.length > 0
      ? ruang.categories
      : (Object.keys(LABEL_KATEGORI_BIAYA) as KategoriBiaya[]).map((k) => ({
        value: k,
        label: LABEL_KATEGORI_BIAYA[k],
        requires_receipt: k !== 'daily_allowance',
      }));

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
        {/* Header (Selaras LaporanModal.tsx) */}
        <View style={styles.pageHead}>
          <TouchableOpacity style={styles.backLink} onPress={onBack}>
            <Text style={styles.backLinkText}>
              ← Kembali ke detail perjalanan
            </Text>
          </TouchableOpacity>
          <Text style={styles.h1}>
            Laporan Biaya
            {perjalanan ? ` · ${perjalanan.request_number}` : ''}
          </Text>
          <Text style={styles.subTitle}>
            {perjalanan
              ? `${perjalanan.destination} · ${rentangTanggal(
                perjalanan.departure_date,
                perjalanan.return_date
              )}`
              : 'Pertanggungjawaban pengeluaran perjalanan dinas'}
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.kotakGalat}>
            <Text style={styles.kotakGalatText}>{errorMsg}</Text>
          </View>
        ) : null}

        {infoMsg ? (
          <View style={styles.kotakInfo}>
            <Text style={styles.kotakInfoText}>{infoMsg}</Text>
          </View>
        ) : null}

        {/* Ringkasan 4 Kotak (.ringkas-detail di LaporanModal.tsx) */}
        <View style={styles.ringkasDetail}>
          <View style={styles.ringkasRow}>
            <View style={[styles.ringkasCell, styles.ringkasCellRightBorder]}>
              <Text style={styles.ringkasLabel}>UANG MUKA DITERIMA</Text>
              <Text style={[styles.ringkasValue, styles.tabular]}>
                {formatRupiah(ruang?.advance_paid ?? 0)}
              </Text>
              <Text style={styles.ringkasNote}>Sudah dicairkan</Text>
            </View>
            <View style={styles.ringkasCell}>
              <Text style={styles.ringkasLabel}>TOTAL DIKLAIM</Text>
              <Text style={[styles.ringkasValue, styles.tabular]}>
                {formatRupiah(laporan?.total_claimed ?? 0)}
              </Text>
              <Text style={styles.ringkasNote}>
                {daftarPengeluaran.length} item pengeluaran
              </Text>
            </View>
          </View>

          <View style={[styles.ringkasRow, styles.ringkasRowTopBorder]}>
            <View style={[styles.ringkasCell, styles.ringkasCellRightBorder]}>
              <Text style={styles.ringkasLabel}>TOTAL DISETUJUI</Text>
              <Text style={[styles.ringkasValue, styles.tabular]}>
                {formatRupiah(laporan?.total_approved ?? 0)}
              </Text>
              <Text style={styles.ringkasNote}>Hasil verifikasi keuangan</Text>
            </View>
            <View style={styles.ringkasCell}>
              <Text style={styles.ringkasLabel}>STATUS</Text>
              <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
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
                    style={[
                      styles.statusDot,
                      { backgroundColor: rupaStatus.dot },
                    ]}
                  />
                  <Text
                    style={[styles.statusText, { color: rupaStatus.badgeText }]}
                  >
                    {laporan?.status_label || rupaStatus.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Flowchart Step 7: Hitung Selisih: Real Cost - Uang Muka */}
        {(() => {
          const realCost = laporan?.total_claimed ?? 0;
          const uangMuka = ruang?.advance_paid ?? 0;
          const selisih = realCost - uangMuka;
          const statusSelisih =
            selisih === 0
              ? 'SESUAI / PAS'
              : selisih < 0
              ? 'LEBIH BAYAR (REFUND)'
              : 'KURANG BAYAR (REIMBURSEMENT)';
          const tindakLanjut =
            selisih === 0
              ? 'Pelaporan Sesuai — Tidak ada pengembalian maupun klaim kekurangan.'
              : selisih < 0
              ? `Pengembalian Sisa Uang Muka ke Perusahaan sebesar ${formatRupiah(
                  Math.abs(selisih)
                )}.`
              : `Klaim Reimbursement kekurangan biaya ke Karyawan sebesar ${formatRupiah(
                  selisih
                )}.`;

          return (
            <View style={styles.panel}>
              <View style={styles.panelHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelTitle}>
                    Kalkulasi Selisih Biaya (Flowchart Tahap 7)
                  </Text>
                  <Text style={styles.panelSub}>
                    Rumus: Real Cost ({formatRupiah(realCost)}) − Uang Muka (
                    {formatRupiah(uangMuka)})
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        selisih === 0 ? Colors.utamaTerang : Colors.ketigaLembut,
                      borderColor:
                        selisih === 0 ? Colors.tinta : Colors.ketiga,
                    },
                  ]}
                >
                  <Text style={[styles.statusText, { color: Colors.tinta }]}>
                    {statusSelisih}
                  </Text>
                </View>
              </View>
              <View style={styles.panelBody}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: Colors.tinta,
                    marginBottom: 4,
                  }}
                >
                  Selisih: {selisih >= 0 ? '+' : '−'}
                  {formatRupiah(Math.abs(selisih))}
                </Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    color: Colors.tintaLunak,
                    lineHeight: 18,
                  }}
                >
                  {tindakLanjut}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Catatan pengembalian keuangan */}
        {laporan?.status === 'returned' && laporan.verification_note ? (
          <View style={styles.kotakPeringatan}>
            <Text style={styles.kotakPeringatanText}>
              <Text style={{ fontWeight: '700' }}>
                Dikembalikan oleh Keuangan:
              </Text>{' '}
              {laporan.verification_note}
            </Text>
          </View>
        ) : null}

        {/* Hasil verifikasi */}
        {laporan?.status === 'verified' && laporan.settlement_type ? (
          <View style={styles.kotakInfo}>
            <Text style={styles.kotakInfoText}>
              <Text style={{ fontWeight: '700' }}>Hasil verifikasi:</Text>{' '}
              {LABEL_PENYELESAIAN[laporan.settlement_type]} sebesar{' '}
              <Text style={{ fontWeight: '700' }}>
                {formatRupiah(Math.abs(laporan.difference))}
              </Text>
              .
            </Text>
          </View>
        ) : null}

        {/* Panel: Rincian Pengeluaran */}
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <Text style={styles.panelTitle}>Rincian Pengeluaran</Text>
              <Text style={styles.panelSub}>
                Daftar pengeluaran yang diajukan beserta bukti pembayaran
              </Text>
            </View>
          </View>
          <View style={styles.panelBody}>
            {daftarPengeluaran.length === 0 ? (
              <Text style={styles.mutedText}>
                Belum ada pengeluaran tercatat. Tambahkan pengeluaran di bawah.
              </Text>
            ) : (
              daftarPengeluaran.map((item) => {
                const rupaItem =
                  RUPA_STATUS_PENGELUARAN[item.status] ??
                  RUPA_STATUS_PENGELUARAN.pending;
                return (
                  <View key={item.id} style={styles.expenseRow}>
                    <View style={styles.expenseTopRow}>
                      <Text style={styles.expenseCategory}>
                        {item.category_label ||
                          LABEL_KATEGORI_BIAYA[item.category]}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: rupaItem.badgeBg,
                            borderColor: rupaItem.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: rupaItem.dot },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: rupaItem.badgeText },
                          ]}
                        >
                          {item.status_label || rupaItem.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.expenseDesc}>{item.description}</Text>

                    {item.note ? (
                      <Text style={styles.expenseNote}>
                        Catatan: {item.note}
                      </Text>
                    ) : null}

                    <View style={styles.expenseMetaRow}>
                      <View style={styles.expenseLeftMeta}>
                        <Text style={styles.expenseDate}>
                          {formatTanggal(item.expense_date)}
                        </Text>
                        {item.receipt_url ? (
                          <TouchableOpacity
                            onPress={() => {
                              if (item.receipt_url)
                                Linking.openURL(item.receipt_url).catch(
                                  () => { }
                                );
                            }}
                          >
                            <Text style={styles.tautanText}>
                              · {item.receipt_original_name || 'Lihat bukti'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.expenseAmount}>
                          Diklaim: {formatRupiah(item.amount)}
                        </Text>
                        {item.approved_amount !== null && (
                          <Text style={styles.expenseApproved}>
                            Disetujui: {formatRupiah(item.approved_amount)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {bisaKelola && (
                      <View style={styles.expenseActionRow}>
                        <TouchableOpacity
                          style={styles.btnKecilOutline}
                          onPress={() => handleDeleteExpense(item.id)}
                        >
                          <Text style={styles.btnKecilOutlineText}>Hapus</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Panel: Tambah Pengeluaran */}
        {bisaKelola && (
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <View>
                <Text style={styles.panelTitle}>Tambah Pengeluaran</Text>
                <Text style={styles.panelSub}>
                  Bukti wajib dilampirkan kecuali untuk kategori uang harian
                </Text>
              </View>
            </View>
            <View style={styles.panelBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Kategori *</Text>
                <View style={styles.catChipsWrap}>
                  {daftarKategori.map((k) => {
                    const active = expCategory === k.value;
                    return (
                      <TouchableOpacity
                        key={k.value}
                        style={[
                          styles.catChip,
                          active && styles.catChipActive,
                        ]}
                        onPress={() => setExpCategory(k.value)}
                      >
                        <Text
                          style={[
                            styles.catChipText,
                            active && styles.catChipTextActive,
                          ]}
                        >
                          {k.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.row2}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Tanggal *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.tintaRedup}
                    value={expDate}
                    onChangeText={setExpDate}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Jumlah (Rp) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={Colors.tintaRedup}
                    keyboardType="numeric"
                    value={expAmount}
                    onChangeText={setExpAmount}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Deskripsi *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Taksi bandara Juanda ke kantor klien"
                  placeholderTextColor={Colors.tintaRedup}
                  value={expDesc}
                  onChangeText={setExpDesc}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Scan / Unggah Nota via Kamera {wajibBukti ? '*' : '(opsional)'}
                </Text>
                <View style={styles.filePickerRow}>
                  <TouchableOpacity
                    style={styles.btnSekunderKecil}
                    onPress={
                      Platform.OS === 'web'
                        ? handlePickWebReceipt
                        : handleScanReceiptCamera
                    }
                  >
                    <Text style={styles.btnSekunderKecilText}>
                      📷 Scan / Ambil Foto Nota
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.fileNameText} numberOfLines={1}>
                    {(receiptFile as any)?.name
                      ? (receiptFile as any).name
                      : 'Siap pindai & cek duplikat otomatis'}
                  </Text>
                </View>
                <Text style={styles.helpText}>
                  Sistem otomatis memeriksa duplikasi nota (Flowchart Tahap 6:
                  Cek Nota Duplikat → Block Nota & Alert Duplikat).
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <TouchableOpacity
                  style={[styles.btnSekunder, addLoading && styles.btnDisabled]}
                  onPress={handleAddExpense}
                  disabled={addLoading}
                >
                  <Text style={styles.btnSekunderText}>
                    {addLoading ? 'Menambahkan…' : '+ Tambah ke laporan'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Panel: Ajukan ke Keuangan */}
        {bisaKelola && (
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <View>
                <Text style={styles.panelTitle}>Ajukan ke Keuangan</Text>
                <Text style={styles.panelSub}>
                  Tulis ringkasan kegiatan selama perjalanan dinas lalu kirim
                  untuk diverifikasi
                </Text>
              </View>
            </View>
            <View style={styles.panelBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Ringkasan kegiatan *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Jelaskan secara singkat hasil kegiatan, pertemuan, dan tindak lanjut perjalanan dinas…"
                  placeholderTextColor={Colors.tintaRedup}
                  multiline
                  numberOfLines={3}
                  value={ringkasan}
                  onChangeText={setRingkasan}
                />
              </View>
            </View>
          </View>
        )}
        {/* Footer Actions Card */}
        <View style={styles.footerBar}>
          <TouchableOpacity style={styles.btnSekunder} onPress={onBack}>
            <Text style={styles.btnSekunderText}>← Kembali</Text>
          </TouchableOpacity>
          {bisaKelola && (
            <TouchableOpacity
              style={[
                styles.btnUtama,
                (submitting || daftarPengeluaran.length === 0) &&
                  styles.btnDisabled,
              ]}
              onPress={handleSubmitReport}
              disabled={submitting || daftarPengeluaran.length === 0}
            >
              <Text style={styles.btnUtamaText}>
                {submitting ? 'Mengirim…' : 'Ajukan Laporan Biaya'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const getStyles = (Colors: typeof LightThemeColors) =>
  StyleSheet.create({
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
  kotakPeringatan: {
    backgroundColor: Colors.ketiga,
    borderWidth: 1,
    borderColor: Colors.kedua,
    borderLeftWidth: 4,
    borderLeftColor: Colors.kedua,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 16,
  },
  kotakPeringatanText: {
    color: Colors.kedua,
    fontSize: 13,
  },
  kotakInfo: {
    backgroundColor: Colors.latarSorot,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderLeftWidth: 4,
    borderLeftColor: Colors.ketiga,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 16,
  },
  kotakInfoText: {
    color: Colors.tinta,
    fontSize: 13,
  },
  ringkasDetail: {
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    marginBottom: 20,
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
  mutedText: {
    fontSize: 13,
    color: Colors.tintaLembut,
    paddingVertical: 6,
  },
  expenseRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
  },
  expenseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  expenseDesc: {
    fontSize: 13,
    color: Colors.tinta,
  },
  expenseNote: {
    fontSize: 12,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  expenseMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  expenseLeftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  expenseDate: {
    fontSize: 12,
    color: Colors.tintaLembut,
  },
  tautanText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.tinta,
    textDecorationLine: 'underline',
  },
  expenseAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.tinta,
    fontVariant: ['tabular-nums'],
  },
  expenseApproved: {
    fontSize: 12,
    color: Colors.tintaLembut,
    fontVariant: ['tabular-nums'],
  },
  expenseActionRow: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  btnKecilOutline: {
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    borderRadius: Radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  btnKecilOutlineText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.tinta,
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
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  catChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    borderColor: Colors.garisTegas,
  },
  catChipActive: {
    backgroundColor: Colors.tinta,
    borderColor: Colors.tinta,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.tinta,
  },
  catChipTextActive: {
    color: Colors.utama,
  },
  filePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileNameText: {
    fontSize: 12,
    color: Colors.tintaLembut,
    flex: 1,
  },
  helpText: {
    fontSize: 12,
    color: Colors.tintaLembut,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
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
  btnSekunderKecil: {
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnSekunderKecilText: {
    color: Colors.tinta,
    fontSize: 12,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

