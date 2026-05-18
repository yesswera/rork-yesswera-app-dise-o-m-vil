import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DS } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';
import YCard from '@/components/ui/YCard';
import { useAuth } from '@/contexts/auth';
import { createOrder } from '@/services/orders';
import { getDefaultAddress } from '@/services/addresses';
import MinorRecipientCard, { MinorRecipientData } from '@/components/MinorRecipientCard';

const STORES = ['Cualquiera', 'Super Aki', 'Bodega Aurrera', 'Mercado'] as const;

interface ListItem {
  id: string;
  text: string;
}

export default function ShoppingScreen() {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>(STORES[0]);
  const [loading, setLoading] = useState(false);
  const [minorData, setMinorData] = useState<MinorRecipientData>({ isMinor: false, name: '', age: '', relationship: '' });

  const addItem = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setItems(prev => [...prev, { id: Date.now().toString(), text: trimmed }]);
    setInputText('');
  }, [inputText]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesion para hacer un pedido.');
      return;
    }
    if (items.length === 0) return;

    setLoading(true);
    try {
      // Get user's default address
      const defaultAddr = await getDefaultAddress(user.id);
      if (!defaultAddr) {
        Alert.alert(
          'Sin direccion',
          'Agrega una direccion de entrega primero.',
          [{ text: 'Agregar', onPress: () => router.push('/addresses/add') }]
        );
        setLoading(false);
        return;
      }

      const itemsList = items.map((item, i) => ({
        productId: `shopping-item-${i}`,
        productName: item.text,
        quantity: 1,
        unitPrice: 0,
      }));

      const storeNote = selectedStore !== 'Cualquiera'
        ? `Tienda preferida: ${selectedStore}`
        : '';
      const listText = items.map(i => i.text).join(', ');
      const instructions = [storeNote, `Lista: ${listText}`].filter(Boolean).join(' | ');

      const order = await createOrder({
        clientId: user.id,
        businessId: null,
        serviceType: 'shopping',
        deliveryAddress: defaultAddr.address,
        deliveryInstructions: instructions,
        deliveryLocation: defaultAddr.latitude && defaultAddr.longitude
          ? { latitude: defaultAddr.latitude, longitude: defaultAddr.longitude }
          : undefined,
        items: itemsList,
        subtotal: 0,
        deliveryFee: 0,
        paymentMethod: 'cash',
        isMinorRecipient: minorData.isMinor || undefined,
        minorDetails: minorData.isMinor ? { name: minorData.name, age: minorData.age, relationship: minorData.relationship } : undefined,
      });

      router.replace(`/tracking/${order.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear el pedido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color={DS.colors.dark} />
            </TouchableOpacity>
            <Text style={styles.title}>Lista de Compras</Text>
          </View>

          <Text style={styles.subtitle}>
            Escribe lo que necesitas y nosotros lo compramos por ti.
          </Text>

          {/* Input row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. 2 kilos de tortillas..."
              placeholderTextColor={DS.colors.placeholder}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addBtn, !inputText.trim() && styles.addBtnDisabled]}
              onPress={addItem}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Store selector */}
          <YCard style={styles.storeCard}>
            <Text style={styles.storeLabel}>
              <Feather name="shopping-bag" size={16} color={DS.colors.muted} />
              {'  '}Tienda preferida
            </Text>
            <View style={styles.storeChips}>
              {STORES.map(store => (
                <TouchableOpacity
                  key={store}
                  style={[
                    styles.chip,
                    selectedStore === store && styles.chipActive,
                  ]}
                  onPress={() => setSelectedStore(store)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedStore === store && styles.chipTextActive,
                    ]}
                  >
                    {store}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </YCard>

          {/* Minor recipient */}
          <MinorRecipientCard value={minorData} onChange={setMinorData} />
          <View style={{ height: 12 }} />

          {/* Items list */}
          {items.length > 0 ? (
            <YCard style={styles.listCard}>
              {items.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    index < items.length - 1 && styles.itemBorder,
                  ]}
                >
                  <Feather name="check-circle" size={20} color={DS.colors.green} />
                  <Text style={styles.itemText} numberOfLines={2}>
                    {item.text}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Feather name="x" size={20} color={DS.colors.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </YCard>
          ) : (
            <View style={styles.empty}>
              <Feather name="shopping-cart" size={48} color={DS.colors.hairline} />
              <Text style={styles.emptyTitle}>Tu lista esta vacia</Text>
              <Text style={styles.emptySubtitle}>Agrega productos arriba</Text>
            </View>
          )}

          {/* Spacer for bottom button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Fixed bottom button */}
        <View style={styles.bottomBar}>
          <BigButton
            title="Enviar Lista"
            subtitle={items.length > 0 ? `${items.length} producto${items.length > 1 ? 's' : ''} - Calcular precio` : 'Calcular precio'}
            icon={<Feather name="send" size={20} color="#FFF" />}
            color={DS.colors.orange}
            onPress={handleSubmit}
            disabled={items.length === 0}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: DS.space.lg,
    paddingTop: DS.space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    marginBottom: DS.space.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.shadow.card,
  },
  title: {
    ...DS.fonts.title,
    color: DS.colors.dark,
  },
  subtitle: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    marginBottom: DS.space.xl,
  },
  inputRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
    marginBottom: DS.space.lg,
  },
  textInput: {
    flex: 1,
    height: 56,
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.lg,
    ...DS.fonts.body,
    color: DS.colors.dark,
    ...DS.shadow.card,
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.shadow.button,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  storeCard: {
    marginBottom: DS.space.lg,
  },
  storeLabel: {
    ...DS.fonts.label,
    color: DS.colors.muted,
    marginBottom: DS.space.md,
  },
  storeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.sm,
  },
  chip: {
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.divider,
  },
  chipActive: {
    backgroundColor: DS.colors.greenLight,
  },
  chipText: {
    ...DS.fonts.label,
    color: DS.colors.muted,
  },
  chipTextActive: {
    color: DS.colors.green,
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    minHeight: DS.touch.min,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.divider,
  },
  itemText: {
    flex: 1,
    ...DS.fonts.body,
    color: DS.colors.dark,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.space.xxxl * 2,
    gap: DS.space.sm,
  },
  emptyTitle: {
    ...DS.fonts.bodyMed,
    color: DS.colors.muted,
    marginTop: DS.space.md,
  },
  emptySubtitle: {
    ...DS.fonts.body,
    color: DS.colors.placeholder,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.xxl,
    paddingTop: DS.space.md,
    backgroundColor: DS.colors.bg,
    borderTopWidth: 1,
    borderTopColor: DS.colors.hairline,
  },
});
