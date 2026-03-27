import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: ONBOARDING DE NEGOCIO
// Wizard de 4 pasos para configurar negocio nuevo
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Store,
  Camera,
  ImageIcon,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Package,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';
import { processImage } from '@/services/image-upload';

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'cafe', label: 'Cafeteria' },
  { value: 'bakery', label: 'Panaderia' },
  { value: 'drinks', label: 'Bebidas' },
  { value: 'snacks', label: 'Antojitos' },
  { value: 'grocery', label: 'Abarrotes / Tienda' },
  { value: 'pharmacy', label: 'Farmacia' },
  { value: 'other', label: 'Otro' },
];

const DAYS = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mie' },
  { key: 'thu', label: 'Jue' },
  { key: 'fri', label: 'Vie' },
  { key: 'sat', label: 'Sab' },
  { key: 'sun', label: 'Dom' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function BusinessOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, space, radius } = useTheme();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Step 1: Info basica
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Ubicacion y horarios
  const [address, setAddress] = useState('');
  const [prepTime, setPrepTime] = useState('20');
  const [deliveryRadius, setDeliveryRadius] = useState('5');
  const [activeDays, setActiveDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');

  // Step 3: Logo
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);

  // Step 4: Primer producto
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productImageUri, setProductImageUri] = useState<string | null>(null);

  useEffect(() => {
    loadExistingBusiness();
  }, []);

  async function loadExistingBusiness() {
    if (!user) return;
    const { data } = await supabase
      .from('businesses')
      .select('id, business_name, phone, category, description, address, preparation_time_minutes, delivery_radius_km')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setBusinessId(data.id);
      if (data.business_name && data.business_name !== 'Por configurar') setBusinessName(data.business_name);
      if (data.phone) setPhone(data.phone);
      if (data.category) setCategory(data.category);
      if (data.description) setDescription(data.description);
      if (data.address && data.address !== 'Por configurar') setAddress(data.address);
      if (data.preparation_time_minutes) setPrepTime(data.preparation_time_minutes.toString());
      if (data.delivery_radius_km) setDeliveryRadius(data.delivery_radius_km.toString());
    }
  }

  const totalSteps = 4;
  const stepLabels = ['Info del Negocio', 'Ubicacion y Horario', 'Logo y Portada', 'Tu Primer Producto'];

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateStep = (s: number): boolean => {
    switch (s) {
      case 0:
        if (!businessName.trim()) { Alert.alert('Falta', 'Ingresa el nombre de tu negocio'); return false; }
        if (!category) { Alert.alert('Falta', 'Selecciona una categoria'); return false; }
        if (!phone.trim()) { Alert.alert('Falta', 'Ingresa un telefono de contacto'); return false; }
        return true;
      case 1:
        if (!address.trim()) { Alert.alert('Falta', 'Ingresa la direccion de tu negocio'); return false; }
        if (activeDays.length === 0) { Alert.alert('Falta', 'Selecciona al menos un dia de operacion'); return false; }
        return true;
      case 2:
        return true; // Logo/cover optional
      case 3:
        return true; // First product optional but encouraged
      default:
        return true;
    }
  };

  // ============================================================================
  // IMAGE PICKING
  // ============================================================================

  const pickImage = async (target: 'logo' | 'cover' | 'product') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galeria.');
      return;
    }

    const aspect: [number, number] = target === 'cover' ? [16, 9] : target === 'logo' ? [1, 1] : [4, 3];
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    if (target === 'logo') setLogoUri(uri);
    else if (target === 'cover') setCoverUri(uri);
    else setProductImageUri(uri);
  };

  // ============================================================================
  // SAVE & FINISH
  // ============================================================================

  const handleNext = async () => {
    if (!validateStep(step)) return;

    // Save progress after each step
    if (step === 0 || step === 1) {
      setSaving(true);
      try {
        await saveBusinessInfo();
      } catch (err) {
        console.error('Save error:', err);
        Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      await handleFinish();
    }
  };

  const saveBusinessInfo = async () => {
    if (!businessId) return;

    const schedule: Record<string, any> = {};
    for (const day of DAYS) {
      schedule[day.key] = {
        active: activeDays.includes(day.key),
        open: openTime,
        close: closeTime,
      };
    }

    await supabase
      .from('businesses')
      .update({
        business_name: businessName.trim(),
        category,
        description: description.trim() || null,
        phone: phone.trim(),
        address: address.trim() || 'Por configurar',
        preparation_time_minutes: parseInt(prepTime) || 20,
        delivery_radius_km: parseFloat(deliveryRadius) || 5,
        schedule,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Upload logo if selected
      if (logoUri && businessId) {
        const processed = await processImage(logoUri);
        const fileName = `${businessId}/logo-${Date.now()}.jpg`;
        const bytes = Uint8Array.from(atob(processed.base64), c => c.charCodeAt(0));
        await supabase.storage.from('product-images').upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
        await supabase.from('businesses').update({ logo_url: urlData.publicUrl }).eq('id', businessId);
      }

      // Upload cover if selected
      if (coverUri && businessId) {
        const processed = await processImage(coverUri);
        const fileName = `${businessId}/cover-${Date.now()}.jpg`;
        const bytes = Uint8Array.from(atob(processed.base64), c => c.charCodeAt(0));
        await supabase.storage.from('product-images').upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
        await supabase.from('businesses').update({ cover_url: urlData.publicUrl }).eq('id', businessId);
      }

      // Create first product if filled
      if (productName.trim() && productPrice.trim() && businessId) {
        let imageUrl = '';
        if (productImageUri) {
          const processed = await processImage(productImageUri);
          const fileName = `${businessId}/product-${Date.now()}.jpg`;
          const bytes = Uint8Array.from(atob(processed.base64), c => c.charCodeAt(0));
          await supabase.storage.from('product-images').upload(fileName, bytes, {
            contentType: 'image/jpeg',
            upsert: true,
          });
          const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }

        await supabase.from('products').insert({
          business_id: businessId,
          name: productName.trim(),
          description: productDesc.trim() || null,
          price: parseFloat(productPrice) || 0,
          image_url: imageUrl || null,
          is_available: true,
          unit: 'pieza',
        });
      }

      // Mark onboarding complete
      await supabase
        .from('businesses')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      Alert.alert(
        'Negocio configurado!',
        'Tu negocio esta listo. Ahora puedes agregar mas productos y abrir para recibir ordenes.',
        [{ text: 'Ir al Dashboard', onPress: () => router.replace('/business/dashboard' as any) }],
      );
    } catch (err) {
      console.error('Finish error:', err);
      Alert.alert('Error', 'Hubo un problema al finalizar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  const renderStep0 = () => (
    <View>
      <ThemedText variant="h3" bold style={{ color: colors.text.primary, marginBottom: 4 }}>
        Informacion de tu negocio
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={{ marginBottom: 20 }}>
        Datos basicos que veran tus clientes
      </ThemedText>

      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6 }}>
        Nombre del negocio *
      </ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="Ej: Tacos El Compa"
        placeholderTextColor={colors.text.muted}
      />

      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
        Categoria *
      </ThemedText>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => (
          <TouchableSound
            key={cat.value}
            style={[styles.categoryChip, {
              backgroundColor: category === cat.value ? colors.secondary : colors.card,
              borderColor: category === cat.value ? colors.secondary : colors.border.medium,
              borderRadius: radius.sm,
            }]}
            onPress={() => setCategory(cat.value)}
          >
            <ThemedText variant="caption" style={{
              color: category === cat.value ? '#FFF' : colors.text.primary,
              fontWeight: category === cat.value ? '700' : '400',
            }}>
              {cat.label}
            </ThemedText>
          </TouchableSound>
        ))}
      </View>

      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
        Telefono de contacto *
      </ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
        value={phone}
        onChangeText={setPhone}
        placeholder="3171234567"
        placeholderTextColor={colors.text.muted}
        keyboardType="phone-pad"
      />

      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
        Descripcion (opcional)
      </ThemedText>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Los mejores tacos de Tomatlan desde 1995..."
        placeholderTextColor={colors.text.muted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStep1 = () => (
    <View>
      <ThemedText variant="h3" bold style={{ color: colors.text.primary, marginBottom: 4 }}>
        Ubicacion y horarios
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={{ marginBottom: 20 }}>
        Para que los clientes sepan donde encontrarte
      </ThemedText>

      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6 }}>
        Direccion *
      </ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
        value={address}
        onChangeText={setAddress}
        placeholder="Calle, numero, colonia"
        placeholderTextColor={colors.text.muted}
      />

      <View style={styles.rowInputs}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
            Tiempo de preparacion (min)
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
            value={prepTime}
            onChangeText={setPrepTime}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
            Radio de entrega (km)
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
            value={deliveryRadius}
            onChangeText={setDeliveryRadius}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
      </View>

      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 8, marginTop: 16 }}>
        Dias de operacion *
      </ThemedText>
      <View style={styles.daysRow}>
        {DAYS.map((day) => {
          const active = activeDays.includes(day.key);
          return (
            <TouchableSound
              key={day.key}
              style={[styles.dayChip, {
                backgroundColor: active ? colors.secondary : colors.card,
                borderColor: active ? colors.secondary : colors.border.medium,
              }]}
              onPress={() => {
                setActiveDays(prev =>
                  active ? prev.filter(d => d !== day.key) : [...prev, day.key]
                );
              }}
            >
              <ThemedText variant="caption" style={{
                color: active ? '#FFF' : colors.text.primary,
                fontWeight: active ? '700' : '400',
                fontSize: 12,
              }}>
                {day.label}
              </ThemedText>
            </TouchableSound>
          );
        })}
      </View>

      <View style={styles.rowInputs}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
            Hora de apertura
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
            value={openTime}
            onChangeText={setOpenTime}
            placeholder="09:00"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
            Hora de cierre
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
            value={closeTime}
            onChangeText={setCloseTime}
            placeholder="21:00"
            placeholderTextColor={colors.text.muted}
          />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <ThemedText variant="h3" bold style={{ color: colors.text.primary, marginBottom: 4 }}>
        Imagenes de tu negocio
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={{ marginBottom: 20 }}>
        Opcional, pero ayuda mucho a atraer clientes
      </ThemedText>

      {/* Logo */}
      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 8 }}>
        Logo
      </ThemedText>
      <TouchableSound
        style={[styles.imagePicker, { borderColor: colors.border.medium, borderRadius: radius.md, backgroundColor: colors.card }]}
        onPress={() => pickImage('logo')}
      >
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logoPreview} />
        ) : (
          <View style={styles.imagePickerEmpty}>
            <Camera size={32} color={colors.text.muted} />
            <ThemedText variant="caption" color="muted" style={{ marginTop: 8 }}>
              Toca para elegir logo
            </ThemedText>
          </View>
        )}
      </TouchableSound>

      {/* Cover */}
      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 8, marginTop: 20 }}>
        Foto de portada
      </ThemedText>
      <TouchableSound
        style={[styles.coverPicker, { borderColor: colors.border.medium, borderRadius: radius.md, backgroundColor: colors.card }]}
        onPress={() => pickImage('cover')}
      >
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.coverPreview} />
        ) : (
          <View style={styles.imagePickerEmpty}>
            <ImageIcon size={32} color={colors.text.muted} />
            <ThemedText variant="caption" color="muted" style={{ marginTop: 8 }}>
              Foto del local o de tus platillos
            </ThemedText>
          </View>
        )}
      </TouchableSound>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <ThemedText variant="h3" bold style={{ color: colors.text.primary, marginBottom: 4 }}>
        Tu primer producto
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={{ marginBottom: 20 }}>
        Agrega al menos uno. Despues podras agregar mas desde el dashboard.
      </ThemedText>

      <TouchableSound
        style={[styles.productImagePicker, { borderColor: colors.border.medium, borderRadius: radius.md, backgroundColor: colors.card }]}
        onPress={() => pickImage('product')}
      >
        {productImageUri ? (
          <Image source={{ uri: productImageUri }} style={styles.productImagePreview} />
        ) : (
          <View style={styles.imagePickerEmpty}>
            <Camera size={32} color={colors.text.muted} />
            <ThemedText variant="caption" color="muted" style={{ marginTop: 8 }}>
              Foto del producto
            </ThemedText>
          </View>
        )}
      </TouchableSound>

      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
        Nombre del producto
      </ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
        value={productName}
        onChangeText={setProductName}
        placeholder="Ej: Taco al Pastor"
        placeholderTextColor={colors.text.muted}
      />

      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
        Precio (MXN)
      </ThemedText>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
        value={productPrice}
        onChangeText={setProductPrice}
        placeholder="25"
        placeholderTextColor={colors.text.muted}
        keyboardType="decimal-pad"
      />

      <ThemedText variant="label" bold style={{ color: colors.text.primary, marginBottom: 6, marginTop: 16 }}>
        Descripcion (opcional)
      </ThemedText>
      <TextInput
        style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border.medium, color: colors.text.primary, borderRadius: radius.md }]}
        value={productDesc}
        onChangeText={setProductDesc}
        placeholder="Tortilla de maiz, carne al pastor, pina, cilantro..."
        placeholderTextColor={colors.text.muted}
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={Store}
      headerTitle="Configurar Negocio"
      headerSubtitle={`Paso ${step + 1} de ${totalSteps}`}
    >
      {/* Progress bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.card, borderRadius: radius.sm }]}>
        <View style={[styles.progressBar, {
          backgroundColor: colors.secondary,
          width: `${((step + 1) / totalSteps) * 100}%`,
          borderRadius: radius.sm,
        }]} />
      </View>
      <View style={styles.stepLabelsRow}>
        {stepLabels.map((label, i) => (
          <View key={i} style={[styles.stepDot, {
            backgroundColor: i <= step ? colors.secondary : colors.border.medium,
          }]}>
            {i < step ? (
              <CheckCircle size={14} color="#FFF" />
            ) : (
              <ThemedText variant="caption" style={{ color: i <= step ? '#FFF' : colors.text.muted, fontSize: 10, fontWeight: '700' }}>
                {i + 1}
              </ThemedText>
            )}
          </View>
        ))}
      </View>

      {/* Step content */}
      <View style={{ marginTop: 20 }}>
        {renderCurrentStep()}
      </View>

      {/* Navigation buttons */}
      <View style={[styles.navRow, { marginTop: 24, marginBottom: 40 }]}>
        {step > 0 && (
          <TouchableSound
            style={[styles.backBtn, { borderColor: colors.border.medium, borderRadius: radius.md }]}
            onPress={() => setStep(step - 1)}
          >
            <ChevronLeft size={18} color={colors.text.secondary} />
            <ThemedText variant="body" color="secondary" style={{ marginLeft: 4 }}>Atras</ThemedText>
          </TouchableSound>
        )}
        <TouchableSound
          style={[styles.nextBtn, {
            backgroundColor: colors.secondary,
            borderRadius: radius.md,
            flex: step === 0 ? 1 : undefined,
            opacity: saving ? 0.7 : 1,
          }]}
          onPress={handleNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <ThemedText variant="body" bold style={{ color: '#FFF' }}>
                {step === totalSteps - 1 ? 'Finalizar' : 'Siguiente'}
              </ThemedText>
              {step < totalSteps - 1 && <ChevronRight size={18} color="#FFF" style={{ marginLeft: 4 }} />}
            </>
          )}
        </TouchableSound>
      </View>

      {/* Skip option on last step */}
      {step === totalSteps - 1 && (
        <TouchableSound
          style={{ alignItems: 'center', paddingBottom: 20 }}
          onPress={handleFinish}
        >
          <ThemedText variant="caption" color="muted">
            Saltar por ahora — agregar productos despues
          </ThemedText>
        </TouchableSound>
      )}
    </ScreenContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  progressContainer: {
    height: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 70,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
  },
  coverPicker: {
    width: '100%',
    height: 140,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  imagePickerEmpty: {
    alignItems: 'center',
  },
  productImagePicker: {
    width: '100%',
    height: 180,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  productImagePreview: {
    width: '100%',
    height: '100%',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});
