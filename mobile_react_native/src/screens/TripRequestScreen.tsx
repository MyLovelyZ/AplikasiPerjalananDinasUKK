import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { apiCreateSppd } from '../api/client';

interface TripRequestScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const TripRequestScreen: React.FC<TripRequestScreenProps> = ({ onBack, onSuccess }) => {
  const [tujuan, setTujuan] = useState('');
  const [tanggalBerangkat, setTanggalBerangkat] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [tanggalKembali, setTanggalKembali] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [keperluan, setKeperluan] = useState('');
  const [agenda, setAgenda] = useState('');
  const [transportasi, setTransportasi] = useState('Pesawat');
  const [biayaTransport, setBiayaTransport] = useState('1500000');
  const [biayaHotel, setBiayaHotel] = useState('800000');
  const [uangSaku, setUangSaku] = useState('500000');
  const [uangMuka, setUangMuka] = useState('1500000');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);

  const totalEstimasi =
    (Number(biayaTransport) || 0) +
    (Number(biayaHotel) || 0) +
    (Number(uangSaku) || 0);

  const handleSubmit = async () => {
    if (!tujuan.trim() || !keperluan.trim()) {
      Alert.alert('Perhatian', 'Mohon lengkapi tujuan dan keperluan perjalanan dinas.');
      return;
    }

    setLoading(true);
    try {
      await apiCreateSppd({
        keperluan,
        agenda,
        tujuan_lainnya: tujuan,
        tanggal_berangkat: tanggalBerangkat,
        tanggal_kembali: tanggalKembali,
        moda_transportasi: transportasi,
        uang_muka_diminta: Number(uangMuka) || 0,
        catatan_pemohon: catatan,
        rincian_biaya: [
          {
            kategori_biaya_id: 1,
            deskripsi: `Tiket ${transportasi}`,
            kuantitas: 1,
            harga_satuan: Number(biayaTransport) || 0,
          },
          {
            kategori_biaya_id: 2,
            deskripsi: 'Akomodasi Hotel',
            kuantitas: 1,
            harga_satuan: Number(biayaHotel) || 0,
          },
          {
            kategori_biaya_id: 3,
            deskripsi: 'Uang Saku & Harian',
            kuantitas: 1,
            harga_satuan: Number(uangSaku) || 0,
          },
        ],
      });

      Alert.alert('Sukses', 'Pengajuan SPPD berhasil dikirim ke atasan untuk disetujui.', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err: any) {
      Alert.alert('Gagal Mengajukan', err.message || 'Terjadi kesalahan saat mengajukan SPPD.');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Formulir Pengajuan SPPD</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Destination & Purpose */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Rincian Perjalanan</Text>

          <Text style={styles.label}>Kota Tujuan :</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Denpasar (Bali), Surabaya"
            value={tujuan}
            onChangeText={setTujuan}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Tgl Berangkat :</Text>
              <TextInput
                style={styles.input}
                value={tanggalBerangkat}
                onChangeText={setTanggalBerangkat}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.label}>Tgl Kembali :</Text>
              <TextInput
                style={styles.input}
                value={tanggalKembali}
                onChangeText={setTanggalKembali}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <Text style={styles.label}>Keperluan Dinas :</Text>
          <TextInput
            style={styles.input}
            placeholder="Maksud / alasan perjalanan dinas"
            value={keperluan}
            onChangeText={setKeperluan}
          />

          <Text style={styles.label}>Agenda Kegiatan (Opsional) :</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Rincian jadwal & aktivitas"
            multiline
            value={agenda}
            onChangeText={setAgenda}
          />

          <Text style={styles.label}>Moda Transportasi :</Text>
          <View style={styles.transportRow}>
            {['Pesawat', 'Kereta', 'Mobil Dinas', 'Lainnya'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.transportChip,
                  transportasi === item && styles.transportChipActive,
                ]}
                onPress={() => setTransportasi(item)}
              >
                <Text
                  style={[
                    styles.transportChipText,
                    transportasi === item && styles.transportChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cost Estimates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Estimasi Biaya & Uang Muka</Text>

          <Text style={styles.label}>Estimasi Tiket Transport (Rp) :</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={biayaTransport}
            onChangeText={setBiayaTransport}
          />

          <Text style={styles.label}>Estimasi Hotel / Penginapan (Rp) :</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={biayaHotel}
            onChangeText={setBiayaHotel}
          />

          <Text style={styles.label}>Uang Saku & Harian (Rp) :</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={uangSaku}
            onChangeText={setUangSaku}
          />

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Estimasi Biaya:</Text>
            <Text style={styles.totalValue}>{formatRupiah(totalEstimasi)}</Text>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Permohonan Uang Muka (Rp) :</Text>
          <TextInput
            style={[styles.input, { borderColor: Colors.secondary }]}
            keyboardType="numeric"
            value={uangMuka}
            onChangeText={setUangMuka}
          />

          <Text style={styles.label}>Catatan Tambahan :</Text>
          <TextInput
            style={styles.input}
            placeholder="Catatan untuk atasan / keuangan"
            value={catatan}
            onChangeText={setCatatan}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Kirim Pengajuan SPPD ➔</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  transportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  transportChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transportChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  transportChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  transportChipTextActive: {
    color: '#FFFFFF',
  },
  totalBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.secondary,
  },
  submitBtn: {
    backgroundColor: Colors.secondary, // #DE8B0E from Figma
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
