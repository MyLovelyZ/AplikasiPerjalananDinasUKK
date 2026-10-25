import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Colors } from '../theme/colors';
import { apiDetailSppd, apiApproveTrip, apiRejectTrip } from '../api/client';

interface TripDetailScreenProps {
  tripId: number;
  user: any;
  onBack: () => void;
  onRefreshList?: () => void;
}

export const TripDetailScreen: React.FC<TripDetailScreenProps> = ({
  tripId,
  user,
  onBack,
  onRefreshList,
}) => {
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [approvalNote, setApprovalNote] = useState('');

  const loadDetail = async () => {
    try {
      const res = await apiDetailSppd(tripId);
      setTrip(res?.data ?? null);
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Tidak dapat memuat detail SPPD.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [tripId]);

  const handleDecision = async () => {
    setActionLoading(true);
    try {
      if (decision === 'approve') {
        await apiApproveTrip(tripId, approvalNote);
        Alert.alert('Sukses', 'Pengajuan SPPD berhasil disetujui.');
      } else {
        await apiRejectTrip(tripId, approvalNote || 'Ditolak');
        Alert.alert('Sukses', 'Pengajuan SPPD telah ditolak.');
      }
      setShowApprovalModal(false);
      loadDetail();
      onRefreshList?.();
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Gagal memproses persetujuan.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatRupiah = (val: number | string) => {
    const num = Number(val) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Pemisahan peran: Tombol persetujuan HANYA tampil untuk Supervisor & Super Admin
  const isSupervisorOrAdmin =
    user?.role === 'supervisor' || user?.role === 'super_admin';

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.secondary} size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Data SPPD tidak ditemukan.</Text>
        <TouchableOpacity style={styles.backBtnSolid} onPress={onBack}>
          <Text style={styles.backBtnSolidText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Perjalanan Dinas</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status & Header Card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.nomorSppd}>{trip.nomor_sppd}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{trip.status.replace(/_/g, ' ')}</Text>
            </View>
          </View>
          <Text style={styles.purpose}>{trip.keperluan}</Text>
          <Text style={styles.agendaText}>Agenda: {trip.agenda || '-'}</Text>
        </View>

        {/* Travel Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informasi Pelaksanaan</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pegawai :</Text>
            <Text style={styles.infoVal}>{trip.pemohon?.nama_lengkap ?? 'Pegawai'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Departemen :</Text>
            <Text style={styles.infoVal}>{trip.departemen?.nama ?? 'Umum'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kota Tujuan :</Text>
            <Text style={styles.infoVal}>
              {trip.lokasiTujuan?.nama_kota ?? trip.tujuan_lainnya ?? '-'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tanggal :</Text>
            <Text style={styles.infoVal}>
              {trip.tanggal_berangkat} s/d {trip.tanggal_kembali} ({trip.jumlah_hari} hari)
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Transportasi :</Text>
            <Text style={styles.infoVal}>{trip.moda_transportasi}</Text>
          </View>
        </View>

        {/* Financial Info & Advance */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Keuangan & Uang Muka</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estimasi Total :</Text>
            <Text style={[styles.infoVal, styles.boldSecondary]}>
              {formatRupiah(trip.estimasi_biaya)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Uang Muka Diminta :</Text>
            <Text style={styles.infoVal}>{formatRupiah(trip.uang_muka_diminta)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Uang Muka Disetujui :</Text>
            <Text style={[styles.infoVal, { color: Colors.success, fontWeight: '700' }]}>
              {formatRupiah(trip.uang_muka_disetujui)}
            </Text>
          </View>
        </View>

        {/* Approval Timeline (Multi-level Sesuai PDF) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Riwayat Persetujuan (Workflow)</Text>
          {(trip.persetujuan ?? []).length === 0 ? (
            <Text style={styles.emptyNote}>Belum ada riwayat persetujuan.</Text>
          ) : (
            (trip.persetujuan ?? []).map((appr: any, idx: number) => (
              <View key={appr.id || idx} style={styles.approvalItem}>
                <View style={styles.approvalDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.approvalStage}>
                    Tahap {appr.urutan}: {appr.tahap?.nama_tahap ?? 'Persetujuan'}
                  </Text>
                  <Text style={styles.approvalApprover}>
                    Penyetuju: {appr.penyetuju?.nama_lengkap ?? 'Atasan'}
                  </Text>
                  <Text style={styles.approvalStatus}>Status: {appr.status}</Text>
                  {appr.catatan && (
                    <Text style={styles.approvalNote}>Catatan: "{appr.catatan}"</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* LPJ & Real Cost Report Sesuai PDF */}
        {trip.laporan && (
          <View style={[styles.card, { borderColor: Colors.secondary, borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: Colors.secondary }]}>
              Laporan Pertanggungjawaban (LPJ) & Selisih
            </Text>
            <Text style={styles.lpjSummary}>{trip.laporan.ringkasan_kegiatan}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Realisasi :</Text>
              <Text style={styles.infoVal}>{formatRupiah(trip.laporan.total_realisasi)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Uang Muka Diterima :</Text>
              <Text style={styles.infoVal}>{formatRupiah(trip.laporan.total_uang_muka)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Selisih (Klaim/Refund) :</Text>
              <Text
                style={[
                  styles.infoVal,
                  {
                    color: Number(trip.laporan.selisih) >= 0 ? Colors.danger : Colors.success,
                    fontWeight: '700',
                  },
                ]}
              >
                {formatRupiah(Math.abs(Number(trip.laporan.selisih)))}
                {Number(trip.laporan.selisih) > 0 ? ' (Kurang Bayar / Reimburse)' : ' (Lebih Bayar)'}
              </Text>
            </View>
          </View>
        )}

        {/* Supervisor Action Buttons */}
        {isSupervisorOrAdmin && trip.status === 'MENUNGGU_PERSETUJUAN' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btnAction, styles.btnReject]}
              onPress={() => {
                setDecision('reject');
                setShowApprovalModal(true);
              }}
            >
              <Text style={styles.btnActionText}>Tolak SPPD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnAction, styles.btnApprove]}
              onPress={() => {
                setDecision('approve');
                setShowApprovalModal(true);
              }}
            >
              <Text style={styles.btnActionText}>Setujui SPPD ✓</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal Dialog for Decision */}
      {showApprovalModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {decision === 'approve' ? 'Konfirmasi Setujui SPPD' : 'Konfirmasi Tolak SPPD'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Berikan catatan keputusan untuk pemohon:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Catatan persetujuan / alasan penolakan"
              value={approvalNote}
              onChangeText={setApprovalNote}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowApprovalModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: decision === 'approve' ? Colors.success : Colors.danger },
                ]}
                onPress={handleDecision}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>
                    {decision === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nomorSppd: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  statusBadge: {
    backgroundColor: 'rgba(222, 139, 14, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
  },
  purpose: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  agendaText: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    maxWidth: '60%',
    textAlign: 'right',
  },
  boldSecondary: {
    fontWeight: '700',
    color: Colors.secondary,
  },
  approvalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  approvalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
    marginTop: 4,
    marginRight: 10,
  },
  approvalStage: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  approvalApprover: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  approvalStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 1,
  },
  approvalNote: {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  lpjSummary: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  btnAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  btnReject: {
    backgroundColor: Colors.danger,
  },
  btnApprove: {
    backgroundColor: Colors.success,
  },
  btnActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 18,
    padding: 20,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalCancelBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 14,
  },
  backBtnSolid: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  backBtnSolidText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
