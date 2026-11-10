import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors, Radii, LightThemeColors } from './src/theme/colors';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TripRequestScreen } from './src/screens/TripRequestScreen';
import { TripListScreen } from './src/screens/TripListScreen';
import { TripDetailScreen } from './src/screens/TripDetailScreen';
import { ExpenseReportScreen } from './src/screens/ExpenseReportScreen';
import { NotificationScreen } from './src/screens/NotificationScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { Pengguna } from './src/api/types';
import { apiNotificationUnreadCount } from './src/api/client';
import { inisial } from './src/constants/labels';

const ANDROID_TOP_INSET =
  Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 28) : 0;

function AppContent() {
  const { theme, isDark, colors, toggleTheme, setTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 370;

  const [currentUser, setCurrentUser] = useState<Pengguna | null>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('Home');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [editTripId, setEditTripId] = useState<number | null>(null);
  const [tripFilterStatus, setTripFilterStatus] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!currentUser) return;
    try {
      const count = await apiNotificationUnreadCount();
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const handleLoginSuccess = (user: Pengguna) => {
    setCurrentUser(user);
    setCurrentScreen('Home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('Home');
    setSelectedTripId(null);
    setEditTripId(null);
    setUnreadCount(0);
  };

  const navigateTo = (screen: string, params?: any) => {
    if (params?.tripId) {
      setSelectedTripId(params.tripId);
    }
    if (params?.editTripId !== undefined) {
      setEditTripId(params.editTripId);
    }
    if (params?.status !== undefined) {
      setTripFilterStatus(params.status);
    }
    setCurrentScreen(screen);
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.latar }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'Home':
        return 'Beranda';
      case 'TripList':
        return 'Perjalanan Saya';
      case 'TripDetail':
        return 'Detail Perjalanan';
      case 'TripRequest':
        return editTripId ? 'Ubah Pengajuan' : 'Ajukan SPPD';
      case 'ExpenseReport':
        return 'Laporan Biaya (LPJ)';
      case 'Notifications':
        return 'Notifikasi';
      case 'Profile':
        return 'Profil Saya';
      default:
        return 'Travel Portal';
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Home':
        return (
          <HomeScreen
            user={currentUser}
            onNavigate={navigateTo}
            onLogout={handleLogout}
          />
        );
      case 'TripRequest':
        return (
          <TripRequestScreen
            editTripId={editTripId}
            onBack={() => {
              setEditTripId(null);
              setCurrentScreen(selectedTripId ? 'TripDetail' : 'Home');
            }}
            onSuccess={(newId) => {
              setEditTripId(null);
              if (newId) {
                setSelectedTripId(newId);
                setCurrentScreen('TripDetail');
              } else {
                setCurrentScreen('TripList');
              }
            }}
          />
        );
      case 'TripList':
        return (
          <TripListScreen
            initialStatus={tripFilterStatus}
            onBack={() => setCurrentScreen('Home')}
            onSelectTrip={(id) => {
              setSelectedTripId(id);
              setCurrentScreen('TripDetail');
            }}
            onNewTrip={() => {
              setEditTripId(null);
              setCurrentScreen('TripRequest');
            }}
          />
        );
      case 'TripDetail':
        return (
          <TripDetailScreen
            tripId={selectedTripId ?? 1}
            onBack={() => setCurrentScreen('TripList')}
            onEdit={(id) => {
              setEditTripId(id);
              setCurrentScreen('TripRequest');
            }}
            onOpenExpenses={(id) => {
              setSelectedTripId(id);
              setCurrentScreen('ExpenseReport');
            }}
            onRefreshList={refreshUnreadCount}
          />
        );
      case 'ExpenseReport':
        return (
          <ExpenseReportScreen
            tripId={selectedTripId ?? 1}
            onBack={() => setCurrentScreen('TripDetail')}
          />
        );
      case 'Notifications':
        return (
          <NotificationScreen
            onBack={() => setCurrentScreen('Home')}
            onOpenTrip={(id) => {
              setSelectedTripId(id);
              setCurrentScreen('TripDetail');
            }}
          />
        );
      case 'Profile':
        return (
          <ProfileScreen
            user={currentUser}
            onBack={() => setCurrentScreen('Home')}
            onLogout={handleLogout}
            onProfileUpdated={(updated) => setCurrentUser(updated)}
          />
        );
      default:
        return (
          <HomeScreen
            user={currentUser}
            onNavigate={navigateTo}
            onLogout={handleLogout}
          />
        );
    }
  };

  const isTabActive = (tabName: string) => {
    if (tabName === 'Home') return currentScreen === 'Home';
    if (tabName === 'TripList')
      return (
        currentScreen === 'TripList' ||
        currentScreen === 'TripDetail' ||
        currentScreen === 'ExpenseReport'
      );
    if (tabName === 'TripRequest') return currentScreen === 'TripRequest';
    if (tabName === 'Notifications') return currentScreen === 'Notifications';
    if (tabName === 'Profile') return currentScreen === 'Profile';
    return false;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.latar }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Top Header semula yang bersih & responsif */}
      <View
        style={[
          styles.topHeader,
          { backgroundColor: isDark ? '#101a27' : colors.latarSidebar },
        ]}
      >
        <TouchableOpacity
          style={styles.brandLeft}
          onPress={() => setCurrentScreen('Home')}
          activeOpacity={0.8}
        >
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>TP</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              {getScreenTitle()}
            </Text>
            <Text style={styles.brandSub} numberOfLines={1}>
              PT. Citra Mandiri · {currentUser.name}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.topRightActions}>
          {/* Tombol Pengalih Mode Gelap / Terang */}
          <TouchableOpacity
            style={[
              styles.themeToggleBtn,
              isDark && {
                borderColor: colors.ketiga,
                backgroundColor: 'rgba(224, 136, 6, 0.2)',
              },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityLabel={isDark ? 'Mode Terang' : 'Mode Gelap'}
          >
            <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifBellBtn}
            onPress={() => setCurrentScreen('Notifications')}
            activeOpacity={0.8}
          >
            <Text style={styles.notifBellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.userAvatarBtn}
            onPress={() => setCurrentScreen('Profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.userAvatarText}>
              {inisial(currentUser.name)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={[styles.body, { backgroundColor: colors.latar }]}>
        {renderScreen()}
      </View>

      {/* Responsive Curved Floating Bottom Navbar (Sesuai Gambar Referensi) */}
      <View
        style={[
          styles.bottomNavWrapper,
          isCompact && styles.bottomNavWrapperCompact,
        ]}
      >
        <View
          style={[
            styles.bottomNavSurface,
            { backgroundColor: isDark ? '#101a27' : colors.latarSidebar },
          ]}
        >
          <View style={styles.bottomNav}>
            {/* Tab 1: Beranda */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setCurrentScreen('Home')}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.navItemEmoji,
                  isTabActive('Home') && styles.navItemEmojiActive,
                ]}
              >
                🏠
              </Text>
              <Text
                style={[
                  styles.navItemLabel,
                  isTabActive('Home') && styles.navItemLabelActive,
                ]}
              >
                Beranda
              </Text>
              {isTabActive('Home') && <View style={styles.activeDot} />}
            </TouchableOpacity>

            {/* Tab 2: SPPD Saya */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                setTripFilterStatus('');
                setCurrentScreen('TripList');
              }}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.navItemEmoji,
                  isTabActive('TripList') && styles.navItemEmojiActive,
                ]}
              >
                📋
              </Text>
              <Text
                style={[
                  styles.navItemLabel,
                  isTabActive('TripList') && styles.navItemLabelActive,
                ]}
              >
                SPPD Saya
              </Text>
              {isTabActive('TripList') && <View style={styles.activeDot} />}
            </TouchableOpacity>

            {/* Tab 3 (Tengah): Tombol Aksi Bulat "Ajukan" */}
            <View style={styles.navCenterSlot}>
              <TouchableOpacity
                style={styles.floatingCenterTouch}
                onPress={() => {
                  setEditTripId(null);
                  setCurrentScreen('TripRequest');
                }}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.floatingCircleBtn,
                    isTabActive('TripRequest') && styles.floatingCircleBtnActive,
                  ]}
                >
                  <Text style={styles.floatingCircleIcon}>➕</Text>
                </View>
                <Text
                  style={[
                    styles.floatingCenterLabel,
                    isTabActive('TripRequest') && styles.floatingCenterLabelActive,
                  ]}
                >
                  Ajukan
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab 4: Notifikasi */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setCurrentScreen('Notifications')}
              activeOpacity={0.75}
            >
              <View style={styles.iconNotifWrap}>
                <Text
                  style={[
                    styles.navItemEmoji,
                    isTabActive('Notifications') && styles.navItemEmojiActive,
                  ]}
                >
                  🔔
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.navCountDot}>
                    <Text style={styles.navCountDotText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.navItemLabel,
                  isTabActive('Notifications') && styles.navItemLabelActive,
                ]}
              >
                Notifikasi
              </Text>
              {isTabActive('Notifications') && <View style={styles.activeDot} />}
            </TouchableOpacity>

            {/* Tab 5: Akun */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setCurrentScreen('Profile')}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.navItemEmoji,
                  isTabActive('Profile') && styles.navItemEmojiActive,
                ]}
              >
                👤
              </Text>
              <Text
                style={[
                  styles.navItemLabel,
                  isTabActive('Profile') && styles.navItemLabelActive,
                ]}
              >
                Akun
              </Text>
              {isTabActive('Profile') && <View style={styles.activeDot} />}
            </TouchableOpacity>
          </View>

          {/* Garis Pill Home Indicator Responsif di Bawah */}
          <View
            style={[
              styles.homeIndicatorBar,
              { width: Math.min(120, Math.round(screenWidth * 0.32)) },
            ]}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (Colors: typeof LightThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors.latar,
    },
  topHeader: {
    backgroundColor: Colors.latarSidebar,
    paddingTop: ANDROID_TOP_INSET + 10,
    paddingBottom: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.garisPutih,
    gap: 10,
  },
  brandLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    backgroundColor: Colors.ketiga,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    color: Colors.kedua,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandTitle: {
    color: Colors.utama,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  brandSub: {
    color: Colors.utamaRedup,
    fontSize: 11.5,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.putihTransparan,
    borderWidth: 1,
    borderColor: Colors.garisPutih,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleIcon: {
    fontSize: 15,
  },
  notifBellBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.putihTransparan,
    borderWidth: 1,
    borderColor: Colors.garisPutih,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBellIcon: {
    fontSize: 14,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.ketiga,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: Colors.kedua,
    fontSize: 9.5,
    fontWeight: '800',
  },
  userAvatarBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    backgroundColor: Colors.ketiga,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: Colors.kedua,
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    backgroundColor: Colors.latar,
  },
  bottomNavWrapper: {
    backgroundColor: Colors.latar,
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'android' ? 14 : 8,
  },
  bottomNavWrapperCompact: {
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  bottomNavSurface: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Colors.latarSidebar,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    elevation: 10,
    shadowColor: Colors.kedua,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: Colors.garis,
    position: 'relative',
  },
  bottomNav: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  navItemEmoji: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.65,
  },
  navItemEmojiActive: {
    opacity: 1,
  },
  navItemLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.tintaLembut,
  },
  navItemLabelActive: {
    color: Colors.ketiga,
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.ketiga,
    marginTop: 2,
  },
  navCenterSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingCenterTouch: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  floatingCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.ketiga,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.latar,
    elevation: 6,
    shadowColor: Colors.kedua,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  floatingCircleBtnActive: {
    borderColor: Colors.utama,
    transform: [{ scale: 1.05 }],
  },
  floatingCircleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.kedua,
  },
  floatingCenterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.tintaLembut,
    marginTop: 3,
  },
  floatingCenterLabelActive: {
    color: Colors.ketiga,
    fontWeight: '800',
  },
  iconNotifWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIndicatorBar: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: Colors.utamaRedup,
    marginTop: 6,
  },
  navCountDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.kedua,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCountDotText: {
    color: Colors.utama,
    fontSize: 8.5,
    fontWeight: '800',
  },
  });

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
