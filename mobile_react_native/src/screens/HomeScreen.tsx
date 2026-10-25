import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { apiDashboard, apiLogout } from '../api/client';

interface HomeScreenProps {
  user: any;
  onNavigate: (screen: string, params?: any) => void;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ user, onNavigate, onLogout }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const res = await apiDashboard();
      setDashboardData(res?.data ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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

  const kartu = dashboardData?.kartu ?? {
    menunggu: 0,
    disetujui: 0,
    diproses: 0,
    selesai: 0,
  };

  return (
    <View style={styles.container}>
      {/* Top Header Card */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Halo, Selamat Datang</Text>
          <Text style={styles.userName}>{user?.name ?? 'Pegawai'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user?.role_label ?? user?.role ?? 'Pegawai'} • {user?.department?.name ?? 'PT Citra Mandiri'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            apiLogout();
            onLogout();
          }}
        >
          <Text style={styles.logoutBtnText}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Action Button: Dinamis Sesuai Peran */}
        {user?.role === 'employee' ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onNavigate('TripRequest')}
            activeOpacity={0.88}
          >
            <View style={styles.actionBtnIcon}>
              <Text style={styles.actionBtnIconText}>+</Text>
            </View>
            <View>
              <Text style={styles.actionBtnTitle}>Ajukan SPPD Baru</Text>
              <Text style={styles.actionBtnSubtitle}>Formulir perjalanan dinas & estimasi biaya</Text>
            </View>
          </TouchableOpacity>
        ) : user?.role === 'supervisor' ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0284C7' }]}
            onPress={() => onNavigate('TripList')}
            activeOpacity={0.88}
          >
            <View style={[styles.actionBtnIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.actionBtnIconText}>✓</Text>
            </View>
            <View>
              <Text style={styles.actionBtnTitle}>Tinjau Persetujuan Tim</Text>
              <Text style={styles.actionBtnSubtitle}>Verifikasi & tindak lanjuti SPPD bawahan</Text>
            </View>
          </TouchableOpacity>
        ) : user?.role === 'finance' ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            onPress={() => onNavigate('TripList')}
            activeOpacity={0.88}
          >
            <View style={[styles.actionBtnIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.actionBtnIconText}>💳</Text>
            </View>
            <View>
              <Text style={styles.actionBtnTitle}>Pencairan & Verifikasi LPJ</Text>
              <Text style={styles.actionBtnSubtitle}>Kelola kasbon, reimbursement, & bukti LPJ</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#475569' }]}
            onPress={() => onNavigate('TripList')}
            activeOpacity={0.88}
          >
            <View style={[styles.actionBtnIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.actionBtnIconText}>📊</Text>
            </View>
            <View>
              <Text style={styles.actionBtnTitle}>Monitoring Seluruh SPPD</Text>
              <Text style={styles.actionBtnSubtitle}>Pantau seluruh pengajuan & aktivitas dinas</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Ringkasan Status SPPD</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: Colors.warning }]}>
            <Text style={styles.statCount}>{kartu.menunggu}</Text>
            <Text style={styles.statLabel}>Menunggu</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.success }]}>
            <Text style={styles.statCount}>{kartu.disetujui}</Text>
            <Text style={styles.statLabel}>Disetujui</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.info }]}>
            <Text style={styles.statCount}>{kartu.diproses}</Text>
            <Text style={styles.statLabel}>Berjalan</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: Colors.secondary }]}>
            <Text style={styles.statCount}>{kartu.selesai}</Text>
            <Text style={styles.statLabel}>Selesai</Text>
          </View>
        </View>

        {/* Recent Trips Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Perjalanan Terkini</Text>
          <TouchableOpacity onPress={() => onNavigate('TripList')}>
            <Text style={styles.seeAllText}>Lihat Semua →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.secondary} style={{ marginTop: 20 }} />
        ) : (
          (dashboardData?.perjalanan_terkini ?? []).slice(0, 5).map((trip: any) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              onPress={() => onNavigate('TripDetail', { tripId: trip.id })}
              activeOpacity={0.8}
            >
              <View style={styles.tripHeader}>
                <Text style={styles.tripNumber}>{trip.nomor_sppd}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(trip.status) + '15' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(trip.status) }]}>
                    {trip.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <Text style={styles.tripPurpose} numberOfLines={1}>
                {trip.keperluan}
              </Text>

              <View style={styles.tripMetaRow}>
                <Text style={styles.tripMetaText}>
                  📍 {trip.lokasiTujuan?.nama_kota ?? trip.tujuan_lainnya ?? 'Tujuan'}
                </Text>
                <Text style={styles.tripMetaText}>
                  📅 {trip.tanggal_berangkat}
                </Text>
              </View>

              <View style={styles.tripFooter}>
                <Text style={styles.tripCostLabel}>Estimasi Biaya:</Text>
                <Text style={styles.tripCostValue}>{formatRupiah(trip.estimasi_biaya)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  header: {
    backgroundColor: Colors.primary, // #0C2340
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  userName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(222, 139, 14, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  actionBtn: {
    backgroundColor: Colors.secondary, // #DE8B0E
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionBtnIconText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 26,
  },
  actionBtnTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statCount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tripHeader: {
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
  tripPurpose: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  tripMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tripMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tripCostLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  tripCostValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary,
  },
});
