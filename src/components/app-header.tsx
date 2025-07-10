import Link from 'next/link';
import { Trophy } from 'lucide-react';

interface AppHeaderProps {
  subtitle?: string;
  className?: string;
}

export function AppHeader({ subtitle, className = "" }: AppHeaderProps) {
  return (
    <header className={`flex flex-col items-center text-center mb-8 ${className}`}>
      <Trophy className="w-12 h-12 text-primary mb-2" />
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <h1 className="text-4xl font-headline font-bold tracking-tighter">Apex Stats</h1>
      </Link>
      {subtitle && (
        <p className="text-muted-foreground mt-2">{subtitle}</p>
      )}
    </header>
  );
}
