/**
 * Data Export Module
 * 
 * Provides comprehensive data export functionality for external analysis:
 * - CSV exports for spreadsheet analysis
 * - JSON exports for programmatic use
 * - PDF reports for presentations
 * - Custom filtered exports
 */

import { Driver, RecentRace, RaceParticipant, HistoryPoint } from '@/lib/iracing-types';
import { SeasonStandingEntry } from '@/lib/iracing-standings';

// Export format types
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'xlsx';

// Export data types
export type ExportDataType = 'races' | 'standings' | 'driver_profile' | 'performance_analysis' | 'lap_times' | 'incidents';

// Export options interface
export interface ExportOptions {
  format: ExportFormat;
  dataType: ExportDataType;
  filename?: string;
  includeMetadata?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: {
    series?: string[];
    tracks?: string[];
    cars?: string[];
    categories?: string[];
    minSOF?: number;
    maxSOF?: number;
  };
  columns?: string[];
}

// Metadata interface
export interface ExportMetadata {
  exportDate: string;
  dataSource: string;
  driverName?: string;
  custId?: number;
  totalRecords: number;
  filters?: any;
  generatedBy: string;
}

class DataExportManager {
  private readonly APP_NAME = 'Apex Dashboard';
  private readonly VERSION = '2.0.0';

