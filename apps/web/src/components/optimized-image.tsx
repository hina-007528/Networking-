import Image from 'next/image';

/** Local/public images with lazy loading; use `priority` for the LCP hero only. */
export function OptimizedImage({
  src,
  alt,
  className,
  priority = false,
  sizes = '100vw',
  fill = false,
  width,
  height,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}) {
  const common = {
    src,
    alt,
    className,
    sizes,
    quality: 72,
    ...(priority ? { priority: true as const } : { loading: 'lazy' as const }),
  };

  if (fill) {
    return <Image fill {...common} />;
  }

  return <Image width={width ?? 1200} height={height ?? 675} {...common} />;
}
