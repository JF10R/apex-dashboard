'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Search, Star, StarOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from './ui/button';
import { searchDriversAction } from '@/app/data-actions';

interface SearchedDriver {
  custId: number;
  name: string;
}

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
        console.error(error);
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

  return (
    <div className="relative w-full">
      <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverAnchor asChild>
          <div ref={triggerRef} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search for a driver (e.g., Jeff Noel)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent 
          className="w-full p-0" 
          align="start"
          style={{ width: triggerRef.current?.offsetWidth }}
        >
          <div className="max-h-60 overflow-y-auto">
            {results.map((driver) => (
              <button
                key={driver.custId}
                onClick={() => handleSelectDriver(driver)}
                className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none flex items-center justify-between group"
              >
                <span className="font-medium">{driver.name}</span>
                <span className="text-xs text-muted-foreground">ID: {driver.custId}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
