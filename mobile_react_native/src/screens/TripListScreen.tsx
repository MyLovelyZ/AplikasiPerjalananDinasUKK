import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Radii, LightThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { apiEmployeeRequests } from '../api/client';
import { Perjalanan, StatusPerjalanan } from '../api/types';
import {
  formatRupiah,
  rentangTanggal,
  RUPA_STATUS_PERJALANAN,
  STATUS_PERJALANAN_TERURUT,
} from '../constants/labels';

interface TripListScreenProps {
  onBack: () => void;
  onSelectTrip: (id: number) => void;
  onNewTrip: () => void;
  initialStatus?: string;
}

export const TripListScreen: React.FC<TripListScreenProps> = ({
  onSelectTrip,
  onNewTrip,
  initialStatus = '',
}) => {
  const { theme, isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [trips, setTrips] = useState<Perjalanan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const tahunSekarang = new Date().getFullYear();
  const pilihanTahun = [
    '',
    String(tahunSekarang),
    String(tahunSekarang - 1),
    String(tahunSekarang - 2),
  ];

  const filterChips: Array<{ key: string; label: string }> = [
    { key: '', label: 'Semua status' },
    ...STATUS_PERJALANAN_TERURUT.map((s: StatusPerjalanan) => ({
      key: s,
      label: RUPA_STATUS_PERJALANAN[s].label,
    })),
  ];

  const fetchTrips = useCallback(
    async (page = 1, shouldRefresh = false, customSearch?: string) => {
      try {
        setErrorMsg('');
        if (shouldRefresh) setRefreshing(true);
        else if (page === 1) setLoading(true);

        const q = (customSearch ?? search).trim();
        const res = await apiEmployeeRequests({
          search: q || undefined,
          status: selectedStatus || undefined,
          year: selectedYear ? Number(selectedYear) : undefined,
          page,
          per_page: 12,
        });

        const list = res.data ?? [];
        if (page === 1) {
          setTrips(list);
        } else {
          setTrips((prev) => [...prev, ...list]);
        }

        if (res.meta) {
          setCurrentPage(res.meta.current_page);
          setLastPage(res.meta.last_page);
          setTotalItems(res.meta.total);
        } else {
          setTotalItems(list.length);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Gagal memuat daftar perjalanan.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedStatus, selectedYear]
  );

  useEffect(() => {
    setSelectedStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    fetchTrips(1);
  }, [selectedStatus, selectedYear, fetchTrips]);

  const handleRefresh = () => {
    fetchTrips(1, true);
  };

  const renderTripRow = ({ item }: { item: Perjalanan }) => {
    const rupa =
      RUPA_STATUS_PERJALANAN[item.status] ?? RUPA_STATUS_PERJALANAN.draft;

    return (
      <TouchableOpacity
        style={styles.tableRow}
        onPress={() => onSelectTrip(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.rowHeader}>
          <View style={styles.reqBadge}>
            <Text style={styles.reqNumber}>{item.request_number}</Text>
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
            <View style={[styles.statusDot, { backgroundColor: rupa.dot }]} />
            <Text style={[styles.statusText, { color: rupa.badgeText }]}>
              {item.status_label || rupa.label}
            </Text>
          </View>
        </View>

        <View style={styles.rowDestWrap}>
          <Text style={styles.destIcon}>📍</Text>
          <Text style={styles.destination}>{item.destination}</Text>
        </View>
        <Text style={styles.purpose} numberOfLines={1}>
          {item.purpose}
        </Text>

        <View style={styles.rowFooter}>
          <View style={styles.dateBlock}>
            <View style={styles.dateRow}>
              <Text style={styles.dateIcon}>📅</Text>
              <Text style={styles.dateText}>
                {rentangTanggal(item.departure_date, item.return_date)}
              </Text>
            </View>
            <Text style={styles.durationBadge}>⏱️ {item.duration_days} hari</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.costAmount}>
              {formatRupiah(item.estimated_cost)}
            </Text>
            {item.advance_requested > 0 && (
              <Text style={styles.advanceSub}>
                UM {formatRupiah(item.advance_requested)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <View>
      {/* PageHeader (Selaras TripsPage.tsx) */}
      <View style={styles.pageTitle}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowBar} />
          <Text style={styles.eyebrowText}>PENGAJUAN</Text>
        </View>
        <Text style={styles.h1}>Perjalanan Saya</Text>
        <Text style={styles.pageDesc}>
          Daftar seluruh perjalanan dinas yang pernah Anda ajukan, dari draf
          sampai selesai.
        </Text>
        <View style={styles.pageActions}>
          <TouchableOpacity
            style={styles.btnUtama}
            onPress={onNewTrip}
            activeOpacity={0.85}
          >
            <Text style={styles.btnUtamaText}>+ Ajukan Perjalanan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Panel Head & Filter Bar (Selaras HalamanPerjalanan.tsx) */}
      <View style={styles.panelHead}>
        <View>
          <Text style={styles.panelTitle}>Daftar perjalanan</Text>
          <Text style={styles.panelSub}>{totalItems} perjalanan ditemukan</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nomor, tujuan, keperluan…"
            placeholderTextColor={Colors.tintaRedup}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchTrips(1)}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity
              style={styles.searchClearBtn}
              onPress={() => {
                setSearch('');
                fetchTrips(1, false, '');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {search || selectedStatus || selectedYear ? (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setSearch('');
              setSelectedStatus('');
              setSelectedYear('');
              fetchTrips(1, false, '');
            }}
          >
            <Text style={styles.resetBtnText}>Atur ulang</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Status Horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {filterChips.map((chip) => {
          const active = selectedStatus === chip.key;
          return (
            <TouchableOpacity
              key={chip.key || 'all'}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelectedStatus(chip.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filter Tahun */}
      <View style={styles.yearFilterRow}>
        {pilihanTahun.map((th) => {
          const active = selectedYear === th;
          return (
            <TouchableOpacity
              key={th || 'all-years'}
              style={[styles.yearChip, active && styles.yearChipActive]}
              onPress={() => setSelectedYear(th)}
            >
              <Text
                style={[
                  styles.yearChipText,
                  active && styles.yearChipTextActive,
                ]}
              >
                {th ? `Tahun ${th}` : 'Semua tahun'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {errorMsg ? (
        <View style={styles.kotakGalat}>
          <Text style={styles.kotakGalatText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.btnKecilOutline}
            onPress={() => fetchTrips(1)}
          >
            <Text style={styles.btnKecilOutlineText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTripRow}
        ListHeaderComponent={renderListHeader()}
        keyboardShouldPersistTaps="handled"
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
              <Text style={styles.loadingText}>Memuat data perjalanan…</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                Tidak ada perjalanan yang cocok
              </Text>
              <Text style={styles.emptySub}>
                {search || selectedStatus || selectedYear
                  ? 'Coba ubah kata kunci atau filter status di atas.'
                  : 'Mulai dengan mengajukan perjalanan dinas baru.'}
              </Text>
              <TouchableOpacity
                style={[styles.btnUtama, { marginTop: 14 }]}
                onPress={onNewTrip}
              >
                <Text style={styles.btnUtamaText}>+ Ajukan Perjalanan</Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={
          lastPage > 1 ? (
            <View style={styles.paginasi}>
              <Text style={styles.paginasiInfo}>
                Halaman {currentPage} dari {lastPage} · Total {totalItems} data
              </Text>
              <View style={styles.paginasiBtns}>
                <TouchableOpacity
                  style={[
                    styles.btnSekunderKecil,
                    currentPage <= 1 && styles.btnDisabled,
                  ]}
                  disabled={currentPage <= 1}
                  onPress={() => fetchTrips(currentPage - 1)}
                >
                  <Text style={styles.btnSekunderKecilText}>Sebelumnya</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.btnSekunderKecil,
                    currentPage >= lastPage && styles.btnDisabled,
                  ]}
                  disabled={currentPage >= lastPage}
                  onPress={() => fetchTrips(currentPage + 1)}
                >
                  <Text style={styles.btnSekunderKecilText}>Berikutnya</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : undefined
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
  panelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garisTegas,
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.tinta,
  },
  panelSub: {
    fontSize: 13,
    color: Colors.tintaLembut,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.latar,
    borderWidth: 1.5,
    borderColor: Colors.garisTegas,
    borderRadius: Radii.md,
    paddingHorizontal: 10,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13.5,
    color: Colors.tinta,
  },
  searchClearBtn: {
    padding: 4,
    borderRadius: Radii.pill,
  },
  searchClearText: {
    fontSize: 13,
    color: Colors.tintaLembut,
    fontWeight: '700',
  },
  resetBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.tinta,
  },
  resetBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.tinta,
  },
  chipsScroll: {
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.garisTegas,
    backgroundColor: Colors.latar,
  },
  chipActive: {
    backgroundColor: Colors.tinta,
    borderColor: Colors.tinta,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.tinta,
  },
  chipTextActive: {
    color: Colors.utama,
  },
  yearFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.garis,
  },
  yearChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.garis,
  },
  yearChipActive: {
    borderColor: Colors.tinta,
    backgroundColor: Colors.latarSorot,
  },
  yearChipText: {
    fontSize: 11.5,
    color: Colors.tintaLembut,
    fontWeight: '600',
  },
  yearChipTextActive: {
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
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  btnKecilOutlineText: {
    color: Colors.kedua,
    fontSize: 12,
    fontWeight: '700',
  },
  tableRow: {
    padding: 13,
    marginBottom: 10,
    backgroundColor: Colors.latarSorot,
    borderWidth: 1,
    borderColor: Colors.garis,
    borderRadius: Radii.lg,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reqBadge: {
    backgroundColor: Colors.utama,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.garis,
  },
  reqNumber: {
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
  rowDestWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  destIcon: {
    fontSize: 14,
  },
  destination: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.tinta,
  },
  purpose: {
    fontSize: 12.5,
    color: Colors.tintaLembut,
    marginTop: 2,
    paddingLeft: 20,
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingLeft: 20,
  },
  dateBlock: {
    gap: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateIcon: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
    color: Colors.tinta,
  },
  durationBadge: {
    fontSize: 11,
    color: Colors.tintaLembut,
    marginTop: 1,
  },
  costAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.tinta,
    fontVariant: ['tabular-nums'],
  },
  advanceSub: {
    fontSize: 11.5,
    color: Colors.tintaLembut,
    fontVariant: ['tabular-nums'],
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: Colors.tintaLembut,
    fontSize: 13,
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
  paginasi: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.garis,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  paginasiInfo: {
    fontSize: 12.5,
    color: Colors.tintaLembut,
  },
  paginasiBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  btnSekunderKecil: {
    borderWidth: 1.5,
    borderColor: Colors.tinta,
    borderRadius: Radii.md,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnSekunderKecilText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.tinta,
  },
  btnDisabled: {
    opacity: 0.45,
  },
});

