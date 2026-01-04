import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [name, setName] = useState<string>(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  const validateForm = (): boolean => {
    const newErrors: { name?: string; phone?: string } = {};

    if (name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    const phoneRegex = /^\+?[\d\s-()]+$/;
    if (!phoneRegex.test(phone) || phone.length < 10) {
      newErrors.phone = 'Ingresa un número de teléfono válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permiso Requerido', 'Necesitas dar permisos para acceder a la galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        '¡Perfil Actualizado!',
        'Tus datos han sido guardados exitosamente',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const getInitials = () => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <Camera size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarHint}>Toca para cambiar foto</Text>
        </View>

        <View style={styles.formSection}>
          <FormInput
            label="Nombre Completo"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) {
                setErrors({ ...errors, name: undefined });
              }
            }}
            placeholder="Ingresa tu nombre completo"
            error={errors.name}
            autoCapitalize="words"
          />

          <FormInput
            label="Teléfono"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) {
                setErrors({ ...errors, phone: undefined });
              }
            }}
            placeholder="+1 234 567 8900"
            error={errors.phone}
            keyboardType="phone-pad"
          />

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Tu email no puede ser modificado. Para cambiar tu email, contacta con soporte.
            </Text>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <LoadingButton
            title="Guardar Cambios"
            onPress={handleSave}
            loading={isLoading}
            variant="primary"
          />

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  cameraButton: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarHint: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  formSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  infoCard: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  infoText: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
});