  /**
   * Export driver race data
   */
  async exportRaceData(
    races: RecentRace[],
    options: ExportOptions
  ): Promise<void> {
    const filteredRaces = this.filterRaceData(races, options);
    const metadata = this.createMetadata('Race Data', filteredRaces.length, options);

    switch (options.format) {
      case 'csv':
        await this.exportRacesToCSV(filteredRaces, metadata, options);
        break;
      case 'json':
        await this.exportRacesToJSON(filteredRaces, metadata, options);
        break;
      case 'xlsx':
        await this.exportRacesToXLSX(filteredRaces, metadata, options);
        break;
      case 'pdf':
        await this.exportRacesToPDF(filteredRaces, metadata, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export driver profile data
   */
  async exportDriverProfile(
    driver: Driver,
    options: ExportOptions
  ): Promise<void> {
    const metadata = this.createMetadata('Driver Profile', 1, options, driver.name, driver.id);

    const profileData = {
      driverInfo: {
        name: driver.name,
        custId: driver.id,
        currentIRating: driver.currentIRating,
        currentSafetyRating: driver.currentSafetyRating,
        avgRacePace: driver.avgRacePace,
      },
      iratingHistory: this.flattenHistoryData(driver.iratingHistories),
      safetyRatingHistory: driver.safetyRatingHistory,
      racePaceHistory: driver.racePaceHistory,
      recentRaces: driver.recentRaces,
      statistics: this.calculateDriverStats(driver),
    };

    switch (options.format) {
      case 'csv':
        await this.exportDriverProfileToCSV(profileData, metadata, options);
        break;
      case 'json':
        await this.exportDriverProfileToJSON(profileData, metadata, options);
        break;
      case 'xlsx':
        await this.exportDriverProfileToXLSX(profileData, metadata, options);
        break;
      case 'pdf':
        await this.exportDriverProfileToPDF(profileData, metadata, options);
        break;
    }
  }

  /**
   * Export standings data
   */
  async exportStandingsData(
    standings: SeasonStandingEntry[],
    seasonName: string,
    options: ExportOptions
  ): Promise<void> {
    const filteredStandings = this.filterStandingsData(standings, options);
    const metadata = this.createMetadata(`${seasonName} Standings`, filteredStandings.length, options);

    switch (options.format) {
      case 'csv':
        await this.exportStandingsToCSV(filteredStandings, metadata, options);
        break;
      case 'json':
        await this.exportStandingsToJSON(filteredStandings, metadata, options);
        break;
      case 'xlsx':
        await this.exportStandingsToXLSX(filteredStandings, metadata, options);
        break;
      case 'pdf':
        await this.exportStandingsToPDF(filteredStandings, seasonName, metadata, options);
        break;
    }
  }

  /**
   * Export performance analysis
   */
  async exportPerformanceAnalysis(
    driver: Driver,
    options: ExportOptions
  ): Promise<void> {
    const analysis = this.generatePerformanceAnalysis(driver, options);
    const metadata = this.createMetadata('Performance Analysis', analysis.totalRaces, options, driver.name, driver.id);

    switch (options.format) {
      case 'csv':
        await this.exportAnalysisToCSV(analysis, metadata, options);
        break;
      case 'json':
        await this.exportAnalysisToJSON(analysis, metadata, options);
        break;
      case 'xlsx':
        await this.exportAnalysisToXLSX(analysis, metadata, options);
        break;
      case 'pdf':
        await this.exportAnalysisToPDF(analysis, metadata, options);
        break;
    }
  }

  // Private helper methods

  private filterRaceData(races: RecentRace[], options: ExportOptions): RecentRace[] {
    let filtered = [...races];

    // Date range filter
    if (options.dateRange) {
      filtered = filtered.filter(race => {
        const raceDate = new Date(race.date);
        return raceDate >= options.dateRange!.start && raceDate <= options.dateRange!.end;
      });
    }

    // Series filter
    if (options.filters?.series && options.filters.series.length > 0) {
      filtered = filtered.filter(race => 
        options.filters!.series!.some(series => 
          race.seriesName.toLowerCase().includes(series.toLowerCase())
        )
      );
    }

    // Track filter
    if (options.filters?.tracks && options.filters.tracks.length > 0) {
      filtered = filtered.filter(race => 
        options.filters!.tracks!.some(track => 
          race.trackName.toLowerCase().includes(track.toLowerCase())
        )
      );
    }

    // Car filter
    if (options.filters?.cars && options.filters.cars.length > 0) {
      filtered = filtered.filter(race => 
        options.filters!.cars!.some(car => 
          race.car.toLowerCase().includes(car.toLowerCase())
        )
      );
    }

    // Category filter
    if (options.filters?.categories && options.filters.categories.length > 0) {
      filtered = filtered.filter(race => 
        options.filters!.categories!.includes(race.category)
      );
    }

    // SOF filters
    if (options.filters?.minSOF) {
      filtered = filtered.filter(race => race.strengthOfField >= options.filters!.minSOF!);
    }

    if (options.filters?.maxSOF) {
      filtered = filtered.filter(race => race.strengthOfField <= options.filters!.maxSOF!);
    }

    return filtered;
  }

  private filterStandingsData(standings: SeasonStandingEntry[], options: ExportOptions): SeasonStandingEntry[] {
    let filtered = [...standings];

    // Add any standings-specific filters here
    return filtered;
  }

  private createMetadata(
    dataType: string,
    recordCount: number,
    options: ExportOptions,
    driverName?: string,
    custId?: number
  ): ExportMetadata {
    return {
      exportDate: new Date().toISOString(),
      dataSource: this.APP_NAME,
      driverName,
      custId,
      totalRecords: recordCount,
      filters: options.filters,
      generatedBy: `${this.APP_NAME} v${this.VERSION}`,
    };
  }

  private async exportRacesToCSV(
    races: RecentRace[],
    metadata: ExportMetadata,
    options: ExportOptions
  ): Promise<void> {
    const headers = options.columns || [
      'Date',
      'Series',
      'Track',
      'Car',
      'Category',
      'Start Position',
      'Finish Position',
      'Incidents',
      'iRating Change',
      'SR Change',
      'SOF',
      'Laps Led',
      'Fastest Lap',
      'Avg Lap Time',
    ];

    const csvRows = [
      headers.join(','),
      ...races.map(race => [
        new Date(race.date).toLocaleDateString(),
        this.escapeCsvValue(race.seriesName),
        this.escapeCsvValue(race.trackName),
        this.escapeCsvValue(race.car),
        race.category,
        race.startPosition,
        race.finishPosition,
        race.incidents,
        race.iratingChange,
        race.safetyRatingChange,
        race.strengthOfField,
        race.lapsLed,
        race.fastestLap,
        race.avgLapTime,
      ].join(','))
    ];

    if (options.includeMetadata) {
      csvRows.unshift(
        `# ${metadata.generatedBy}`,
        `# Export Date: ${metadata.exportDate}`,
        `# Driver: ${metadata.driverName || 'N/A'}`,
        `# Total Records: ${metadata.totalRecords}`,
        '#'
      );
    }

    const csvContent = csvRows.join('\n');
    const filename = options.filename || `race_data_${new Date().toISOString().split('T')[0]}.csv`;
    
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  private async exportRacesToJSON(
    races: RecentRace[],
    metadata: ExportMetadata,
    options: ExportOptions
  ): Promise<void> {
    const jsonData = {
      metadata: options.includeMetadata ? metadata : undefined,
      races: races,
    };

    const filename = options.filename || `race_data_${new Date().toISOString().split('T')[0]}.json`;
    this.downloadFile(JSON.stringify(jsonData, null, 2), filename, 'application/json');
  }

  private async exportDriverProfileToCSV(
    profileData: any,
    metadata: ExportMetadata,
    options: ExportOptions
  ): Promise<void> {
    // Create separate CSV sections for different data types
    const sections = [
      '# Driver Information',
      `Name,${profileData.driverInfo.name}`,
      `Customer ID,${profileData.driverInfo.custId}`,
      `Current iRating,${profileData.driverInfo.currentIRating}`,
      `Current Safety Rating,${profileData.driverInfo.currentSafetyRating}`,
      `Average Race Pace,${profileData.driverInfo.avgRacePace}`,
      '',
      '# iRating History',
      'Month,Category,iRating',
      ...this.flattenHistoryForCSV(profileData.iratingHistory),
      '',
      '# Recent Races',
      'Date,Series,Track,Car,Start,Finish,Incidents,iRating Change,SR Change',
      ...profileData.recentRaces.map((race: RecentRace) => 
        [
          new Date(race.date).toLocaleDateString(),
          this.escapeCsvValue(race.seriesName),
          this.escapeCsvValue(race.trackName),
          this.escapeCsvValue(race.car),
          race.startPosition,
          race.finishPosition,
          race.incidents,
          race.iratingChange,
          race.safetyRatingChange,
        ].join(',')
      ),
    ];

    const csvContent = sections.join('\n');
    const filename = options.filename || `driver_profile_${profileData.driverInfo.custId}_${new Date().toISOString().split('T')[0]}.csv`;
    
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  private async exportDriverProfileToJSON(
    profileData: any,
    metadata: ExportMetadata,
    options: ExportOptions
  ): Promise<void> {
    const jsonData = {
      metadata: options.includeMetadata ? metadata : undefined,
      profile: profileData,
    };

    const filename = options.filename || `driver_profile_${profileData.driverInfo.custId}_${new Date().toISOString().split('T')[0]}.json`;
    this.downloadFile(JSON.stringify(jsonData, null, 2), filename, 'application/json');
  }

  private async exportStandingsToCSV(
    standings: SeasonStandingEntry[],
    metadata: ExportMetadata,
    options: ExportOptions
  ): Promise<void> {
    const headers = [
      'Position',
      'Driver',
      'Division',
      'Club',
      'Country',
      'Points',
      'Starts',
      'Wins',
      'Top 5s',
      'Poles',
      'Avg Start',
      'Avg Finish',
      'Laps',
      'Laps Led',
      'Incidents',
      'iRating',
      'Safety Rating',
    ];

    const csvRows = [
      headers.join(','),
      ...standings.map(entry => [
        entry.position,
        this.escapeCsvValue(entry.display_name),
        entry.division_name,
        this.escapeCsvValue(entry.club_name),
        entry.country_code,
        entry.points,
        entry.starts,
        entry.wins,
        entry.top5,
        entry.poles,
        entry.avg_start_position.toFixed(1),
        entry.avg_finish_position.toFixed(1),
        entry.laps,
        entry.laps_led,
        entry.incidents,
        entry.irating,
        entry.safety_rating.toFixed(2),
      ].join(','))
    ];

    if (options.includeMetadata) {
      csvRows.unshift(
        `# ${metadata.generatedBy}`,
        `# Export Date: ${metadata.exportDate}`,
        `# Total Records: ${metadata.totalRecords}`,
        '#'
      );
    }

    const csvContent = csvRows.join('\n');
    const filename = options.filename || `standings_${new Date().toISOString().split('T')[0]}.csv`;
    
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  private async exportStandingsToJSON(
    standings: SeasonStandingEntry[],
    metadata: ExportMetadata,
    options: ExportOptions
  ): Promise<void> {
    const jsonData = {
      metadata: options.includeMetadata ? metadata : undefined,
      standings: standings,
    };

    const filename = options.filename || `standings_${new Date().toISOString().split('T')[0]}.json`;
    this.downloadFile(JSON.stringify(jsonData, null, 2), filename, 'application/json');
  }

  // Placeholder methods for XLSX and PDF exports (would require additional libraries)
  private async exportRacesToXLSX(races: RecentRace[], metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    console.warn('XLSX export not yet implemented - falling back to CSV');
    await this.exportRacesToCSV(races, metadata, { ...options, format: 'csv' });
  }

  private async exportRacesToPDF(races: RecentRace[], metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    console.warn('PDF export not yet implemented - falling back to JSON');
    await this.exportRacesToJSON(races, metadata, { ...options, format: 'json' });
  }

  private async exportDriverProfileToXLSX(profileData: any, metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    console.warn('XLSX export not yet implemented - falling back to CSV');
    await this.exportDriverProfileToCSV(profileData, metadata, { ...options, format: 'csv' });
  }

  private async exportDriverProfileToPDF(profileData: any, metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    console.warn('PDF export not yet implemented - falling back to JSON');
    await this.exportDriverProfileToJSON(profileData, metadata, { ...options, format: 'json' });
  }

  private async exportStandingsToXLSX(standings: SeasonStandingEntry[], metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    console.warn('XLSX export not yet implemented - falling back to CSV');
    await this.exportStandingsToCSV(standings, metadata, { ...options, format: 'csv' });
  }

  private async exportStandingsToPDF(standings: SeasonStandingEntry[], seasonName: string, metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    console.warn('PDF export not yet implemented - falling back to JSON');
    await this.exportStandingsToJSON(standings, metadata, { ...options, format: 'json' });
  }

  // Analysis methods
  private generatePerformanceAnalysis(driver: Driver, options: ExportOptions): any {
    const races = this.filterRaceData(driver.recentRaces, options);
    
    const analysis = {
      driverName: driver.name,
      custId: driver.id,
      totalRaces: races.length,
      winPercentage: (races.filter(r => r.finishPosition === 1).length / races.length * 100).toFixed(2),
      top5Percentage: (races.filter(r => r.finishPosition <= 5).length / races.length * 100).toFixed(2),
      averageStartPosition: (races.reduce((sum, r) => sum + r.startPosition, 0) / races.length).toFixed(2),
      averageFinishPosition: (races.reduce((sum, r) => sum + r.finishPosition, 0) / races.length).toFixed(2),
      averageIncidents: (races.reduce((sum, r) => sum + r.incidents, 0) / races.length).toFixed(2),
      averageSOF: (races.reduce((sum, r) => sum + r.strengthOfField, 0) / races.length).toFixed(0),
      totalLapsLed: races.reduce((sum, r) => sum + r.lapsLed, 0),
      bestFinish: Math.min(...races.map(r => r.finishPosition)),
      worstFinish: Math.max(...races.map(r => r.finishPosition)),
      iratingGain: races.reduce((sum, r) => sum + (typeof r.iratingChange === 'number' ? r.iratingChange : 0), 0),
      racesByCategory: this.groupRacesByCategory(races),
      racesBySeries: this.groupRacesBySeries(races),
      racesByTrack: this.groupRacesByTrack(races),
    };

    return analysis;
  }

  private async exportAnalysisToCSV(analysis: any, metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    const sections = [
      '# Performance Analysis Summary',
      `Driver,${analysis.driverName}`,
      `Customer ID,${analysis.custId}`,
      `Total Races,${analysis.totalRaces}`,
      `Win Percentage,${analysis.winPercentage}%`,
      `Top 5 Percentage,${analysis.top5Percentage}%`,
      `Average Start Position,${analysis.averageStartPosition}`,
      `Average Finish Position,${analysis.averageFinishPosition}`,
      `Average Incidents,${analysis.averageIncidents}`,
      `Average SOF,${analysis.averageSOF}`,
      `Total Laps Led,${analysis.totalLapsLed}`,
      `Best Finish,${analysis.bestFinish}`,
      `Worst Finish,${analysis.worstFinish}`,
      `Total iRating Change,${analysis.iratingGain}`,
      '',
      '# Races by Category',
      'Category,Count,Win %,Avg Finish',
      ...Object.entries(analysis.racesByCategory).map(([category, data]: [string, any]) =>
        `${category},${data.count},${data.winPercentage}%,${data.avgFinish}`
      ),
      '',
      '# Top Series',
      'Series,Count,Win %,Avg Finish',
      ...Object.entries(analysis.racesBySeries)
        .sort(([,a]: [string, any], [,b]: [string, any]) => b.count - a.count)
        .slice(0, 10)
        .map(([series, data]: [string, any]) =>
          `${this.escapeCsvValue(series)},${data.count},${data.winPercentage}%,${data.avgFinish}`
        ),
    ];

    const csvContent = sections.join('\n');
    const filename = options.filename || `performance_analysis_${analysis.custId}_${new Date().toISOString().split('T')[0]}.csv`;
    
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  private async exportAnalysisToJSON(analysis: any, metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    const jsonData = {
      metadata: options.includeMetadata ? metadata : undefined,
      analysis: analysis,
    };

    const filename = options.filename || `performance_analysis_${analysis.custId}_${new Date().toISOString().split('T')[0]}.json`;
    this.downloadFile(JSON.stringify(jsonData, null, 2), filename, 'application/json');
  }

  private async exportAnalysisToXLSX(analysis: any, metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    console.warn('XLSX export not yet implemented - falling back to CSV');
    await this.exportAnalysisToCSV(analysis, metadata, { ...options, format: 'csv' });
  }

  private async exportAnalysisToPDF(analysis: any, metadata: ExportMetadata, options: ExportOptions): Promise<void> {
    console.warn('PDF export not yet implemented - falling back to JSON');
    await this.exportAnalysisToJSON(analysis, metadata, { ...options, format: 'json' });
  }

  // Utility methods
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private flattenHistoryData(histories: Record<string, HistoryPoint[]>): Array<{month: string, category: string, value: number}> {
    const flattened = [];
    for (const [category, points] of Object.entries(histories)) {
      for (const point of points) {
        flattened.push({
          month: point.month,
          category,
          value: point.value,
        });
      }
    }
    return flattened;
  }

  private flattenHistoryForCSV(historyData: Array<{month: string, category: string, value: number}>): string[] {
    return historyData.map(item => `${item.month},${item.category},${item.value}`);
  }

  private calculateDriverStats(driver: Driver): any {
    const races = driver.recentRaces;
    return {
      totalRaces: races.length,
      wins: races.filter(r => r.finishPosition === 1).length,
      podiums: races.filter(r => r.finishPosition <= 3).length,
      top5s: races.filter(r => r.finishPosition <= 5).length,
      averageFinish: races.length > 0 ? (races.reduce((sum, r) => sum + r.finishPosition, 0) / races.length).toFixed(2) : 'N/A',
      totalIncidents: races.reduce((sum, r) => sum + r.incidents, 0),
      averageIncidents: races.length > 0 ? (races.reduce((sum, r) => sum + r.incidents, 0) / races.length).toFixed(2) : 'N/A',
    };
  }

  private groupRacesByCategory(races: RecentRace[]): any {
    const grouped: any = {};
    
    races.forEach(race => {
      if (!grouped[race.category]) {
        grouped[race.category] = { races: [], count: 0, wins: 0 };
      }
      grouped[race.category].races.push(race);
      grouped[race.category].count++;
      if (race.finishPosition === 1) {
        grouped[race.category].wins++;
      }
    });

    // Calculate percentages and averages
    Object.values(grouped).forEach((group: any) => {
      group.winPercentage = ((group.wins / group.count) * 100).toFixed(1);
      group.avgFinish = (group.races.reduce((sum: number, r: RecentRace) => sum + r.finishPosition, 0) / group.count).toFixed(1);
    });

    return grouped;
  }

  private groupRacesBySeries(races: RecentRace[]): any {
    const grouped: any = {};
    
    races.forEach(race => {
      const series = race.seriesName;
      if (!grouped[series]) {
        grouped[series] = { races: [], count: 0, wins: 0 };
      }
      grouped[series].races.push(race);
      grouped[series].count++;
      if (race.finishPosition === 1) {
        grouped[series].wins++;
      }
    });

    // Calculate percentages and averages
    Object.values(grouped).forEach((group: any) => {
      group.winPercentage = ((group.wins / group.count) * 100).toFixed(1);
      group.avgFinish = (group.races.reduce((sum: number, r: RecentRace) => sum + r.finishPosition, 0) / group.count).toFixed(1);
    });

    return grouped;
  }

  private groupRacesByTrack(races: RecentRace[]): any {
    const grouped: any = {};
    
    races.forEach(race => {
      const track = race.trackName;
      if (!grouped[track]) {
        grouped[track] = { races: [], count: 0, wins: 0 };
      }
      grouped[track].races.push(race);
      grouped[track].count++;
      if (race.finishPosition === 1) {
        grouped[track].wins++;
      }
    });

    // Calculate percentages and averages
    Object.values(grouped).forEach((group: any) => {
      group.winPercentage = ((group.wins / group.count) * 100).toFixed(1);
      group.avgFinish = (group.races.reduce((sum: number, r: RecentRace) => sum + r.finishPosition, 0) / group.count).toFixed(1);
    });

    return grouped;
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);

    console.log(`📁 Downloaded: ${filename} (${(blob.size / 1024).toFixed(1)} KB)`);
  }
}

// Global instance
export const dataExporter = new DataExportManager();

// Convenience functions
export const exportDriverRaces = (races: RecentRace[], options: Partial<ExportOptions> = {}) => {
  return dataExporter.exportRaceData(races, {
    format: 'csv',
    dataType: 'races',
    includeMetadata: true,
    ...options,
  });
};

export const exportDriverProfile = (driver: Driver, options: Partial<ExportOptions> = {}) => {
  return dataExporter.exportDriverProfile(driver, {
    format: 'json',
    dataType: 'driver_profile',
    includeMetadata: true,
    ...options,
  });
};

export const exportSeasonStandings = (standings: SeasonStandingEntry[], seasonName: string, options: Partial<ExportOptions> = {}) => {
  return dataExporter.exportStandingsData(standings, seasonName, {
    format: 'csv',
    dataType: 'standings',
    includeMetadata: true,
    ...options,
  });
};

export const exportPerformanceAnalysis = (driver: Driver, options: Partial<ExportOptions> = {}) => {
  return dataExporter.exportPerformanceAnalysis(driver, {
    format: 'csv',
    dataType: 'performance_analysis',
    includeMetadata: true,
    ...options,
  });
};