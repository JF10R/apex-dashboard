import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock } from 'lucide-react';
import { cache, formatTimeUntilExpiry } from '@/lib/cache';

interface CacheStatusProps {
  cacheKey: string;
  onRefresh: () => void;
  isLoading?: boolean;
  className?: string;
}

export function CacheStatus({ cacheKey, onRefresh, isLoading = false, className = "" }: CacheStatusProps) {
  const [cacheInfo, setCacheInfo] = useState(() => cache.getCacheInfo(cacheKey));
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCacheInfo = () => {
      const info = cache.getCacheInfo(cacheKey);
      setCacheInfo(info);
      
      if (info.exists && info.expiresIn) {
        setTimeLeft(formatTimeUntilExpiry(info.expiresIn));
      } else {
        setTimeLeft('');
      }
    };

    // Update immediately
    updateCacheInfo();

    // Update every second
    const interval = setInterval(updateCacheInfo, 1000);

    return () => clearInterval(interval);
  }, [cacheKey]);

  if (!cacheInfo.exists) {
    return null;
  }

  const isExpiring = cacheInfo.expiresIn && cacheInfo.expiresIn < 60000; // Less than 1 minute

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={isExpiring ? "destructive" : "secondary"} className="text-xs">
        <Clock className="w-3 h-3 mr-1" />
        {timeLeft || 'Expired'}
      </Badge>
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="text-xs h-7"
      >
        <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}
