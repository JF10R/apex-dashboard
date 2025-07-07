'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Search } from 'lucide-react';
import { DRIVER_DATA, type Driver } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from './ui/button';

interface DriverSearchProps {
  onDriverSelect: (driver: Driver | null) => void;
  initialDriver?: Driver | null;
  label?: string;
}

export default function DriverSearch({ onDriverSelect, initialDriver, label }: DriverSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialDriver?.name || '');
  const [results, setResults] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const debounce = (func: Function, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (!query.trim()) {
        setResults([]);
        setIsLoading(false);
        setPopoverOpen(false);
        return;
      }
      
      const driverKeys = Object.keys(DRIVER_DATA).filter(key =>
        key.toLowerCase().includes(query.toLowerCase().trim())
      );
      const foundDrivers = driverKeys.map(key => DRIVER_DATA[key]);
      setResults(foundDrivers);
      setIsLoading(false);
      setPopoverOpen(foundDrivers.length > 0);
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
    }
  }, [searchQuery, debouncedSearch]);
  
  const handleSelectDriver = (driver: Driver) => {
    setSearchQuery(driver.name);
    onDriverSelect(driver);
    setPopoverOpen(false);
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
                            <li key={driver.id}>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={() => handleSelectDriver(driver)}
                                >
                                    {driver.name}
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
