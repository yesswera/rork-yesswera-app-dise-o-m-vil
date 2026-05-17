// ============================================================================
// MAPA DE NEGOCIOS — Vista interactiva con markers por coordenadas
// Lee de Supabase (datos auto-sincronizados desde Tonalli via webhooks)
// ============================================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker } from 'react-native-maps';
import { DS } from '@/constants/design';
import { fetchBusinessesForMap, MapBusiness } from '@/services/tonalli-businesses';

const { width: SW } = Dimensions.get('window');

// Tomatlan, Jalisco center
const TOMATLAN_REGION = {
  latitude: 19.9425,
  longitude: -105.3715,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    taqueria: '\uD83C\uDF2E',
    tacos: '\uD83C\uDF2E',
    mariscos: '\uD83E\uDD90',
    pollos: '\uD83C\uDF57',
    pizza: '\uD83C\uDF55',
    hamburguesas: '\uD83C\uDF54',
    bar: '\uD83C\uDF7A',
    cafeteria: '\u2615',
    restaurante: '\uD83C\uDF72',
    comida: '\uD83C\uDF72',
  };
  return map[cat?.toLowerCase()] || '\uD83C\uDF7D\uFE0F';
}

function markerColor(cat: string, isOpen: boolean): string {
  if (!isOpen) return '#9CA3AF';
  const map: Record<string, string> = {
    taqueria: '#EA580C',
    tacos: '#EA580C',
    mariscos: '#0EA5E9',
    pollos: '#F59E0B',
    pizza: '#EF4444',
    hamburguesas: '#8B5CF6',
    bar: '#7C3AED',
    cafeteria: '#78716C',
    restaurante: '#16A34A',
  };
  return map[cat?.toLowerCase()] || DS.colors.green;
}

