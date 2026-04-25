import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/auth';
import { DS } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';
import YAvatar from '@/components/ui/YAvatar';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const [saving, setSaving] = useState(false);

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galeria');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const nameErr = Validator.name(name);
    const phoneErr = Validator.phone(phone);
    if (nameErr || phoneErr) {
      Toast.error(nameErr || phoneErr);
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ name, phone, avatar });
      HapticFeedback.success();
      Toast.success('Perfil actualizado');
      router.back();
    } catch {
      Toast.error('No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickImage} activeOpacity={0.8}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
            ) : (
              <YAvatar name={name} size={100} color={DS.colors.green} />
            )}
            <View style={styles.cameraBtn}>
              <Camera size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.hint}>Toca para cambiar foto</Text>

          {/* Name */}
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={DS.colors.placeholder}
            autoCapitalize="words"
          />

          {/* Phone */}
          <Text style={styles.label}>Telefono</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+52 333 123 4567"
            placeholderTextColor={DS.colors.placeholder}
            keyboardType="phone-pad"
          />

          {/* Email (read-only) */}
          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.disabledText}>{user.email}</Text>
          </View>
          <Text style={styles.readOnly}>El email no se puede cambiar</Text>

          {/* Save */}
          <View style={styles.actions}>
            <BigButton
              title="Guardar Cambios"
              color={DS.colors.green}
              onPress={handleSave}
              loading={saving}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { padding: DS.space.xl, paddingBottom: 40 },
  avatarWrap: { alignSelf: 'center', marginTop: DS.space.lg, position: 'relative' },
  avatarImg: { width: 100, height: 100, borderRadius: 50, backgroundColor: DS.colors.hairline },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: DS.colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: DS.colors.bg,
  },
  hint: { ...DS.fonts.small, color: DS.colors.muted, textAlign: 'center', marginTop: DS.space.sm, marginBottom: DS.space.xxxl },
  label: { ...DS.fonts.label, color: DS.colors.dark, marginBottom: DS.space.sm },
  input: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.hairline,
    paddingHorizontal: DS.space.lg,
    height: DS.touch.min,
    justifyContent: 'center',
    ...DS.fonts.body,
    color: DS.colors.dark,
    marginBottom: DS.space.lg,
  },
  inputDisabled: { backgroundColor: DS.colors.divider },
  disabledText: { ...DS.fonts.body, color: DS.colors.muted },
  readOnly: { ...DS.fonts.small, color: DS.colors.muted, marginTop: -DS.space.md, marginBottom: DS.space.lg },
  actions: { gap: DS.space.md, marginTop: DS.space.xl },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: DS.space.lg,
    backgroundColor: DS.colors.divider,
    borderRadius: DS.radius.lg,
  },
  cancelText: { ...DS.fonts.bodyMed, color: DS.colors.body },
});
