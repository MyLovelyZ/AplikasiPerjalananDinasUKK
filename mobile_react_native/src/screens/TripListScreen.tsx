import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../theme/colors';
import { apiListSppd } from '../api/client';

interface TripListScreenProps {
  user?: any;
  onBack: () => void;
  onSelectTrip: (tripId: number) => void;
}

export const TripListScreen: React.FC<TripListScreenProps> = ({ user, onBack, onSelectTrip }) => {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const loadTrips = async () => {
    try {
      const res = await apiListSppd(search);
      setTrips(res?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [search]);

  const role: string = user?.role ?? 'employee';
  const headerTitle =
    role === 'supervisor'
      ? 'Antrean Persetujuan Tim'
      : role === 'finance'
      ? 'Pencairan Dana & LPJ'
      : role === 'super_admin'
      ? 'Monitoring Seluruh SPPD'
      : 'Riwayat Perjalanan Saya';

  const filterTabs =
    role === 'supervisor'
      ? [
          { label: 'Semua', value: 'ALL' },
          { label: 'Menunggu Persetujuan', value: 'MENUNGGU_PERSETUJUAN' },
          { label: 'Disetujui', value: 'DISETUJUI' },
        ]
      : role === 'finance'
      ? [
          { label: 'Semua', value: 'ALL' },
          { label: 'Siap Dicairkan', value: 'DISETUJUI' },
          { label: 'Dalam Perjalanan', value: 'DIPROSES' },
          { label: 'Selesai', value: 'SELESAI' },
        ]
      : [
          { label: 'Semua', value: 'ALL' },
          { label: 'Menunggu', value: 'MENUNGGU_PERSETUJUAN' },
          { label: 'Disetujui', value: 'DISETUJUI' },
          { label: 'Selesai', value: 'SELESAI' },
        ];

  const filteredTrips = trips.filter((t) => {
    if (selectedStatus === 'ALL') return true;
    return t.status === selectedStatus;
  });

  const formatRupiah = (val: number | string) => {
    const num = Number(val) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISETUJUI':
      case 'SELESAI':
        return Colors.success;
      case 'MENUNGGU_PERSETUJUAN':
      case 'DRAFT':
        return Colors.warning;
      case 'DITOLAK':
      case 'DIBATALKAN':
        return Colors.danger;
      default:
        return Colors.info;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari berdasarkan tujuan atau nomor SPPD..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[
                styles.filterChip,
                selectedStatus === tab.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus(tab.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === tab.value && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.secondary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadTrips();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Tidak ada riwayat perjalanan dinas.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelectTrip(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.tripNumber}>{item.nomor_sppd}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) + '15' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <Text style={styles.purpose}>{item.keperluan}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  📍 {item.lokasiTujuan?.nama_kota ?? item.tujuan_lainnya ?? 'Tujuan'}
                </Text>
                <Text style={styles.metaText}>
                  📅 {item.tanggal_berangkat} - {item.tanggal_kembali}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.footerLabel}>Pemohon:</Text>
                  <Text style={styles.footerVal}>{item.pemohon?.nama_lengkap ?? 'Pegawai'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.footerLabel}>Estimasi:</Text>
                  <Text style={styles.footerCost}>{formatRupiah(item.estimasi_biaya)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
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
  searchBox: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  purpose: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  footerLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  footerVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  footerCost: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});
