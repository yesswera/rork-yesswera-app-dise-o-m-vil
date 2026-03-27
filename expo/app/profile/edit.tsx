import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: PANTALLA DE EDITAR PERFIL
// Usa ScreenContainer para diseño unificado
// ============================================================================

import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Edit2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';
import ScreenContainer from '@/components/ScreenContainer';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';

// Colores explícitos para modo oscuro
const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
  },
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
  });

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  const handleNameChange = (value: string) => {
    setName(value);
    setErrors((prev) => ({ ...prev, name: '' }));
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handlePickImage = async () => {
    try {
      HapticFeedback.light();

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu galería para seleccionar una foto',
          [{ text: 'OK' }]
        );
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
        HapticFeedback.success();
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.error('No se pudo seleccionar la imagen');
    }
  };

  const handleSave = async () => {
    const nameError = Validator.name(name);
    const phoneError = Validator.phone(phone);

    if (nameError || phoneError) {
      setErrors({
        name: nameError,
        phone: phoneError,
      });
      HapticFeedback.error();
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({ name, phone, avatar });

      HapticFeedback.success();
      Toast.success('Perfil actualizado exitosamente');
      router.back();
    } catch (error) {
      console.error('Update profile error:', error);
      HapticFeedback.error();
      Toast.error('No se pudo actualizar el perfil. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    HapticFeedback.light();
    router.back();
  };

  const getUserTypeLabel = () => {
    switch (user.userType) {
      case 'client': return 'Cliente';
      case 'driver': return 'Repartidor';
      case 'business': return 'Negocio';
      default: return user.userType;
    }
  };

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Edit2}
      headerTitle="Editar Perfil"
      headerSubtitle="Actualiza tu información personal"
    >
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <TouchableSound
          onPress={handlePickImage}
          activeOpacity={0.8}
          style={styles.avatarContainer}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={[styles.avatar, { borderColor: theme.card }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary, borderColor: theme.card }]}>
              <Text style={styles.avatarPlaceholderText}>
                {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </Text>
            </View>
          )}
          <View style={[styles.cameraButton, { backgroundColor: colors.primary, borderColor: theme.card }]}>
            <Camera size={18} color="#FFFFFF" />
          </View>
        </TouchableSound>
        <Text style={[styles.avatarHint, { color: theme.textSecondary }]}>Toca para cambiar foto</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <FormInput
          label="Nombre Completo"
          value={name}
          onChangeText={handleNameChange}
          error={errors.name}
          placeholder="Tu nombre completo"
          autoCapitalize="words"
          editable={!isLoading}
        />

        <FormInput
          label="Teléfono"
          value={phone}
          onChangeText={handlePhoneChange}
          error={errors.phone}
          placeholder="+52 333 123 4567"
          keyboardType="phone-pad"
          editable={!isLoading}
        />

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{user.email}</Text>
          <Text style={[styles.infoHint, { color: theme.textMuted }]}>El email no se puede cambiar</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Tipo de Usuario</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{getUserTypeLabel()}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <LoadingButton
            title="Guardar Cambios"
            onPress={handleSave}
            loading={isLoading}
            variant="primary"
          />

          <TouchableSound
            style={[styles.cancelButton, { backgroundColor: theme.cardAlt }]}
            onPress={handleCancel}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
          </TouchableSound>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarHint: {
    fontSize: 13,
  },
  form: {
    gap: 16,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoHint: {
    fontSize: 11,
    marginTop: 4,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
