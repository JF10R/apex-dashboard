# Claude Code Configuration & Project Documentation

## 🏁 Personal Bests Feature Implementation Plan

### 🎯 **Current Active Feature: Personal Bests**

**Objective**: Implement an iRacing "Personal Bests" feature that displays fastest lap times per car per track layout, enriched with track conditions, weather data, and iRating performance equivalency analysis.

**Status**: Planning Phase Complete ✅ | Implementation Phase Active 🔄

---

## 📋 **Implementation Phases**

### **Phase 1: Data Foundation** (In Progress)
- ✅ Core data structures with track layout awareness
- 🔄 Pure transformation functions to convert race data → personal bests
- ⏳ Series-based grouping logic
- ⏳ Comprehensive unit test coverage

**Key Files to Create/Modify:**
- `src/lib/personal-bests.ts` - Core transformation logic
- `src/lib/personal-bests-types.ts` - Type definitions
- `src/lib/__tests__/personal-bests.test.ts` - Unit tests

### **Phase 2: Performance Analysis** 
- ⏳ iRating equivalency calculation engine
- ⏳ Pace percentile analysis against field strength
- ⏳ Confidence scoring for performance estimates

**Key Files to Create:**
- `src/lib/irating-analyzer.ts` - Performance analysis module
- `src/lib/__tests__/irating-analyzer.test.ts` - Analysis tests

### **Phase 3: UI Components**
- ⏳ Atomic PersonalBest card components
- ⏳ Series section containers  
- ⏳ Expandable detail views for conditions/context

**Key Files to Create:**
- `src/components/personal-best-card.tsx`
- `src/components/personal-bests-series-section.tsx`
- `src/components/personal-bests-detail-modal.tsx`

### **Phase 4: Integration**
- ⏳ Hook into existing driver dashboard data pipeline
- ⏳ Smart caching with timestamp-based invalidation
- ⏳ Navigation from dashboard to personal bests page

**Key Files to Create/Modify:**
- `src/app/personal-bests/[custId]/page.tsx`
- `src/components/driver-dashboard.tsx` (add preview section)

### **Phase 5: Enhancement** 
- ⏳ Progressive loading for less-active series
- ⏳ Advanced filtering and search capabilities
- ⏳ Performance optimizations and error handling

---

## 🏗️ **Technical Architecture**

### **Core Principles Applied**
- **DRY**: Reuse existing `driver.recentRaces` data, zero additional API calls
- **SOLID**: Single-responsibility services with clear separation of concerns  
- **KISS**: Simple state management, atomic component design
- **Atomic Development**: Independently testable phases

### **Data Flow**
```
Existing Driver Data → Transform → Personal Bests → Cache → UI
     ↑                    ↑              ↑         ↑      ↑
[No new API calls]   [Pure functions]  [Smart invalidation] [Progressive loading]
```

### **Key Data Structures**

```typescript
// Track layout identification (accounts for different configurations)
interface TrackLayoutIdentifier {
  trackId: number;
  trackName: string;
  configName: string; // "GP", "Nordschleife", "Historic", etc.
  fullDisplayName: string; // "Nurburgring GP", "Nurburgring Nordschleife"
}

// Personal best per track layout
interface TrackLayoutPersonalBest {
  track: TrackLayoutIdentifier;
  carBests: Map<string, CarPersonalBest>; // Car name -> best times
}

// Series-level organization
interface SeriesPersonalBests {
  seriesName: string;
  seriesId: number;
  category: RaceCategory;
  trackLayoutBests: Map<string, TrackLayoutPersonalBest>; // Track key -> bests
}
```

---

## 🎨 **User Experience Design**

### **Dashboard Integration**
```
Driver Dashboard
├─ Recent Races
├─ Performance History  
└─ Personal Bests Preview ← New section
    "Recent Best: 1:55.044 at Nurburgring GP (Ferrari 296 GT3)"
    [View All Personal Bests →]
```

