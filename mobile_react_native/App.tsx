import React, { useState, useEffect, useCallback } from 'react';
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
import { Colors, Radii } from './src/theme/colors';
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

const NavTabIcon: React.FC<{
  type: 'home' | 'trips' | 'notif' | 'profile';
  active: boolean;
}> = ({ type, active }) => {
  const stroke = active ? Colors.ketiga : Colors.utamaRedup;

  const renderIcon = () => {
    if (type === 'home') {
      // Ikon Rumah (Atap segitiga + badan kotak) sesuai gambar referensi
      return (
        <View style={styles.glyphWrap}>
          <View
            style={{
              width: 13,
              height: 13,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderColor: stroke,
              transform: [{ rotate: '45deg' }],
              marginBottom: -7,
              borderTopLeftRadius: 2,
            }}
          />
          <View
            style={{
              width: 16,
              height: 12,
              borderWidth: 2,
              borderTopWidth: 0,
              borderColor: stroke,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
            }}
          />
        </View>
      );
    }

    if (type === 'trips') {
      // Ikon 2 titik bulat di atas + 2 pil vertikal di bawah sesuai gambar referensi
      return (
        <View style={styles.glyphWrap}>
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 3 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: stroke,
              }}
            />
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: stroke,
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <View
              style={{
                width: 6,
                height: 9,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
                borderBottomLeftRadius: 1.5,
                borderBottomRightRadius: 1.5,
                backgroundColor: stroke,
              }}
            />
            <View
              style={{
                width: 6,
                height: 9,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
                borderBottomLeftRadius: 1.5,
                borderBottomRightRadius: 1.5,
                backgroundColor: stroke,
              }}
            />
          </View>
        </View>
      );
    }

    if (type === 'notif') {
      // Ikon Tetesan dengan tanda + di tengah sesuai gambar referensi
      return (
        <View style={styles.glyphWrap}>
          <View
            style={{
              width: 17,
              height: 19,
              borderWidth: 2,
              borderColor: stroke,
              borderTopLeftRadius: 9,
              borderTopRightRadius: 9,
              borderBottomLeftRadius: 9,
              borderBottomRightRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 7,
                height: 1.8,
                backgroundColor: stroke,
                borderRadius: 1,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 1.8,
                height: 7,
                backgroundColor: stroke,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );
    }

    // Ikon Profil (Kepala bulat + bahu lengkung) sesuai gambar referensi
    return (
      <View style={styles.glyphWrap}>
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: stroke,
            marginBottom: 2,
          }}
        />
        <View
          style={{
            width: 17,
            height: 7,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderWidth: 2,
            borderBottomWidth: 0,
            borderColor: stroke,
          }}
        />
      </View>
    );
  };

  return (
    <View style={styles.iconBox}>
      {renderIcon()}
      {active && <View style={styles.activeTabBar} />}
    </View>
  );
};

export default function App() {
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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" backgroundColor={Colors.kedua} translucent />
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={Colors.kedua} translucent />

      {/* Top Header semula yang bersih & responsif */}
      <View style={styles.topHeader}>
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

      {/* Main Content Area (#DFDFDF 60% Primary Surface) */}
      <View style={styles.body}>{renderScreen()}</View>

      {/* Responsive Curved Floating Bottom Navbar (Sesuai Gambar Referensi) */}
      <View
        style={[
          styles.bottomNavWrapper,
          isCompact && styles.bottomNavWrapperCompact,
        ]}
      >
        <View style={styles.bottomNavSurface}>
          {/* Lengkung Arch Halus di Tengah Dock */}
          <View style={styles.centerArchCradle} />

          <View style={styles.bottomNav}>
            {/* Tab 1: Beranda */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setCurrentScreen('Home')}
              activeOpacity={0.75}
            >
              <NavTabIcon type="home" active={isTabActive('Home')} />
            </TouchableOpacity>

            {/* Tab 2: Perjalanan (2 Dots + 2 Pills) */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                setTripFilterStatus('');
                setCurrentScreen('TripList');
              }}
              activeOpacity={0.75}
            >
              <NavTabIcon type="trips" active={isTabActive('TripList')} />
            </TouchableOpacity>

            {/* Tab 3 (Tengah): Tombol Floating Unik (Hexagon/Diamond +) */}
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
                    styles.floatingDiamondShape,
                    isTabActive('TripRequest') &&
                      styles.floatingDiamondShapeActive,
                  ]}
                />
                <View style={styles.plusCrossWrap}>
                  <View style={styles.plusHorizontal} />
                  <View style={styles.plusVertical} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Tab 4: Notifikasi */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setCurrentScreen('Notifications')}
              activeOpacity={0.75}
            >
              <View style={{ position: 'relative' }}>
                <NavTabIcon
                  type="notif"
                  active={isTabActive('Notifications')}
                />
                {unreadCount > 0 && (
                  <View style={styles.navCountDot}>
                    <Text style={styles.navCountDotText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Tab 5: Profil */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setCurrentScreen('Profile')}
              activeOpacity={0.75}
            >
              <NavTabIcon type="profile" active={isTabActive('Profile')} />
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

const styles = StyleSheet.create({
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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 6,
    paddingBottom: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    elevation: 10,
    shadowColor: Colors.kedua,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    position: 'relative',
  },
  centerArchCradle: {
    position: 'absolute',
    top: -10,
    width: 76,
    height: 26,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    backgroundColor: Colors.latarSidebar,
  },
  bottomNav: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 48,
  },
  navItem: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glyphWrap: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabBar: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.ketiga,
  },
  navCenterSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  floatingCenterTouch: {
    width: 56,
    height: 56,
    marginTop: -28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingDiamondShape: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.ketiga,
    transform: [{ rotate: '45deg' }],
    borderWidth: 3.5,
    borderColor: Colors.latar,
    elevation: 8,
    shadowColor: Colors.kedua,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingDiamondShapeActive: {
    borderColor: Colors.utama,
  },
  plusCrossWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusHorizontal: {
    width: 20,
    height: 2.5,
    backgroundColor: Colors.kedua,
    borderRadius: 2,
  },
  plusVertical: {
    position: 'absolute',
    width: 2.5,
    height: 20,
    backgroundColor: Colors.kedua,
    borderRadius: 2,
  },
  homeIndicatorBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.utamaRedup,
    marginTop: 6,
  },
  navCountDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: Colors.ketiga,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCountDotText: {
    color: Colors.kedua,
    fontSize: 8.5,
    fontWeight: '800',
  },
});
