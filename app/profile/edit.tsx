import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
import { Validator } from '@/utils/validation';
import { HapticFeedback } from '@/utils/haptics';
import { StatusBar } from 'expo-status-bar';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.8}
            style={styles.avatarContainer}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
            )}
            <View style={styles.cameraButton}>
              <Camera size={18} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toca para cambiar foto</Text>
        </View>

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
            placeholder="+1 234 567 8900"
            keyboardType="phone-pad"
            editable={!isLoading}
          />

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
            <Text style={styles.infoHint}>El email no se puede cambiar</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Tipo de Usuario</Text>
            <Text style={styles.infoValue}>
              {user.userType === 'client' ? 'Cliente' :
               user.userType === 'driver' ? 'Repartidor' : 'Negocio'}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <LoadingButton
              title="Guardar Cambios"
              onPress={handleSave}
              loading={isLoading}
              variant="primary"
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    backgroundColor: Colors.black,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center' as const,
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginBottom: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  cameraButton: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarHint: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  form: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  infoHint: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 4,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
});
