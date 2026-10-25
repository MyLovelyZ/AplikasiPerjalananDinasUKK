import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from './src/theme/colors';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TripRequestScreen } from './src/screens/TripRequestScreen';
import { TripListScreen } from './src/screens/TripListScreen';
import { TripDetailScreen } from './src/screens/TripDetailScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentScreen, setCurrentScreen] = useState<string>('Home');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setCurrentScreen('Home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('Home');
    setSelectedTripId(null);
  };

  const navigateTo = (screen: string, params?: any) => {
    if (params?.tripId) {
      setSelectedTripId(params.tripId);
    }
    setCurrentScreen(screen);
  };

  const role: string = currentUser?.role ?? 'employee';
  const isEmployee = role === 'employee' || role === 'super_admin';
  const listLabel =
    role === 'supervisor' ? 'Persetujuan' : role === 'finance' ? 'Pencairan' : 'Riwayat';
  const listIcon = role === 'supervisor' ? '✅' : role === 'finance' ? '💰' : '📋';

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

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
        if (!isEmployee) {
          return (
            <HomeScreen user={currentUser} onNavigate={navigateTo} onLogout={handleLogout} />
          );
        }
        return (
          <TripRequestScreen
            onBack={() => setCurrentScreen('Home')}
            onSuccess={() => setCurrentScreen('TripList')}
          />
        );
      case 'TripList':
        return (
          <TripListScreen
            user={currentUser}
            onBack={() => setCurrentScreen('Home')}
            onSelectTrip={(id) => {
              setSelectedTripId(id);
              setCurrentScreen('TripDetail');
            }}
          />
        );
      case 'TripDetail':
        return (
          <TripDetailScreen
            tripId={selectedTripId ?? 1}
            user={currentUser}
            onBack={() => setCurrentScreen('TripList')}
            onRefreshList={() => {}}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.body}>{renderScreen()}</View>

      {/* Modern Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('Home')}
        >
          <Text
            style={[
              styles.navIcon,
              currentScreen === 'Home' && styles.navIconActive,
            ]}
          >
            🏠
          </Text>
          <Text
            style={[
              styles.navLabel,
              currentScreen === 'Home' && styles.navLabelActive,
            ]}
          >
            Beranda
          </Text>
        </TouchableOpacity>

        {isEmployee && (
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setCurrentScreen('TripRequest')}
          >
            <View style={styles.navIconAddBox}>
              <Text style={styles.navIconAddText}>+</Text>
            </View>
            <Text
              style={[
                styles.navLabel,
                currentScreen === 'TripRequest' && styles.navLabelActive,
              ]}
            >
              Ajukan
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentScreen('TripList')}
        >
          <Text
            style={[
              styles.navIcon,
              (currentScreen === 'TripList' || currentScreen === 'TripDetail') &&
                styles.navIconActive,
            ]}
          >
            {listIcon}
          </Text>
          <Text
            style={[
              styles.navLabel,
              (currentScreen === 'TripList' || currentScreen === 'TripDetail') &&
                styles.navLabelActive,
            ]}
          >
            {listLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <Text style={styles.navIcon}>🚪</Text>
          <Text style={styles.navLabel}>Keluar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  body: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  navLabelActive: {
    color: Colors.secondary,
    fontWeight: '700',
  },
  navIconAddBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIconAddText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});
