// ============================================================================
// YESSWERA: YESSI IA - PANTALLA DE PEDIDO CONVERSACIONAL
// El usuario escribe lo que quiere en lenguaje natural y Yessi ayuda a ordenar
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DS, colorShadow } from '@/constants/design';
import { useCart } from '@/contexts/cart';
import { useAuth } from '@/contexts/auth';
import {
  parseOrderIntent,
  searchBusinesses,
  searchProducts,
  findBestBusiness,
  OrderIntent,
} from '@/services/yessi-ordering';
import type { Product } from '@/constants/types';

// ============================================================================
// TYPES
// ============================================================================

interface MatchedProduct {
  id: string;
  name: string;
  price: number;
  businessId: string;
  businessName: string;
  description: string;
  image: string;
  category: string;
}

type MessageType = 'user' | 'yessi' | 'results' | 'confirm';

interface ChatMessage {
  id: string;
  type: MessageType;
  text?: string;
  products?: MatchedProduct[];
  orderSummary?: {
    items: { name: string; price: number; quantity: number }[];
    total: number;
    businessName: string;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

let messageCounter = 0;
function nextId(): string {
  messageCounter += 1;
  return `msg_${Date.now()}_${messageCounter}`;
}

function formatPrice(amount: number): string {
  return `$${amount.toFixed(0)}`;
}

// ============================================================================
// SCREEN
// ============================================================================

export default function YessiScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addItem, items: cartItems, total: cartTotal, clearCart } = useCart();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [businesses, setBusinesses] = useState<{ id: string; name: string; category: string }[]>([]);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());

  // Load businesses on mount + welcome message
  useEffect(() => {
    searchBusinesses().then(setBusinesses).catch(() => setBusinesses([]));

    setMessages([
      {
        id: nextId(),
        type: 'yessi',
        text: 'Hola! Soy Yessi, tu asistente de Yesswera. Dime que quieres pedir, por ejemplo:\n\n"3 tacos al pastor de La Tiendita"\n"una pizza grande"\n"quiero unos esquites"',
      },
    ]);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isThinking) return;

    setInputText('');
    setIsThinking(true);

    // Add user message
    const userMsg: ChatMessage = { id: nextId(), type: 'user', text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Parse intent with Claude
      const intent: OrderIntent = await parseOrderIntent(text, businesses);

      // Add Yessi's text response
      const yessiMsg: ChatMessage = {
        id: nextId(),
        type: 'yessi',
        text: intent.message,
      };
      setMessages((prev) => [...prev, yessiMsg]);

      // If understood, try to find products
      if (intent.understood && intent.businessQuery && intent.items.length > 0) {
        const bestBiz = await findBestBusiness(intent.businessQuery, businesses);

        if (bestBiz) {
          const productNames = intent.items.map((i) => i.name);
          const matched = await searchProducts(bestBiz.id, productNames);

          if (matched.length > 0) {
            const resultsMsg: ChatMessage = {
              id: nextId(),
              type: 'results',
              products: matched,
              text: `Encontre ${matched.length} producto${matched.length > 1 ? 's' : ''} en ${bestBiz.name}:`,
            };
            setMessages((prev) => [...prev, resultsMsg]);
          } else {
            const noResultsMsg: ChatMessage = {
              id: nextId(),
              type: 'yessi',
              text: `No encontre esos productos en ${bestBiz.name}. Intenta con otro nombre o preguntame que tienen disponible.`,
            };
            setMessages((prev) => [...prev, noResultsMsg]);
          }
        } else {
          const noBizMsg: ChatMessage = {
            id: nextId(),
            type: 'yessi',
            text: 'No encontre un negocio con ese nombre. Dime el nombre exacto o que tipo de comida buscas.',
          };
          setMessages((prev) => [...prev, noBizMsg]);
        }
      }
    } catch (error) {
      console.error('Yessi send error:', error);
      const errorMsg: ChatMessage = {
        id: nextId(),
        type: 'yessi',
        text: 'Ups, tuve un problema. Intenta de nuevo por favor.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [inputText, isThinking, businesses]);

  // ============================================================================
  // ADD TO CART
  // ============================================================================

  const handleAddToCart = useCallback(
    (product: MatchedProduct) => {
      const cartProduct: Product = {
        id: product.id,
        name: product.name,
        price: product.price,
        businessId: product.businessId,
        businessName: product.businessName,
        description: product.description,
        image: product.image,
        category: product.category,
      };

      addItem(cartProduct);
      setAddedProducts((prev) => new Set(prev).add(product.id));

      // Show confirm card after adding
      const currentCart = [...cartItems];
      const alreadyInCart = currentCart.find((i) => i.id === product.id);
      const qty = alreadyInCart ? alreadyInCart.quantity + 1 : 1;
      const itemTotal = product.price * qty;

      const confirmMsg: ChatMessage = {
        id: nextId(),
        type: 'yessi',
        text: `Listo! Agregue ${product.name} (${formatPrice(product.price)}) al carrito. Puedes seguir agregando o confirmar tu pedido.`,
      };
      setMessages((prev) => [...prev, confirmMsg]);
    },
    [addItem, cartItems]
  );

  // ============================================================================
  // GO TO CHECKOUT
  // ============================================================================

  const handleCheckout = useCallback(() => {
    router.push('/food/checkout' as any);
  }, [router]);

  // ============================================================================
  // RENDER MESSAGE
  // ============================================================================

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      switch (item.type) {
        case 'user':
          return (
            <View style={styles.userRow}>
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{item.text}</Text>
              </View>
            </View>
          );

        case 'yessi':
          return (
            <View style={styles.yessiRow}>
              <View style={styles.yessiAvatar}>
                <Feather name="zap" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.yessiBubble}>
                <Text style={styles.yessiText}>{item.text}</Text>
              </View>
            </View>
          );

        case 'results':
          return (
            <View style={styles.resultsContainer}>
              <View style={styles.yessiRow}>
                <View style={styles.yessiAvatar}>
                  <Feather name="zap" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.yessiBubble}>
                  <Text style={styles.yessiText}>{item.text}</Text>
                </View>
              </View>
              <View style={styles.productsList}>
                {item.products?.map((product) => {
                  const isAdded = addedProducts.has(product.id);
                  return (
                    <View key={product.id} style={styles.productCard}>
                      {product.image ? (
                        <Image
                          source={{ uri: product.image }}
                          style={styles.productImage}
                        />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <Feather name="coffee" size={20} color={DS.colors.muted} />
                        </View>
                      )}
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        {product.description ? (
                          <Text style={styles.productDesc} numberOfLines={1}>
                            {product.description}
                          </Text>
                        ) : null}
                        <Text style={styles.productPrice}>
                          {formatPrice(product.price)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.addBtn,
                          isAdded && styles.addBtnAdded,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleAddToCart(product)}
                      >
                        <Feather
                          name={isAdded ? 'check' : 'plus'}
                          size={18}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );

        default:
          return null;
      }
    },
    [addedProducts, handleAddToCart]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  const hasCartItems = cartItems.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={DS.colors.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Yessi</Text>
            <Feather name="zap" size={18} color={DS.colors.green} />
          </View>
          <Text style={styles.headerSubtitle}>Tu asistente personal</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Thinking indicator */}
      {isThinking && (
        <View style={styles.thinkingRow}>
          <View style={styles.yessiAvatar}>
            <Feather name="zap" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.thinkingBubble}>
            <ActivityIndicator size="small" color={DS.colors.green} />
            <Text style={styles.thinkingText}>Yessi esta pensando...</Text>
          </View>
        </View>
      )}

      {/* Cart banner */}
      {hasCartItems && (
        <TouchableOpacity
          style={styles.cartBanner}
          activeOpacity={0.9}
          onPress={handleCheckout}
        >
          <View style={styles.cartBannerLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItems.reduce((s, i) => s + i.quantity, 0)}</Text>
            </View>
            <Text style={styles.cartBannerText}>Confirmar Pedido</Text>
          </View>
          <Text style={styles.cartBannerPrice}>{formatPrice(cartTotal)}</Text>
        </TouchableOpacity>
      )}

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Escribe lo que quieres pedir..."
            placeholderTextColor={DS.colors.placeholder}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline={false}
            editable={!isThinking}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isThinking) && styles.sendBtnDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={!inputText.trim() || isThinking}
          >
            <Feather name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    backgroundColor: DS.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.hairline,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.xs,
  },
  headerTitle: {
    ...DS.fonts.section,
    color: DS.colors.dark,
  },
  headerSubtitle: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },

  // Messages
  messagesList: {
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.lg,
    paddingBottom: DS.space.xl,
  },

  // User message
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: DS.space.md,
  },
  userBubble: {
    maxWidth: '78%',
    backgroundColor: DS.colors.green,
    borderRadius: DS.radius.lg,
    borderBottomRightRadius: DS.space.xs,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
  },
  userText: {
    ...DS.fonts.body,
    color: '#FFFFFF',
  },

  // Yessi message
  yessiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: DS.space.md,
    gap: DS.space.sm,
  },
  yessiAvatar: {
    width: 32,
    height: 32,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  yessiBubble: {
    maxWidth: '78%',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    borderBottomLeftRadius: DS.space.xs,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    ...DS.shadow.card,
  },
  yessiText: {
    ...DS.fonts.body,
    color: DS.colors.body,
  },

  // Results
  resultsContainer: {
    marginBottom: DS.space.md,
  },
  productsList: {
    marginLeft: 40,
    marginTop: DS.space.sm,
    gap: DS.space.sm,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.md,
    padding: DS.space.md,
    gap: DS.space.md,
    ...DS.shadow.card,
  },
  productImage: {
    width: 52,
    height: 52,
    borderRadius: DS.radius.sm,
  },
  productImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: DS.radius.sm,
    backgroundColor: DS.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    ...DS.fonts.bodyMed,
    color: DS.colors.dark,
  },
  productDesc: {
    ...DS.fonts.small,
    color: DS.colors.muted,
  },
  productPrice: {
    ...DS.fonts.bodyMed,
    color: DS.colors.green,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...colorShadow(DS.colors.green),
  },
  addBtnAdded: {
    backgroundColor: DS.colors.blue,
  },

  // Thinking
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.md,
    gap: DS.space.sm,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    gap: DS.space.sm,
    ...DS.shadow.card,
  },
  thinkingText: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    fontStyle: 'italic',
  },

  // Cart banner
  cartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DS.colors.green,
    marginHorizontal: DS.space.lg,
    marginBottom: DS.space.sm,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.xl,
    paddingVertical: DS.space.lg,
    ...colorShadow(DS.colors.green),
  },
  cartBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
  cartBadge: {
    width: 26,
    height: 26,
    borderRadius: DS.radius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    ...DS.fonts.label,
    color: '#FFFFFF',
  },
  cartBannerText: {
    ...DS.fonts.button,
    color: '#FFFFFF',
  },
  cartBannerPrice: {
    ...DS.fonts.button,
    color: '#FFFFFF',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    backgroundColor: DS.colors.card,
    borderTopWidth: 1,
    borderTopColor: DS.colors.hairline,
    gap: DS.space.sm,
  },
  input: {
    flex: 1,
    ...DS.fonts.body,
    color: DS.colors.dark,
    backgroundColor: DS.colors.bg,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.md,
    minHeight: DS.touch.min,
    maxHeight: 100,
  },
  sendBtn: {
    width: DS.touch.min,
    height: DS.touch.min,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...colorShadow(DS.colors.green),
  },
  sendBtnDisabled: {
    backgroundColor: DS.colors.hairline,
    shadowOpacity: 0,
    elevation: 0,
  },
});
