'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Car, 
  Flag, 
  Timer, 
  User, 
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Clock,
  Zap
} from 'lucide-react';
import { getResultsEventLog, getResultsLapChartData } from '@/lib/iracing-api-core';

// Enhanced event interfaces based on iRacing API
export interface RaceEvent {
  eventSeq: number;
  sessionTime: number;
  lapNumber: number;
  custId: number;
  displayName: string;
  eventCode: number;
  eventDescription: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'incident' | 'flag' | 'penalty' | 'system' | 'pit' | 'other';
  timestamp: string;
  participants?: string[];
}

export interface EventStats {
  totalEvents: number;
  incidents: number;
  penalties: number;
  yellowFlags: number;
  redFlags: number;
  mostActiveDriver: string;
  mostIncidentLap: number;
}

interface RaceEventsLogProps {
  subsessionId: number;
  simsessionNumber?: number;
  showFilters?: boolean;
  showExport?: boolean;
  maxHeight?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Event code mappings based on iRacing documentation
const EVENT_CODES = {
  // Incidents
  0: { name: 'Contact', category: 'incident', severity: 'warning' },
  1: { name: 'Loss of Control', category: 'incident', severity: 'warning' },
  2: { name: 'Off Track', category: 'incident', severity: 'info' },
  3: { name: 'Contact with Environment', category: 'incident', severity: 'warning' },
  4: { name: 'Car Contact', category: 'incident', severity: 'critical' },
  
  // Flags
  10: { name: 'Green Flag', category: 'flag', severity: 'info' },
  11: { name: 'Yellow Flag', category: 'flag', severity: 'warning' },
  12: { name: 'Red Flag', category: 'flag', severity: 'critical' },
  13: { name: 'Checkered Flag', category: 'flag', severity: 'info' },
  14: { name: 'White Flag', category: 'flag', severity: 'info' },
  
  // Penalties
  20: { name: 'Drive Through Penalty', category: 'penalty', severity: 'warning' },
  21: { name: 'Stop and Go Penalty', category: 'penalty', severity: 'critical' },
  22: { name: 'Time Penalty', category: 'penalty', severity: 'warning' },
  23: { name: 'Disqualification', category: 'penalty', severity: 'critical' },
  
  // Pit Events
  30: { name: 'Pit Entry', category: 'pit', severity: 'info' },
  31: { name: 'Pit Exit', category: 'pit', severity: 'info' },
  32: { name: 'Pit Service', category: 'pit', severity: 'info' },
  
  // System Events
  40: { name: 'Session Start', category: 'system', severity: 'info' },
  41: { name: 'Session End', category: 'system', severity: 'info' },
  42: { name: 'Driver Change', category: 'system', severity: 'info' },
  
  // Default
  999: { name: 'Unknown Event', category: 'other', severity: 'info' },
} as const;

export const RaceEventsLog: React.FC<RaceEventsLogProps> = ({
  subsessionId,
  simsessionNumber = 0,
  showFilters = true,
  showExport = true,
  maxHeight = '600px',
  autoRefresh = false,
  refreshInterval = 30000,
}) => {
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [lapChartData, setLapChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [showOnlyIncidents, setShowOnlyIncidents] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch event data
  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [eventLogResponse, lapChartResponse] = await Promise.all([
        getResultsEventLog(subsessionId, simsessionNumber),
        getResultsLapChartData(subsessionId, simsessionNumber)
      ]);

      if (eventLogResponse && eventLogResponse.eventLog) {
        const transformedEvents = eventLogResponse.eventLog.map(event => {
          const eventCode = event.eventCode || 999;
          const eventInfo = EVENT_CODES[eventCode as keyof typeof EVENT_CODES] || EVENT_CODES[999];
          
          return {
            eventSeq: event.eventSeq,
            sessionTime: event.sessionTime,
            lapNumber: event.lapNumber,
            custId: event.custId,
            displayName: event.displayName || 'Unknown Driver',
            eventCode: eventCode,
            eventDescription: eventInfo.name,
            message: event.message || event.description || eventInfo.name,
            severity: eventInfo.severity,
            category: eventInfo.category,
            timestamp: new Date(event.sessionTime * 1000).toISOString(),
          } as RaceEvent;
        });

        setEvents(transformedEvents);
      } else {
        setEvents([]);
      }

      if (lapChartResponse && lapChartResponse.lapChartData) {
        setLapChartData(lapChartResponse.lapChartData);
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching event data:', err);
      setError('Failed to load race events. Please try again.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEventData();
  }, [subsessionId, simsessionNumber]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchEventData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, subsessionId, simsessionNumber]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.displayName.toLowerCase().includes(term) ||
        event.message.toLowerCase().includes(term) ||
        event.eventDescription.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }

    // Severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(event => event.severity === selectedSeverity);
    }

    // Driver filter
    if (selectedDriver !== 'all') {
      filtered = filtered.filter(event => event.displayName === selectedDriver);
    }

    // Incidents only filter
    if (showOnlyIncidents) {
      filtered = filtered.filter(event => 
        event.category === 'incident' || event.category === 'penalty'
      );
    }

