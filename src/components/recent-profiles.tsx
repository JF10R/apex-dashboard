'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, X, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRecentProfiles, type RecentProfile } from '@/hooks/use-recent-profiles';
import { cn } from '@/lib/utils';

interface RecentProfilesProps {
  className?: string;
}

export default function RecentProfiles({ className }: RecentProfilesProps) {
  const { recentProfiles, removeRecentProfile, clearRecentProfiles } = useRecentProfiles();

  // Debug logging
  console.log('RecentProfiles component render:', {
    profilesCount: recentProfiles.length,
    profiles: recentProfiles
  });

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (recentProfiles.length === 0) {
    return null;
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recently Viewed
          </CardTitle>
          <CardDescription>
            Quick access to recently viewed driver profiles
          </CardDescription>
        </div>
        {recentProfiles.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRecentProfiles}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recentProfiles.map((profile) => (
            <div key={profile.custId} className="group relative">
              <Link href={`/${profile.custId}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {profile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(profile.lastAccessed)}
                    </p>
                  </div>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-1 -right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeRecentProfile(profile.custId);
                }}
                title="Remove from recent"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