export default function BusinessMapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [businesses, setBusinesses] = useState<MapBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBiz, setSelectedBiz] = useState<MapBusiness | null>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    const data = await fetchBusinessesForMap();
    setBusinesses(data);
    setLoading(false);

    // Auto-fit map to show all markers
    if (data.length > 0 && mapRef.current) {
      setTimeout(() => {
        const coords = data.map((b) => ({ latitude: b.latitude, longitude: b.longitude }));
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
          animated: true,
        });
      }, 500);
    }
  };

  const handleMarkerPress = useCallback((biz: MapBusiness) => {
    setSelectedBiz(biz);
    cardAnim.setValue(0);
    Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
    mapRef.current?.animateToRegion({
      latitude: biz.latitude - 0.002,
      longitude: biz.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 400);
  }, []);

  const handleCardPress = () => {
    if (!selectedBiz) return;
    router.push(`/food/menu/${selectedBiz.id}` as any);
  };

  const handleCenterMap = () => {
    if (businesses.length > 0) {
      const coords = businesses.map((b) => ({ latitude: b.latitude, longitude: b.longitude }));
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
        animated: true,
      });
    } else {
      mapRef.current?.animateToRegion(TOMATLAN_REGION, 500);
    }
  };

  const openCount = businesses.filter((b) => b.isOpen).length;

  return (
    <View style={s.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={DS.colors.dark} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Negocios en Tomatlan</Text>
          <Text style={s.headerSub}>{openCount} abiertos de {businesses.length}</Text>
        </View>
        <TouchableOpacity style={s.listBtn} onPress={() => router.push('/food/restaurants' as any)}>
          <Feather name="list" size={20} color={DS.colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={DS.colors.orange} />
          <Text style={s.loadingText}>Cargando mapa...</Text>
        </View>
      ) : businesses.length === 0 ? (
        <View style={s.loadingWrap}>
          <Text style={{ fontSize: 48 }}>{'\uD83D\uDDFA\uFE0F'}</Text>
          <Text style={s.emptyTitle}>Sin negocios aun</Text>
          <Text style={s.emptyText}>Los negocios de Tonalli apareceran aqui automaticamente</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={s.map}
          initialRegion={TOMATLAN_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          mapType="standard"
        >
          {businesses.map((biz) => (
            <Marker
              key={biz.id}
              coordinate={{ latitude: biz.latitude, longitude: biz.longitude }}
              onPress={() => handleMarkerPress(biz)}
            >
              <View style={[s.marker, !biz.isOpen && s.markerClosed]}>
                <View style={[s.markerDot, { backgroundColor: markerColor(biz.category, biz.isOpen) }]}>
                  <Text style={s.markerEmoji}>{categoryEmoji(biz.category)}</Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Center/fit all button */}
      {businesses.length > 0 && (
        <TouchableOpacity style={s.centerBtn} onPress={handleCenterMap} activeOpacity={0.8}>
          <Feather name="maximize" size={20} color={DS.colors.dark} />
        </TouchableOpacity>
      )}

      {/* Legend */}
      {businesses.length > 0 && (
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: DS.colors.green }]} />
            <Text style={s.legendText}>Abierto</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#9CA3AF' }]} />
            <Text style={s.legendText}>Cerrado</Text>
          </View>
        </View>
      )}

      {/* Selected Business Card */}
      {selectedBiz && (
        <Animated.View
          style={[
            s.bizCard,
            {
              transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [150, 0] }) }],
              opacity: cardAnim,
            },
          ]}
        >
          <TouchableOpacity style={s.bizCardInner} activeOpacity={0.9} onPress={handleCardPress}>
            {selectedBiz.coverUrl || selectedBiz.logoUrl ? (
              <Image source={{ uri: (selectedBiz.coverUrl || selectedBiz.logoUrl)! }} style={s.bizCardImg} />
            ) : (
              <View style={[s.bizCardImg, s.bizCardImgFallback]}>
                <Text style={{ fontSize: 28 }}>{categoryEmoji(selectedBiz.category)}</Text>
              </View>
            )}

            <View style={s.bizCardInfo}>
              <View style={s.bizCardRow1}>
                <Text style={s.bizCardName} numberOfLines={1}>{selectedBiz.name}</Text>
                {selectedBiz.isOpen ? (
                  <View style={s.openBadge}><Text style={s.openBadgeText}>Abierto</Text></View>
                ) : (
                  <View style={s.closedBadge}><Text style={s.closedBadgeText}>Cerrado</Text></View>
                )}
              </View>

              <Text style={s.bizCardAddress} numberOfLines={1}>{selectedBiz.address}</Text>

              <View style={s.bizCardMeta}>
                {selectedBiz.rating > 0 && (
                  <>
                    <Feather name="star" size={12} color="#F59E0B" />
                    <Text style={s.bizCardRating}>{selectedBiz.rating.toFixed(1)}</Text>
                    <Text style={s.bizCardDot}> · </Text>
                  </>
                )}
                <Feather name="clock" size={12} color={DS.colors.orange} />
                <Text style={s.bizCardTime}>{selectedBiz.deliveryTimeMin} min</Text>
                <Text style={s.bizCardDot}> · </Text>
                <Text style={s.bizCardCat}>{selectedBiz.category}</Text>
              </View>
            </View>

            <View style={s.bizCardArrow}>
              <Feather name="chevron-right" size={20} color={DS.colors.orange} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.closeCard} onPress={() => setSelectedBiz(null)}>
            <Feather name="x" size={16} color={DS.colors.muted} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: DS.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.hairline,
    zIndex: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: DS.colors.dark },
  headerSub: { fontSize: 12, color: DS.colors.muted, marginTop: 1 },
  listBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  map: { flex: 1 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  loadingText: { fontSize: 14, color: DS.colors.muted },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: DS.colors.dark },
  emptyText: { fontSize: 14, color: DS.colors.muted, textAlign: 'center' },

  // Custom marker
  marker: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40 },
  markerClosed: { opacity: 0.45 },
  markerDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  markerEmoji: { fontSize: 16 },

  // Center button
  centerBtn: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 120 : 108,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  // Legend
  legend: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'ios' ? 120 : 108,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: DS.colors.muted },

  // Business card (bottom)
  bizCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: DS.colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  bizCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  bizCardImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: DS.colors.divider,
  },
  bizCardImgFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
  },
  bizCardInfo: { flex: 1 },
  bizCardRow1: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bizCardName: { fontSize: 16, fontWeight: '700', color: DS.colors.dark, flex: 1 },
  openBadge: { backgroundColor: DS.colors.greenLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  openBadgeText: { fontSize: 10, fontWeight: '600', color: DS.colors.green },
  closedBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  closedBadgeText: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  bizCardAddress: { fontSize: 12, color: DS.colors.muted, marginTop: 3 },
  bizCardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 3 },
  bizCardRating: { fontSize: 12, fontWeight: '600', color: DS.colors.body },
  bizCardDot: { fontSize: 12, color: DS.colors.muted },
  bizCardTime: { fontSize: 12, color: DS.colors.body },
  bizCardCat: { fontSize: 12, color: DS.colors.muted, textTransform: 'capitalize' },
  bizCardArrow: { justifyContent: 'center' },
  closeCard: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DS.colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
