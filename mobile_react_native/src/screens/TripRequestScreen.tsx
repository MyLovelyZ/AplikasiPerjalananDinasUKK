import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors, Radii } from '../theme/colors';
import {
  apiEmployeeRequestOptions,
  apiEmployeeRequestEdit,
  apiCreateEmployeeRequest,
  apiUpdateEmployeeRequest,
  ApiError,
} from '../api/client';
import {
  JenisPerjalanan,
  KategoriBiaya,
  OpsiFormPerjalanan,
  Transportasi,
} from '../api/types';
import {
  formatRupiah,
  rentangTanggal,
  hariIni,
  LABEL_JENIS_PERJALANAN,
  LABEL_TRANSPORTASI,
  LABEL_KATEGORI_BIAYA,
} from '../constants/labels';

interface TripRequestScreenProps {
  editTripId?: number | null;
  onBack: () => void;
  onSuccess: (tripId?: number) => void;
}

interface BarisBiaya {
  category: KategoriBiaya;
  description: string;
  quantity: string;
  unit_price: string;
}

export const TripRequestScreen: React.FC<TripRequestScreenProps> = ({
  editTripId,
  onBack,
  onSuccess,
}) => {
  const isEditing = Boolean(editTripId);
  const [langkah, setLangkah] = useState<1 | 2 | 3>(1);

  // Field formulir (Selaras SubmissionPage.tsx & FormulirPerjalananModal.tsx)
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [tripType, setTripType] = useState<JenisPerjalanan>('domestic');
  const [transportation, setTransportation] = useState<Transportasi>('plane');
  const [departureDate, setDepartureDate] = useState(hariIni(3));
  const [returnDate, setReturnDate] = useState(hariIni(5));
  const [advanceRequested, setAdvanceRequested] = useState('0');
  const [notes, setNotes] = useState('');

  const [costs, setCosts] = useState<BarisBiaya[]>([
    {
      category: 'transportation',
      description: '',
      quantity: '1',
      unit_price: '0',
    },
  ]);

  const [options, setOptions] = useState<OpsiFormPerjalanan | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        if (editTripId) {
          const { travel_request: detail, options: opts } =
            await apiEmployeeRequestEdit(editTripId);
          if (opts) setOptions(opts);

          setPurpose(detail.purpose ?? '');
          setDescription(detail.description ?? '');
          setDestination(detail.destination ?? '');
          setTripType(detail.trip_type ?? 'domestic');
          setTransportation(detail.transportation ?? 'plane');
          setDepartureDate(detail.departure_date ?? hariIni(3));
          setReturnDate(detail.return_date ?? hariIni(5));
          setAdvanceRequested(String(detail.advance_requested ?? 0));
          setNotes(detail.notes ?? '');

          if (detail.cost_estimates && detail.cost_estimates.length > 0) {
            setCosts(
              detail.cost_estimates.map((c) => ({
                category: c.category,
                description: c.description ?? '',
                quantity: String(c.quantity ?? 1),
                unit_price: String(c.unit_price ?? 0),
              }))
            );
          }
        } else {
          const opts = await apiEmployeeRequestOptions().catch(() => null);
          if (opts) setOptions(opts);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Gagal menyiapkan data formulir.');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [editTripId]);

  const totalEstimasi = costs.reduce((sum, item) => {
    const q = Math.max(0, Number(item.quantity) || 0);
    const p = Math.max(0, Number(item.unit_price) || 0);
    return sum + q * p;
  }, 0);

  const durasiHari = (() => {
    if (!departureDate || !returnDate) return 0;
    const selisih =
      (new Date(returnDate).getTime() - new Date(departureDate).getTime()) /
      86400000;
    return selisih >= 0 ? Math.round(selisih) + 1 : 0;
  })();

  // Flowchart Perjalanan Dinas Step 2: Cek Travel Policy & Deteksi Over-Budget
  const plafonPerHari =
    tripType === 'local'
      ? 1000000
      : tripType === 'international'
      ? 6000000
      : 2500000;
  const batasTravelPolicy = Math.max(1, durasiHari) * plafonPerHari;
  const isOverBudget = totalEstimasi > batasTravelPolicy;

  const handleAddCostRow = () => {
    setCosts((prev) => [
      ...prev,
      {
        category: 'meals',
        description: '',
        quantity: '1',
        unit_price: '0',
      },
    ]);
  };

  const handleRemoveCostRow = (index: number) => {
    setCosts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCostRow = (
    index: number,
    patch: Partial<BarisBiaya>
  ) => {
    setCosts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const validLangkah1 = () => {
    if (!purpose.trim() || !destination.trim()) {
      setErrorMsg('Tujuan dan keperluan perjalanan wajib diisi.');
      return false;
    }
    if (!departureDate || !returnDate || returnDate < departureDate) {
      setErrorMsg('Tanggal kembali harus sama atau setelah tanggal berangkat.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const validLangkah2 = () => {
    if (Number(advanceRequested) > totalEstimasi && totalEstimasi > 0) {
      setErrorMsg('Uang muka tidak boleh melebihi total estimasi biaya.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const lanjutLangkah = () => {
    if (langkah === 1 && validLangkah1()) setLangkah(2);
    else if (langkah === 2 && validLangkah2()) setLangkah(3);
  };

  const handleSubmit = async (submitNow: boolean) => {
    if (!validLangkah1() || !validLangkah2()) return;

    const biayaBersih = costs
      .filter((b) => (Number(b.quantity) || 0) * (Number(b.unit_price) || 0) > 0)
      .map((b) => ({
        category: b.category,
        description: b.description || undefined,
        quantity: Math.max(1, Number(b.quantity) || 1),
        unit_price: Math.max(0, Number(b.unit_price) || 0),
      }));

    if (submitNow && biayaBersih.length === 0) {
      setErrorMsg(
        'Isi setidaknya satu rincian estimasi biaya sebelum mengajukan ke supervisor.'
      );
      return;
    }

    const payload = {
      purpose: purpose.trim(),
      description: description.trim() || undefined,
      destination: destination.trim(),
      trip_type: tripType,
      transportation,
      departure_date: departureDate.trim(),
      return_date: returnDate.trim(),
      advance_requested: Math.max(0, Number(advanceRequested) || 0),
      notes: notes.trim() || undefined,
      costs: biayaBersih,
      submit: submitNow,
    };

    setSubmitting(true);
    setErrorMsg('');

    try {
      if (isEditing && editTripId) {
        const res = await apiUpdateEmployeeRequest(editTripId, payload);
        onSuccess(res?.id ?? editTripId);
      } else {
        const res = await apiCreateEmployeeRequest(payload);
        onSuccess(res?.id ?? res?.data?.id);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.firstError || err.message);
      } else {
        setErrorMsg(err?.message || 'Gagal menyimpan pengajuan.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={Colors.tinta} />
        <Text style={styles.loadingText}>Menyiapkan formulir perjalanan…</Text>
      </View>
    );
  }

  const tripTypes: Array<{ key: JenisPerjalanan; label: string }> = [
    { key: 'local', label: LABEL_JENIS_PERJALANAN.local },
    { key: 'domestic', label: LABEL_JENIS_PERJALANAN.domestic },
    { key: 'international', label: LABEL_JENIS_PERJALANAN.international },
  ];

  const transportOptions: Array<{ key: Transportasi; label: string }> = (
    Object.keys(LABEL_TRANSPORTASI) as Transportasi[]
  ).map((k) => ({ key: k, label: LABEL_TRANSPORTASI[k] }));

  const costCategories: Array<{ key: KategoriBiaya; label: string }> =
    options?.expense_categories && options.expense_categories.length > 0
      ? options.expense_categories.map((c) => ({
          key: c.value,
          label: c.label,
        }))
      : (Object.keys(LABEL_KATEGORI_BIAYA) as KategoriBiaya[]).map((k) => ({
          key: k,
          label: LABEL_KATEGORI_BIAYA[k],
        }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* PageHeader (Selaras SubmissionPage.tsx) */}
      <View style={styles.pageTitle}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowBar} />
          <Text style={styles.eyebrowText}>PENGAJUAN BARU</Text>
        </View>
        <Text style={styles.h1}>
          {isEditing ? 'Ubah Perjalanan Dinas' : 'Ajukan Perjalanan Dinas'}
        </Text>
        <Text style={styles.pageDesc}>
          Isi rincian perjalanan, estimasi biaya, lalu simpan sebagai draf atau
          kirim langsung ke supervisor.
        </Text>
        <View style={styles.pageActions}>
          <TouchableOpacity style={styles.btnSekunder} onPress={onBack}>
            <Text style={styles.btnSekunderText}>← Kembali</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Indikator Langkah (.langkah-wizard di SubmissionPage.tsx) */}
      <View style={styles.langkahWizard}>
        {(
          [
            [1, 'Detail perjalanan'],
            [2, 'Estimasi biaya'],
            [3, 'Catatan & kirim'],
          ] as const
        ).map(([no, judul]) => {
          const aktif = langkah === no;
          const selesai = langkah > no;
          return (
            <TouchableOpacity
              key={no}
              style={[
                styles.langkahItem,
                aktif && styles.langkahItemAktif,
                selesai && styles.langkahItemSelesai,
              ]}
              onPress={() => {
                if (no < langkah) setLangkah(no);
                else if (no === 2 && validLangkah1()) setLangkah(2);
                else if (no === 3 && validLangkah1() && validLangkah2())
                  setLangkah(3);
              }}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.langkahNomor,
                  (aktif || selesai) && styles.langkahNomorAktif,
                ]}
              >
                <Text
                  style={[
                    styles.langkahNomorText,
                    (aktif || selesai) && styles.langkahNomorTextAktif,
                  ]}
                >
                  {selesai ? '✓' : no}
                </Text>
              </View>
              <Text
                style={[
                  styles.langkahJudul,
                  aktif && styles.langkahJudulAktif,
                ]}
                numberOfLines={1}
              >
                {judul}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errorMsg ? (
        <View style={styles.kotakGalat}>
          <Text style={styles.kotakGalatText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* LANGKAH 1: DETAIL PERJALANAN */}
      {langkah === 1 && (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <Text style={styles.panelTitle}>1. Detail Perjalanan</Text>
              <Text style={styles.panelSub}>
                Tujuan, tanggal, jenis perjalanan, dan moda transportasi
              </Text>
            </View>
          </View>

          <View style={styles.panelBody}>
            <View style={styles.field}>
              <Text style={styles.label}>Tujuan *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Surabaya, Jawa Timur"
                placeholderTextColor={Colors.tintaRedup}
                value={destination}
                onChangeText={setDestination}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Jenis perjalanan *</Text>
              <View style={styles.pillsRow}>
                {tripTypes.map((t) => {
                  const active = tripType === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.pillOption,
                        active && styles.pillOptionActive,
                      ]}
                      onPress={() => setTripType(t.key)}
                    >
                      <Text
                        style={[
                          styles.pillOptionText,
                          active && styles.pillOptionTextActive,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.datesRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Tanggal berangkat *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.tintaRedup}
                  value={departureDate}
                  onChangeText={setDepartureDate}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Tanggal kembali *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.tintaRedup}
                  value={returnDate}
                  onChangeText={setReturnDate}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Transportasi utama *</Text>
              <View style={styles.transportWrap}>
                {transportOptions.map((tr) => {
                  const active = transportation === tr.key;
                  return (
                    <TouchableOpacity
                      key={tr.key}
                      style={[
                        styles.transportChip,
                        active && styles.pillOptionActive,
                      ]}
                      onPress={() => setTransportation(tr.key)}
                    >
                      <Text
                        style={[
                          styles.pillOptionText,
                          active && styles.pillOptionTextActive,
                        ]}
                      >
                        {tr.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Keperluan perjalanan *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Kunjungan klien & audit proyek cabang Timur"
                placeholderTextColor={Colors.tintaRedup}
                value={purpose}
                onChangeText={setPurpose}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Deskripsi / agenda singkat</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ringkasan kegiatan selama perjalanan dinas (opsional)"
                placeholderTextColor={Colors.tintaRedup}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>
        </View>
      )}

      {/* LANGKAH 2: ESTIMASI BIAYA */}
      {langkah === 2 && (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>2. Estimasi Biaya</Text>
              <Text style={styles.panelSub}>
                Perkiraan biaya per kategori dan uang muka yang dibutuhkan
              </Text>
            </View>
            <TouchableOpacity
              style={styles.btnSekunderKecil}
              onPress={handleAddCostRow}
            >
              <Text style={styles.btnSekunderKecilText}>+ Tambah baris</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.panelBody}>
            {costs.map((item, idx) => {
              const subtotal =
                (Math.max(0, Number(item.quantity)) || 0) *
                (Math.max(0, Number(item.unit_price)) || 0);

              return (
                <View key={idx} style={styles.costItemBox}>
                  <View style={styles.costItemHeader}>
                    <Text style={styles.costItemIndex}>
                      Baris biaya #{idx + 1}
                    </Text>
                    {costs.length > 1 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveCostRow(idx)}
                      >
                        <Text style={styles.removeCostText}>Hapus ✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.catChipsWrap}>
                    {costCategories.map((cat) => {
                      const active = item.category === cat.key;
                      return (
                        <TouchableOpacity
                          key={cat.key}
                          style={[
                            styles.catChip,
                            active && styles.pillOptionActive,
                          ]}
                          onPress={() =>
                            handleUpdateCostRow(idx, { category: cat.key })
                          }
                        >
                          <Text
                            style={[
                              styles.catChipText,
                              active && styles.pillOptionTextActive,
                            ]}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Keterangan (mis. Tiket PP, Hotel 2 malam)"
                    placeholderTextColor={Colors.tintaRedup}
                    value={item.description}
                    onChangeText={(v) =>
                      handleUpdateCostRow(idx, { description: v })
                    }
                  />

                  <View style={styles.datesRow}>
                    <View style={{ flex: 1, marginTop: 8 }}>
                      <Text style={styles.subLabel}>Jml</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={item.quantity}
                        onChangeText={(v) =>
                          handleUpdateCostRow(idx, { quantity: v })
                        }
                      />
                    </View>
                    <View style={{ flex: 2, marginTop: 8 }}>
                      <Text style={styles.subLabel}>Harga satuan (Rp)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={item.unit_price}
                        onChangeText={(v) =>
                          handleUpdateCostRow(idx, { unit_price: v })
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalVal}>
                      {formatRupiah(subtotal)}
                    </Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.totalBar}>
              <Text style={styles.totalBarLabel}>Total Estimasi</Text>
              <Text style={styles.totalBarVal}>
                {formatRupiah(totalEstimasi)}
              </Text>
            </View>

            {/* Flowchart Step 2: Cek Travel Policy & Over-Budget */}
            <View
              style={[
                styles.costItemBox,
                {
                  marginTop: 12,
                  borderColor: isOverBudget ? Colors.ketiga : Colors.tinta,
                  backgroundColor: isOverBudget
                    ? Colors.ketigaLembut
                    : Colors.utamaTerang,
                },
              ]}
            >
              <View style={styles.costItemHeader}>
                <Text style={styles.costItemIndex}>
                  CEK TRAVEL POLICY (FLOWCHART TAHAP 2)
                </Text>
                <View
                  style={{
                    backgroundColor: isOverBudget ? Colors.ketiga : Colors.tinta,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: Radii.penuh,
                  }}
                >
                  <Text
                    style={{
                      color: isOverBudget ? Colors.tinta : Colors.utama,
                      fontSize: 10,
                      fontWeight: '700',
                    }}
                  >
                    {isOverBudget ? 'TANDAI OVER-BUDGET' : 'SESUAI POLICY'}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: Colors.tinta,
                  lineHeight: 18,
                  marginTop: 4,
                }}
              >
                Plafon {LABEL_JENIS_PERJALANAN[tripType]} ({Math.max(1, durasiHari)}{' '}
                hari × {formatRupiah(plafonPerHari)}/hari):{' '}
                <Text style={{ fontWeight: '700' }}>
                  {formatRupiah(batasTravelPolicy)}
                </Text>
              </Text>
              <Text
                style={{
                  fontSize: 11.5,
                  color: Colors.tintaLunak,
                  lineHeight: 17,
                  marginTop: 4,
                }}
              >
                {isOverBudget
                  ? '⚠ Estimasi melebihi plafon Travel Policy. SPPD otomatis ditandai OVER-BUDGET dan memerlukan Approval Level 2 + Verifikasi Keuangan.'
                  : '✓ Estimasi sesuai Travel Policy. Push Notification & Email akan dikirim otomatis ke Atasan saat diajukan.'}
              </Text>
            </View>

            <View style={[styles.field, { marginTop: 14 }]}>
              <Text style={styles.label}>Uang muka diminta (Rp)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={advanceRequested}
                onChangeText={setAdvanceRequested}
              />
              <Text style={styles.helpText}>
                Maksimal sebesar total estimasi ({formatRupiah(totalEstimasi)}).
                Isi 0 bila tidak meminta uang muka.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* LANGKAH 3: CATATAN & KIRIM */}
      {langkah === 3 && (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <View>
              <Text style={styles.panelTitle}>3. Catatan & Kirim</Text>
              <Text style={styles.panelSub}>
                Periksa kembali ringkasan pengajuan Anda sebelum dikirim
              </Text>
            </View>
          </View>

          <View style={styles.panelBody}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Catatan untuk supervisor / keuangan
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Catatan tambahan bila ada (opsional)"
                placeholderTextColor={Colors.tintaRedup}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </View>
        </View>
      )}

      {/* Navigasi Langkah / Tombol Simpan */}
      <View style={styles.stepFooter}>
        <View>
          {langkah > 1 && (
            <TouchableOpacity
              style={styles.btnSekunder}
              onPress={() => setLangkah((langkah - 1) as 1 | 2)}
              disabled={submitting}
            >
              <Text style={styles.btnSekunderText}>← Sebelumnya</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.stepFooterRight}>
          <TouchableOpacity
            style={styles.btnSekunder}
            onPress={() => handleSubmit(false)}
            disabled={submitting}
          >
            <Text style={styles.btnSekunderText}>
              {submitting ? 'Menyimpan…' : 'Simpan Draf'}
            </Text>
          </TouchableOpacity>

          {langkah < 3 ? (
            <TouchableOpacity
              style={styles.btnUtama}
              onPress={lanjutLangkah}
              disabled={submitting}
            >
              <Text style={styles.btnUtamaText}>Berikutnya →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.btnUtama}
              onPress={() => handleSubmit(true)}
              disabled={submitting}
            >
              <Text style={styles.btnUtamaText}>
                {submitting ? 'Mengirim…' : 'Simpan & Ajukan'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Panel Ringkasan Pengajuan (Selaras .panel Ringkasan di SubmissionPage.tsx) */}
      <View style={[styles.panel, { marginTop: 26 }]}>
        <View style={styles.panelHead}>
          <View>
            <Text style={styles.panelTitle}>Ringkasan</Text>
            <Text style={styles.panelSub}>Tinjauan cepat pengajuan Anda</Text>
          </View>
        </View>
        <View style={styles.panelBody}>
          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Tujuan</Text>
            <Text style={styles.pasanganDd}>
              {destination || '—'} ({LABEL_JENIS_PERJALANAN[tripType]})
            </Text>
          </View>
          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Tanggal</Text>
            <Text style={styles.pasanganDd}>
              {rentangTanggal(departureDate, returnDate)}
              {durasiHari > 0 ? ` · ${durasiHari} hari` : ''}
            </Text>
          </View>
          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Transportasi</Text>
            <Text style={styles.pasanganDd}>
              {LABEL_TRANSPORTASI[transportation]}
            </Text>
          </View>
          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Total estimasi</Text>
            <Text style={[styles.pasanganDd, styles.tabular]}>
              {formatRupiah(totalEstimasi)}
            </Text>
          </View>
          <View style={styles.pasanganRow}>
            <Text style={styles.pasanganDt}>Uang muka</Text>
            <Text style={[styles.pasanganDd, styles.tabular]}>
              {formatRupiah(Number(advanceRequested) || 0)}
            </Text>
          </View>
          {options?.approver && (
            <View style={styles.pasanganRow}>
              <Text style={styles.pasanganDt}>Penyetuju awal</Text>
              <Text style={styles.pasanganDd}>
                {options.approver.name}
                {options.approver.position
                  ? ` · ${options.approver.position}`
                  : ''}
              </Text>
            </View>
          )}
          {options?.department && (
            <View style={[styles.pasanganRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.pasanganDt}>Departemen</Text>
              <Text style={styles.pasanganDd}>
                {options.department.name} · Anggaran{' '}
                {formatRupiah(options.department.budget)}
              </Text>
            </View>
          )}
        </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.latar,
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13.5,
    color: Colors.tintaLembut,
  },
  pageTitle: {
    marginBottom: 14,
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
    marginTop: 10,
  },
  langkahWizard: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  langkahItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: Colors.latarSorot,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderTopWidth: 3,
    borderTopColor: Colors.garis,
  },
  langkahItemAktif: {
    borderTopColor: Colors.ketiga,
  },
  langkahItemSelesai: {
    borderTopColor: Colors.tinta,
  },
  langkahNomor: {
    width: 22,
    height: 22,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langkahNomorAktif: {
    backgroundColor: Colors.tinta,
  },
  langkahNomorText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.tinta,
  },
  langkahNomorTextAktif: {
    color: Colors.utama,
  },
  langkahJudul: {
    fontSize: 12,
    color: Colors.tintaLembut,
    flex: 1,
  },
  langkahJudulAktif: {
    color: Colors.tinta,
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
    fontSize: 15.5,
    fontWeight: '700',
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
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.tinta,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.tintaLembut,
    marginBottom: 4,
  },
  input: {
    width: '100%',
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: Colors.tinta,
    backgroundColor: Colors.utama,
    borderWidth: 1.5,
    borderColor: Colors.garisTegas,
    borderRadius: Radii.md,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 12,
    color: Colors.tintaLembut,
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.garisTegas,
    backgroundColor: Colors.utama,
    alignItems: 'center',
  },
  pillOptionActive: {
    backgroundColor: Colors.tinta,
    borderColor: Colors.tinta,
  },
  pillOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.tinta,
  },
  pillOptionTextActive: {
    color: Colors.utama,
  },
  transportWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  transportChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.garisTegas,
    backgroundColor: Colors.utama,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  costItemBox: {
    padding: 12,
    backgroundColor: Colors.utama,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderRadius: Radii.md,
    marginBottom: 10,
  },
  costItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costItemIndex: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  removeCostText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.tinta,
    textDecorationLine: 'underline',
  },
  catChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    borderColor: Colors.garisTegas,
  },
  catChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.tinta,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  subtotalLabel: {
    fontSize: 12,
    color: Colors.tintaLembut,
  },
  subtotalVal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
    fontVariant: ['tabular-nums'],
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1.5,
    borderTopColor: Colors.tinta,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
  },
  totalBarLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.tinta,
  },
  totalBarVal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.tinta,
    fontVariant: ['tabular-nums'],
  },
  stepFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.garisTegas,
  },
  stepFooterRight: {
    flexDirection: 'row',
    gap: 8,
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
  pasanganRow: {
    paddingVertical: 9,
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
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});

