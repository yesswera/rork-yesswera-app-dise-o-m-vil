import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { DS, colorShadow } from '@/constants/design';
import * as Haptics from 'expo-haptics';

interface ServiceCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
}

export default function ServiceCard({ title, subtitle, icon, color, onPress }: ServiceCardProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.8}
      style={styles.card}
    >
      <View style={[styles.iconWrap, { backgroundColor: color }, colorShadow(color, 0.35)]}>
        {icon}
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color={color} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DS.space.lg,
    minHeight: DS.touch.card,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.xxl,
    ...DS.shadow.card,
  },
  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: DS.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: DS.space.lg,
  },
  text: {
    flex: 1,
  },
  title: {
    ...DS.fonts.section,
    color: DS.colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    ...DS.fonts.label,
    color: DS.colors.muted,
  },
});