### **Dedicated Page Layout**
```
Personal Bests - [Driver Name]

🏎️ Sports Car
├─ GT3 Challenge Fixed
│   ├─ Nurburgring GP: 1:55.044 (Ferrari 296 GT3) ⭐ iR: ~2680 (+280)
│   ├─ Spa-Francorchamps: 2:17.334 (McLaren 720S GT3)
│   └─ Monza: 1:46.891 (Porsche 911 GT3 R)
└─ IMSA Series
    └─ Daytona: 1:42.567 (BMW M4 GT3)

🏁 Formula Car
└─ Formula Renault 3.5
    └─ Silverstone GP: 1:38.234 (FR3.5)

[Expandable detail showing weather, track conditions, race context]
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**
- Pure transformation functions (mock race data → personal bests)
- iRating calculation algorithms
- Track layout key generation
- Data aggregation logic

### **Component Tests**  
- Personal best card rendering
- Series section behavior
- Filter and search functionality
- Progressive loading states

### **Integration Tests**
- End-to-end data flow from driver data to UI
- Cache invalidation logic
- API route serialization (if needed)

**Target**: ≥90% test coverage for new modules

---

## 🎯 **Success Metrics**

- **User Engagement**: 40%+ of users click "View Personal Bests" within first week
- **Performance**: <500ms initial load time, <200ms cached load time  
- **Data Accuracy**: 100% correlation with manual iRacing data verification
- **Code Quality**: Zero TypeScript errors, 90%+ test coverage

---

## ⚡ **Build & Development Commands**

### **Development**
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run type-check   # TypeScript compilation check
```

### **Testing**
```bash
npm test             # Run all tests
npm run test:watch   # Watch mode for development
npm run test:coverage # Coverage report
```

### **Code Quality**
```bash
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix linting issues
npm run format       # Prettier formatting
```

---

## 🔧 **Environment Configuration**

### **Required Environment Variables**
```env
# iRacing API Credentials
IRACING_USERNAME=your_username
IRACING_PASSWORD=your_password

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Optional Configuration**
```env
# Cache Configuration
CACHE_TTL_HOURS=4
PERSONAL_BESTS_CACHE_TTL=3600

# Rate Limiting
API_RATE_LIMIT_PER_MINUTE=60
```

---

## 📚 **Key Dependencies**

### **Core**
- Next.js 14+ (App Router)
- TypeScript 5+
- React 18+
- Tailwind CSS

### **Data & API**
- iRacing API wrapper
- Zod for schema validation
- Node cache for caching

### **UI Components**
- Radix UI primitives
- Lucide React icons
- Custom component library

---

## 🚨 **Known Constraints & Limitations**

1. **iRacing API Data Scope**: Limited to recent race history available via API
2. **Rate Limiting**: Careful API usage to avoid hitting iRacing rate limits
3. **Data Freshness**: Personal bests refresh based on new race detection
4. **Track Layout Detection**: Depends on iRacing API providing configName consistently

---

## 🔄 **Current Development Status**

**Last Updated**: [Current Date]

**Active Phase**: Phase 1 - Data Foundation  
**Next Milestone**: Complete pure transformation functions and unit tests  
**Estimated Completion**: Week 1 of implementation

**Recent Progress**:
- ✅ Architecture design and review complete
- ✅ Core data structures defined
- ✅ Technical approach validated
- 🔄 Implementation of transformation functions in progress

---

## 📝 **Development Notes**

### **Important Design Decisions**
1. **Zero Additional API Calls**: Transform existing `driver.recentRaces` data rather than fetching new lap data
2. **Track Layout Awareness**: Use `trackId + configName` to distinguish between track configurations  
3. **Series-Based Grouping**: Organize by actual racing series for better context
4. **Smart Caching**: Only invalidate cache when new races are detected

### **Code Style Preferences**
- Functional programming approach for data transformation
- Atomic component design with single responsibilities
- Comprehensive TypeScript typing
- Pure functions for testability

---

*This document is maintained as the single source of truth for the Personal Bests feature implementation.*