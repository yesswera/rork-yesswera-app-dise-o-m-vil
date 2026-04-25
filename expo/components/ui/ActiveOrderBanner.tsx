import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { ChevronRight, Truck } from 'lucide-react-native';
import { DS } from '@/constants/design';

interface ActiveOrderBannerProps {
  status: string;
  eta?: string;
  onPress: () => void;
}

export default function ActiveOrderBanner({ status, eta, onPress }: ActiveOrderBannerProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.banner}>
      <View style={styles.iconWrap}>
        <Truck size={22} color="#FFFFFF" />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{status}</Text>
        {eta && <Text style={styles.subtitle}>Llega en {eta}</Text>}
      </View>
      <ChevronRight size={20} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.green,
    borderRadius: DS.radius.xl,
    padding: DS.space.lg,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    ...DS.fonts.bodyMed,
    color: '#FFFFFF',
  },
  subtitle: {
    ...DS.fonts.small,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
