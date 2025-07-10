'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy } from 'lucide-react';

interface AppHeaderProps {
  subtitle?: string;
  className?: string;
}

export function AppHeader({ subtitle, className = "" }: AppHeaderProps) {
  const router = useRouter();

  const handleTitleClick = () => {
    router.push('/');
  };

  return (
    <header className={`flex flex-col items-center text-center mb-8 ${className}`}>
      <Trophy className="w-12 h-12 text-primary mb-2" />
      <div 
        onClick={handleTitleClick}
        className="hover:opacity-80 transition-opacity cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleTitleClick();
          }
        }}
      >
        <h1 className="text-4xl font-headline font-bold tracking-tighter">Apex Stats</h1>
      </div>
      {subtitle && (
        <p className="text-muted-foreground mt-2">{subtitle}</p>
      )}
    </header>
  );
}
