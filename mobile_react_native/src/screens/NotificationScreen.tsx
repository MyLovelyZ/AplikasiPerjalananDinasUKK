import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, Radii, LightThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  apiNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
} from '../api/client';
import { Notifikasi } from '../api/types';
import { sejak, teksNotifikasi } from '../constants/labels';

interface NotificationScreenProps {
  onBack: () => void;
  onOpenTrip?: (tripId: number) => void;
}

export const NotificationScreen: React.FC<NotificationScreenProps> = ({
  onOpenTrip,
}) => {
  const { theme, isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [notifications, setNotifications] = useState<Notifikasi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState<boolean>(false);

  const loadNotifications = useCallback(
    async (shouldRefresh = false) => {
      try {
        if (shouldRefresh) setRefreshing(true);
        else setLoading(true);

        const res = await apiNotifications({
          unread: filterUnreadOnly,
        });

        setNotifications(res.data ?? []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterUnreadOnly]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    loadNotifications(true);
  };

  const handlePressNotif = async (n: Notifikasi) => {
    if (!n.read_at) {
      try {
        await apiMarkNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === n.id
              ? { ...item, read_at: new Date().toISOString() }
              : item
          )
        );
      } catch {
        // ignore
      }
    }
    if (n.travel_request_id && onOpenTrip) {
      onOpenTrip(n.travel_request_id);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiMarkAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at ?? new Date().toISOString(),
        }))
      );
    } catch {
      // ignore
    }
  };

  const belumDibacaCount = notifications.filter((n) => !n.read_at).length;

  const renderItem = ({ item }: { item: Notifikasi }) => {
    const belumDibaca = !item.read_at;
    const { judul, pesan } = teksNotifikasi(item);

    return (
      <TouchableOpacity
        style={[styles.notifBaris, belumDibaca && styles.notifBarisBelum]}
        onPress={() => handlePressNotif(item)}
        activeOpacity={0.75}
      >
        <View
          style={[styles.notifTitik, !belumDibaca && styles.notifTitikSudah]}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.notifJudul}>{judul}</Text>
          <Text style={styles.notifPesan}>{pesan}</Text>
          <Text style={styles.notifWaktu}>
            {item.request_number ? `${item.request_number} · ` : ''}
            {sejak(item.created_at)}
          </Text>
        </View>
        {item.travel_request_id ? (
          <View style={styles.btnPolosKecil}>
            <Text style={styles.btnPolosKecilText}>Buka →</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* PageHeader (Selaras NotifikasiPage.tsx) */}
      <View style={styles.pageTitle}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowBar} />
          <Text style={styles.eyebrowText}>AKUN</Text>
        </View>
        <Text style={styles.h1}>Notifikasi</Text>
        <Text style={styles.pageDesc}>
          Pemberitahuan mengenai pengajuan, persetujuan, laporan biaya, dan
          pencairan dana.
        </Text>
        {belumDibacaCount > 0 && (
          <View style={styles.pageActions}>
            <TouchableOpacity
              style={styles.btnSekunder}
              onPress={handleMarkAllRead}
            >
              <Text style={styles.btnSekunderText}>Tandai semua dibaca</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tabs (.tab di NotifikasiPage.tsx) */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabItem, !filterUnreadOnly && styles.tabItemAktif]}
          onPress={() => setFilterUnreadOnly(false)}
        >
          <Text
            style={[
              styles.tabItemText,
              !filterUnreadOnly && styles.tabItemTextAktif,
            ]}
          >
            Semua
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, filterUnreadOnly && styles.tabItemAktif]}
          onPress={() => setFilterUnreadOnly(true)}
        >
          <Text
            style={[
              styles.tabItemText,
              filterUnreadOnly && styles.tabItemTextAktif,
            ]}
          >
            Belum dibaca
          </Text>
          {belumDibacaCount > 0 && (
            <View style={styles.tabHitungan}>
              <Text style={styles.tabHitunganText}>{belumDibacaCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.ketiga]}
            tintColor={Colors.ketiga}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="small" color={Colors.tinta} />
              <Text style={styles.loadingText}>Memuat notifikasi…</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                {filterUnreadOnly
                  ? 'Tidak ada notifikasi belum dibaca'
                  : 'Belum ada notifikasi'}
              </Text>
              <Text style={styles.emptySub}>
                Semua pembaruan penting terkait perjalanan dinas akan muncul di
                sini.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const getStyles = (Colors: typeof LightThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.latar,
    },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 32,
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
    fontSize: 13.5,
    marginTop: 4,
    lineHeight: 19,
  },
  pageActions: {
    flexDirection: 'row',
    marginTop: 12,
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
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
    marginBottom: 6,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemAktif: {
    borderBottomColor: Colors.ketiga,
  },
  tabItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.tintaLembut,
  },
  tabItemTextAktif: {
    color: Colors.tinta,
    fontWeight: '700',
  },
  tabHitungan: {
    backgroundColor: Colors.latarSorot,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: Radii.pill,
  },
  tabHitunganText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  notifBaris: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
  },
  notifBarisBelum: {
    backgroundColor: Colors.latarSorot,
    borderLeftWidth: 3,
    borderLeftColor: Colors.ketiga,
  },
  notifTitik: {
    width: 9,
    height: 9,
    borderRadius: Radii.pill,
    backgroundColor: Colors.ketiga,
    marginTop: 5,
  },
  notifTitikSudah: {
    backgroundColor: Colors.garis,
  },
  notifJudul: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.tinta,
  },
  notifPesan: {
    fontSize: 13,
    color: Colors.tintaLembut,
    marginTop: 2,
    lineHeight: 18,
  },
  notifWaktu: {
    fontSize: 11.5,
    color: Colors.tintaRedup,
    marginTop: 4,
  },
  btnPolosKecil: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  btnPolosKecilText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.tinta,
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.tintaLembut,
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
});