    return filtered.sort((a, b) => a.sessionTime - b.sessionTime);
  }, [events, searchTerm, selectedCategory, selectedSeverity, selectedDriver, showOnlyIncidents]);

  // Event statistics
  const eventStats = useMemo((): EventStats => {
    const stats = {
      totalEvents: events.length,
      incidents: events.filter(e => e.category === 'incident').length,
      penalties: events.filter(e => e.category === 'penalty').length,
      yellowFlags: events.filter(e => e.eventCode === 11).length,
      redFlags: events.filter(e => e.eventCode === 12).length,
      mostActiveDriver: '',
      mostIncidentLap: 0,
    };

    // Find most active driver (most events)
    const driverCounts = events.reduce((acc, event) => {
      acc[event.displayName] = (acc[event.displayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(driverCounts).length > 0) {
      stats.mostActiveDriver = Object.entries(driverCounts)
        .sort(([,a], [,b]) => b - a)[0][0];
    }

    // Find most incident-heavy lap
    const lapCounts = events
      .filter(e => e.category === 'incident')
      .reduce((acc, event) => {
        acc[event.lapNumber] = (acc[event.lapNumber] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

    if (Object.keys(lapCounts).length > 0) {
      stats.mostIncidentLap = Number(Object.entries(lapCounts)
        .sort(([,a], [,b]) => b - a)[0][0]);
    }

    return stats;
  }, [events]);

  // Get unique values for filters
  const uniqueDrivers = useMemo(() => 
    [...new Set(events.map(e => e.displayName))].sort(),
    [events]
  );

  const formatSessionTime = (sessionTime: number) => {
    const totalSeconds = Math.floor(sessionTime);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity: RaceEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: RaceEvent['category']) => {
    switch (category) {
      case 'incident': return <AlertTriangle className="h-4 w-4" />;
      case 'flag': return <Flag className="h-4 w-4" />;
      case 'penalty': return <Zap className="h-4 w-4" />;
      case 'pit': return <Car className="h-4 w-4" />;
      case 'system': return <Timer className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const exportEvents = () => {
    const csvContent = [
      'Time,Lap,Driver,Event,Category,Severity,Message',
      ...filteredEvents.map(event =>
        [
          formatSessionTime(event.sessionTime),
          event.lapNumber,
          `"${event.displayName}"`,
          `"${event.eventDescription}"`,
          event.category,
          event.severity,
          `"${event.message}"`,
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `race_events_${subsessionId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Loading race events...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchEventData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header with Statistics */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Race Events Log</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Session events and incidents for subsession {subsessionId}
              </p>
            </div>
            <div className="flex space-x-2">
              {showExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportEvents}
                  disabled={filteredEvents.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEventData}
              >
                <Timer className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{eventStats.totalEvents}</div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{eventStats.incidents}</div>
              <div className="text-sm text-muted-foreground">Incidents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{eventStats.penalties}</div>
              <div className="text-sm text-muted-foreground">Penalties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{eventStats.yellowFlags}</div>
              <div className="text-sm text-muted-foreground">Yellow Flags</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{eventStats.redFlags}</div>
              <div className="text-sm text-muted-foreground">Red Flags</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">Lap {eventStats.mostIncidentLap || 'N/A'}</div>
              <div className="text-sm text-muted-foreground">Most Incidents</div>
            </div>
          </div>
          
          {lastUpdate && (
            <p className="text-xs text-muted-foreground mt-4">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Events</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="incident">Incidents</option>
                  <option value="flag">Flags</option>
                  <option value="penalty">Penalties</option>
                  <option value="pit">Pit Events</option>
                  <option value="system">System</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="all">All Severities</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Driver</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="all">All Drivers</option>
                  {uniqueDrivers.map(driver => (
                    <option key={driver} value={driver}>{driver}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Filter</label>
                <Button
                  variant={showOnlyIncidents ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyIncidents(!showOnlyIncidents)}
                  className="w-full"
                >
                  {showOnlyIncidents ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                  Incidents Only
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Events Timeline ({filteredEvents.length} events)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div 
            className="max-h-[600px] overflow-y-auto"
            style={{ maxHeight }}
          >
            {filteredEvents.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                {events.length === 0 
                  ? 'No events found for this session.'
                  : 'No events match the current filters.'
                }
              </div>
            ) : (
              <div className="divide-y">
                {filteredEvents.map((event, index) => (
                  <div key={`${event.eventSeq}-${index}`} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 flex items-center space-x-3">
                        <div className={`w-1 h-12 rounded-full ${getSeverityColor(event.severity)}`}></div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Lap</div>
                          <div className="font-medium">{event.lapNumber}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Time</div>
                          <div className="font-mono text-sm">{formatSessionTime(event.sessionTime)}</div>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="flex items-center space-x-1">
                            {getCategoryIcon(event.category)}
                            <span className="font-medium">{event.eventDescription}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {event.category}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs text-white ${getSeverityColor(event.severity)}`}
                          >
                            {event.severity}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{event.displayName}</span>
                        </div>
                        
                        {event.message && event.message !== event.eventDescription && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RaceEventsLog;