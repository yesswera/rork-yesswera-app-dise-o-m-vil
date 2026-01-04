import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Star, Clock } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import Colors from '@/constants/colors';
import { mockBusinesses } from '@/mocks/businesses';

export default function RestaurantsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState<string>('');

  const filteredBusinesses = mockBusinesses.filter(
    (business) =>
      business.name.toLowerCase().includes(search.toLowerCase()) ||
      business.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar restaurantes..."
            placeholderTextColor={Colors.text.light}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {filteredBusinesses.map((business) => (
            <TouchableOpacity
              key={business.id}
              style={styles.businessCard}
              activeOpacity={0.8}
              onPress={() => router.push(`/food/menu/${business.id}` as any)}
            >
              <Image
                source={{ uri: business.image }}
                style={styles.businessImage}
                contentFit="cover"
              />
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{business.name}</Text>
                <Text style={styles.businessDescription} numberOfLines={1}>
                  {business.description}
                </Text>
                <View style={styles.businessMeta}>
                  <View style={styles.metaItem}>
                    <Star size={14} color={Colors.warning} fill={Colors.warning} />
                    <Text style={styles.metaText}>{business.rating}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Clock size={14} color={Colors.text.secondary} />
                    <Text style={styles.metaText}>{business.deliveryTime}</Text>
                  </View>
                </View>
                <View style={styles.tagsContainer}>
                  {business.tags.slice(0, 3).map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  searchInputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  businessCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  businessImage: {
    width: '100%' as const,
    height: 180,
    backgroundColor: Colors.background.tertiary,
  },
  businessInfo: {
    padding: 16,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  businessDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  businessMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border.light,
    marginHorizontal: 12,
  },
  metaText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  tagsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.background.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
});
