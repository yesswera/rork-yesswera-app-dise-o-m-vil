import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
  });

  const validateName = (value: string) => {
    if (value.trim().length < 3) {
      return 'El nombre debe tener al menos 3 caracteres';
    }
    return '';
  };

  const validatePhone = (value: string) => {
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!phoneRegex.test(value)) {
      return 'Formato de teléfono inválido';
    }
    if (value.replace(/\D/g, '').length < 10) {
      return 'El teléfono debe tener al menos 10 dígitos';
    }
    return '';
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setErrors((prev) => ({ ...prev, name: '' }));
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleSave = async () => {
    const nameError = validateName(name);
    const phoneError = validatePhone(phone);

    if (nameError || phoneError) {
      setErrors({
        name: nameError,
        phone: phoneError,
      });
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        '¡Perfil Actualizado!',
        'Tus cambios han sido guardados exitosamente',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }, 1500);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
            <Text style={styles.avatarText}>
              {name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.avatarHint}>Toca para cambiar foto</Text>
        </View>

        <View style={styles.formSection}>
          <FormInput
            label="Nombre Completo"
            value={name}
            onChangeText={handleNameChange}
            error={errors.name}
            placeholder="Ingresa tu nombre completo"
            autoCapitalize="words"
          />

          <FormInput
            label="Teléfono"
            value={phone}
            onChangeText={handlePhoneChange}
            error={errors.phone}
            placeholder="+1 234 567 8900"
            keyboardType="phone-pad"
          />

          <Text style={styles.infoText}>
            Email: <Text style={styles.infoValue}>{user?.email}</Text>
          </Text>
          <Text style={styles.hint}>El email no puede ser modificado</Text>
        </View>

        <View style={styles.buttonsSection}>
          <LoadingButton
            title="Guardar Cambios"
            onPress={handleSave}
            loading={loading}
            variant="primary"
          />
          <LoadingButton
            title="Cancelar"
            onPress={handleCancel}
            variant="secondary"
            disabled={loading}
          />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    backgroundColor: Colors.white,
    alignItems: 'center' as const,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  avatarHint: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  formSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 16,
    marginBottom: 4,
  },
  infoValue: {
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  hint: {
    fontSize: 12,
    color: Colors.text.light,
  },
  buttonsSection: {
    paddingHorizontal: 20,
    marginTop: 32,
    gap: 12,
  },
});
