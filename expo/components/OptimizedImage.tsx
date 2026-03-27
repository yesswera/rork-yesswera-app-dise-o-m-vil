/**
 * OptimizedImage - Componente de imagen con caché optimizado
 *
 * Usa expo-image que tiene:
 * - Caché automático en disco
 * - Placeholder mientras carga
 * - Transiciones suaves
 * - Decodificación en segundo plano
 */

import { Image, ImageProps, ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Colors from '@/constants/colors';

// Política de caché por defecto (7 días)
const DEFAULT_CACHE_POLICY = 'disk' as const;

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: ImageSource | string | null | undefined;
  fallbackIcon?: React.ReactNode;
  showPlaceholder?: boolean;
}

export default function OptimizedImage({
  source,
  style,
  fallbackIcon,
  showPlaceholder = true,
  ...props
}: OptimizedImageProps) {
  // Normalizar source
  const imageSource: ImageSource | undefined = source
    ? typeof source === 'string'
      ? { uri: source }
      : source
    : undefined;

  // Si no hay source, mostrar fallback
  if (!imageSource?.uri) {
    if (fallbackIcon) {
      return (
        <View style={[styles.placeholder, style]}>
          {fallbackIcon}
        </View>
      );
    }
    return <View style={[styles.placeholder, style]} />;
  }

  return (
    <Image
      source={imageSource}
      style={style}
      contentFit="cover"
      transition={200}
      cachePolicy={DEFAULT_CACHE_POLICY}
      placeholder={showPlaceholder ? { blurhash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.' } : undefined}
      placeholderContentFit="cover"
      {...props}
    />
  );
}

/**
 * Componente de avatar optimizado
 */
interface AvatarImageProps {
  source: string | null | undefined;
  size?: number;
  fallbackIcon?: React.ReactNode;
}

export function AvatarImage({ source, size = 48, fallbackIcon }: AvatarImageProps) {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <OptimizedImage
      source={source}
      style={avatarStyle}
      fallbackIcon={fallbackIcon}
      contentFit="cover"
    />
  );
}

/**
 * Componente de imagen de producto optimizada
 */
interface ProductImageProps {
  source: string | null | undefined;
  width?: number | string;
  height?: number;
  fallbackIcon?: React.ReactNode;
}

export function ProductImage({
  source,
  width = '100%',
  height = 150,
  fallbackIcon,
}: ProductImageProps) {
  return (
    <OptimizedImage
      source={source}
      style={{ width: width as number, height, borderRadius: 8 }}
      fallbackIcon={fallbackIcon}
      contentFit="cover"
    />
  );
}

/**
 * Pre-carga imágenes para mejorar UX
 * Llamar en splash screen o al inicio
 */
export async function prefetchImages(urls: string[]): Promise<void> {
  try {
    await Promise.all(
      urls.map(url => Image.prefetch(url))
    );
  } catch (error) {
    console.error('Error prefetching images:', error);
  }
}

/**
 * Limpia el caché de imágenes
 * Útil para debugging o liberar espacio
 */
export async function clearImageCache(): Promise<void> {
  try {
    await Image.clearDiskCache();
    await Image.clearMemoryCache();
  } catch (error) {
    console.error('Error clearing image cache:', error);
  }
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
