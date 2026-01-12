import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, Clock, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Colors from '@/constants/colors';
import { Toast } from '@/utils/toast';

interface VerificationCodeDisplayProps {
  code: string;
  type: 'pickup' | 'delivery';
  validated: boolean;
  validatedAt?: string;
  instructions?: string;
}

export default function VerificationCodeDisplay({
  code,
  type,
  validated,
  validatedAt,
  instructions,
}: VerificationCodeDisplayProps) {
  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(code);
    Toast.success('Código copiado');
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {type === 'pickup' ? 'Código de Recolección' : 'Código de Entrega'}
        </Text>
        {validated ? (
          <View style={styles.validatedBadge}>
            <CheckCircle size={16} color={Colors.success} />
            <Text style={styles.validatedText}>Validado</Text>
          </View>
        ) : (
          <View style={styles.pendingBadge}>
            <Clock size={16} color={Colors.warning} />
            <Text style={styles.pendingText}>Pendiente</Text>
          </View>
        )}
      </View>

      <View style={[styles.codeContainer, validated && styles.codeContainerValidated]}>
        <Text style={styles.code}>{code}</Text>
        {!validated && (
          <TouchableOpacity 
            style={styles.copyButton} 
            onPress={handleCopyCode}
            activeOpacity={0.7}
          >
            <Copy size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {instructions && !validated && (
        <Text style={styles.instructions}>{instructions}</Text>
      )}

      {validated && validatedAt && (
        <View style={styles.validatedInfo}>
          <CheckCircle size={20} color={Colors.success} />
          <Text style={styles.validatedInfoText}>
            Validado a las {formatTime(validatedAt)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  validatedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: `${Colors.success}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  validatedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  pendingBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: `${Colors.warning}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  codeContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed' as const,
  },
  codeContainerValidated: {
    borderColor: Colors.success,
    backgroundColor: `${Colors.success}10`,
  },
  code: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    letterSpacing: 4,
  },
  copyButton: {
    marginLeft: 16,
    padding: 8,
  },
  instructions: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 12,
    textAlign: 'center' as const,
  },
  validatedInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 12,
    gap: 8,
  },
  validatedInfoText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500' as const,
  },
});
