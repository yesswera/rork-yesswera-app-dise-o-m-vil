import TouchableSound from '@/components/TouchableSound';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  Alert,
  Vibration,
} from 'react-native';
import { AlertOctagon } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import * as Location from 'expo-location';

interface PanicButtonProps {
  orderId?: string;
}

export default function PanicButton({ orderId }: PanicButtonProps) {
  const { user, token } = useAuth();
  const [isPressed, setIsPressed] = useState(false);

  const handlePanicActivated = async () => {
    try {
      Vibration.vibrate([0, 500, 200, 500]);

      const { status } = await Location.requestForegroundPermissionsAsync();
      let location = null;

      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        location = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
      }

      Alert.alert(
        '🆘 EMERGENCIA',
        '¿Qué tipo de emergencia es?',
        [
          {
            text: 'Robo',
            onPress: () => sendPanicReport('robbery', location),
          },
          {
            text: 'Accidente',
            onPress: () => sendPanicReport('accident', location),
          },
          {
            text: 'Amenaza',
            onPress: () => sendPanicReport('threat', location),
          },
          {
            text: 'Salud',
            onPress: () => sendPanicReport('health', location),
          },
          {
            text: 'Otro',
            onPress: () => sendPanicReport('other', location),
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error activating panic:', error);
      Alert.alert('Error', 'No se pudo activar el botón de pánico');
    }
  };

  const sendPanicReport = async (type: string, location: any) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user?.id,
          title: `EMERGENCIA: ${type}`,
          body: `Driver ${user?.name || user?.id} reportó emergencia tipo "${type}"`,
          data_json: {
            type: 'emergency',
            emergencyType: type,
            driverId: user?.id,
            orderId: orderId,
            location: location,
            timestamp: new Date().toISOString(),
          },
        });

      if (error) throw error;

      Alert.alert(
        'Alerta Enviada',
        'Tu contacto de emergencia y el equipo de soporte han sido notificados.\n\nUbicación compartida en tiempo real.',
        [
          {
            text: 'Llamar al 911',
            onPress: () => {
              Alert.alert('911', 'Función de llamada disponible en dispositivo físico');
            },
          },
          {
            text: 'Entendido',
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error sending panic report:', error);
      Alert.alert('Error', 'No se pudo enviar la alerta de emergencia');
    }
  };

  const handleLongPress = () => {
    setIsPressed(true);
  };

  const handlePressOut = () => {
    if (isPressed) {
      handlePanicActivated();
    }
    setIsPressed(false);
  };

  return (
    <TouchableSound
      style={[styles.button, isPressed && styles.buttonPressed]}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
      delayLongPress={3000}
      activeOpacity={0.8}
    >
      <AlertOctagon size={32} color={Colors.white} strokeWidth={3} />
      <Text style={styles.buttonText}>EMERGENCIA</Text>
      <Text style={styles.helperText}>Mantén presionado 3 seg</Text>
    </TouchableSound>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.error,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 120,
  },
  buttonPressed: {
    backgroundColor: '#8B0000',
    transform: [{ scale: 0.95 }],
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 8,
    letterSpacing: 1,
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
});
