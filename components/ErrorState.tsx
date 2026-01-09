import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCcw } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'Algo salió mal',
  onRetry
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <AlertCircle size={48} color="#DC3545" />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <RefreshCcw size={20} color={Colors.white} />
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
    backgroundColor: Colors.background.secondary,
  },
  message: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
