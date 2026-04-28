import Image from 'next/image';

interface AppLogoProps {
  className?: string;
  alt?: string;
}

export default function AppLogo({
  className = 'h-10 w-10',
  alt = 'GC HealthLink logo',
}: AppLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={80}
      height={80}
      className={className}
      priority
    />
  );
}
