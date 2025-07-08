'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Search, Star, StarOff } from 'lucide-react';
import { type SearchedDriver } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from './ui/button';
import { searchDriversAction } from '@/app/data-actions';
import { useTrackedDrivers } from '@/hooks/use-tracked-drivers';

interface DriverSearchProps {
  onDriverSelect: (driver: SearchedDriver | null) => void;
  initialDriverName?: string;
  label?: string;
}

export default function DriverSearch({ onDriverSelect, initialDriverName, label }: DriverSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialDriverName || '');
  const [results, setResults] = useState<SearchedDriver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { addTrackedDriver, removeTrackedDriver, isDriverTracked } = useTrackedDrivers();

  // Set search query when initial driver name changes (e.g. from URL param)
  useEffect(() => {
    setSearchQuery(initialDriverName || '');
  }, [initialDriverName]);

  const debounce = (func: Function, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        setIsLoading(false);
        setPopoverOpen(false);
        return;
      }
      
      const { data, error } = await searchDriversAction(query);
      if (error) {
        console.error(error); // Maybe show a toast later
      }

      setResults(data || []);
      setIsLoading(false);
      setPopoverOpen((data || []).length > 0);
    }, 300),
    []
  );

  useEffect(() => {
    if (searchQuery) {
      setIsLoading(true);
      debouncedSearch(searchQuery);
    } else {
      setResults([]);
      setPopoverOpen(false);
      onDriverSelect(null);
    }
  }, [searchQuery, debouncedSearch, onDriverSelect]);
  
  const handleSelectDriver = (driver: SearchedDriver) => {
    setSearchQuery(driver.name);
    onDriverSelect(driver);
    setPopoverOpen(false);
  };

  const handleToggleTracking = (driver: SearchedDriver, event: React.MouseEvent) => {
    event.stopPropagation();
    if (isDriverTracked(driver.custId)) {
      removeTrackedDriver(driver.custId);
    } else {
      addTrackedDriver(driver);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If there's exactly one result, select it
      if (results.length === 1) {
        handleSelectDriver(results[0]);
      }
    }
  };

  return (
    <div>
        {label && <h2 className="text-lg font-semibold mb-2">{label}</h2>}
        <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverAnchor asChild>
                <div className="relative" ref={triggerRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search for a driver..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label="Driver Name"
                    />
                    {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" />}
                </div>
            </PopoverAnchor>
            <PopoverContent 
                className="p-0"
                style={{ width: triggerRef.current?.offsetWidth }}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <ul className="max-h-60 overflow-y-auto">
                    {results.length > 0 ? (
                        results.map(driver => (
                            <li key={driver.custId} className="flex items-center">
                                <Button
                                    variant="ghost"
                                    className="flex-1 justify-start rounded-none"
                                    onClick={() => handleSelectDriver(driver)}
                                >
                                    {driver.name}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-full px-3 rounded-none"
                                    onClick={(e) => handleToggleTracking(driver, e)}
                                    title={isDriverTracked(driver.custId) ? "Remove from tracked" : "Add to tracked"}
                                >
                                    {isDriverTracked(driver.custId) ? (
                                        <Star className="w-4 h-4 fill-current" />
                                    ) : (
                                        <Star className="w-4 h-4" />
                                    )}
                                </Button>
                            </li>
                        ))
                    ) : (
                        <li className="p-4 text-sm text-muted-foreground text-center">
                            No drivers found.
                        </li>
                    )}
                </ul>
            </PopoverContent>
        </Popover>
    </div>
  );
}
