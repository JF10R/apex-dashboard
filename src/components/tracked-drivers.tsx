'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, StarOff, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type SearchedDriver } from '@/lib/iracing-types';
import { useTrackedDrivers } from '@/hooks/use-tracked-drivers';

interface TrackedDriversProps {
  currentDriver?: SearchedDriver | null;
}

export default function TrackedDrivers({ currentDriver }: TrackedDriversProps) {
  const { trackedDrivers, isLoading, removeTrackedDriver, clearAllTrackedDrivers } = useTrackedDrivers();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Tracked Drivers
          </CardTitle>
          <CardDescription>Loading your tracked drivers...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (trackedDrivers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Tracked Drivers
          </CardTitle>
          <CardDescription>
            Search for drivers above and click the star icon to track their performance.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleClearAll = () => {
    if (showConfirmClear) {
      clearAllTrackedDrivers();
      setShowConfirmClear(false);
    } else {
      setShowConfirmClear(true);
      setTimeout(() => setShowConfirmClear(false), 3000); // Auto-hide after 3 seconds
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Tracked Drivers
              <Badge variant="secondary">{trackedDrivers.length}</Badge>
            </CardTitle>
            <CardDescription>
              Quick access to your favorite drivers
            </CardDescription>
          </div>
          {trackedDrivers.length > 1 && (
            <Button
              variant={showConfirmClear ? "destructive" : "outline"}
              size="sm"
              onClick={handleClearAll}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {showConfirmClear ? "Confirm Clear" : "Clear All"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {trackedDrivers.map((driver) => (
            <div
              key={driver.custId}
              className="relative border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Link
                href={`/${driver.custId}`}
                className="block p-3 pr-32" // Add right padding to leave space for buttons
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{driver.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {driver.custId}
                    </div>
                  </div>
                  {currentDriver?.custId === driver.custId && (
                    <Badge variant="default">Currently Viewing</Badge>
                  )}
                </div>
              </Link>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  title="Compare with other drivers"
                >
                  <Link href={`/compare?driverA=${encodeURIComponent(driver.name)}&custIdA=${driver.custId}`}>
                    <Users className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTrackedDriver(driver.custId)}
                  title="Remove from tracked"
                >
                  <StarOff className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
