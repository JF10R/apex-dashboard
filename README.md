# Apex Stats: Your iRacing Performance Dashboard

Apex Stats is a modern, data-driven web application that provides comprehensive analysis and visualization of iRacing driver performance. Built with the latest web technologies and integrated with the official iRacing API, it offers detailed statistics, historical trend analysis, and AI-powered insights to help drivers understand their racing performance.

## ✨ Features

### 🏎️ Driver Analysis
- **Comprehensive Driver Dashboard**: Complete overview of iRacing career statistics including iRating, Safety Rating, and race pace trends
- **Historical Charts**: Interactive visualizations showing performance progression over time
- **Advanced Filtering**: Filter data by year, season, car category, tracks, and specific vehicles
- **Performance Insights**: Detailed statistical analysis and performance summaries

### 🏁 Race Analysis
- **Detailed Race Results**: Complete race breakdowns with all participant data
- **Progressive Loading**: Real-time streaming of race data with live progress indicators
- **Lap-by-Lap Analysis**: Individual lap times and performance metrics with intelligent caching
- **Enhanced Statistics**: Average lap times, incident analysis, and strength of field calculations
- **Navigation Integration**: Seamless navigation between driver profiles and race results

### 👥 Driver Management
- **Driver Search**: Find and explore any iRacing driver by name
- **Tracked Drivers**: Save and manage your favorite drivers for quick access
- **Driver Comparison**: Side-by-side performance comparisons with combined history analysis

### 🎨 User Experience
- **Modern UI**: Clean, responsive design optimized for data visualization
- **Dark/Light Mode**: Theme toggle for comfortable viewing
- **Progressive Loading**: Streaming data updates with real-time progress indicators
- **Intelligent Caching**: Multi-level performance optimization (race results + individual lap data)
- **Real-time Data**: Live integration with iRacing API for up-to-date information
- **Mobile Responsive**: Optimized experience across all device sizes

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with comprehensive type safety
- **Styling**: Tailwind CSS with shadcn/ui components
- **Data**: Official iRacing API integration with `iracing-api` package
- **Validation**: Zod schemas for runtime type checking
- **State Management**: React hooks with optimized caching

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- An active iRacing subscription
- Your iRacing login credentials

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd apex-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   # iRacing API Credentials
   IRACING_EMAIL=your_iracing_email@example.com
   IRACING_PASSWORD=your_iracing_password
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:9002`

## 📡 API Integration

This application uses the official iRacing API through the `iracing-api` TypeScript package. All data is fetched in real-time and includes:

- Driver statistics and historical data
- Race results and detailed lap analysis  
- Car and track information
- Series and season data

### Authentication Notes
- The app automatically handles iRacing API authentication
- If CAPTCHA verification is required, you'll see helpful instructions
- All API calls include proper error handling and user feedback

## 🏗️ Architecture

### Type Safety
- **Official API Interfaces**: Complete TypeScript interfaces matching the iRacing API
- **Zod Validation**: Runtime validation for all API responses
- **Data Transformation**: Utilities for converting API data to application formats

### Performance
- **Multi-Level Caching**: Race results cached for 1 hour, individual lap data cached separately
- **Progressive Loading**: Real-time streaming of race data with Server-Sent Events
- **Background Processing**: Non-blocking data fetching with live progress updates
- **Efficient Updates**: Minimal API calls with smart data aggregation and cache management

### Code Quality
- **TypeScript**: Full type coverage with strict mode
- **Component Architecture**: Modular, reusable React components
- **Error Boundaries**: Comprehensive error handling and user feedback

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── [custId]/          # Dynamic driver profile pages
│   ├── race/[raceId]/     # Race detail pages
│   ├── compare/           # Driver comparison tool
│   └── api/               # API endpoints
├── components/            # Reusable UI components
├── lib/                   # Core utilities and API integration
│   ├── iracing-types.ts   # TypeScript interfaces & Zod schemas
│   ├── iracing-api-core.ts # Core API implementation
│   └── iracing-data-transform.ts # Data transformation utilities
├── hooks/                 # Custom React hooks
└── components/            # UI components and charts
```

## 🔧 Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Key Features for Developers
- **Hot Reload**: Instant updates during development
- **Type Checking**: Comprehensive TypeScript validation
- **Progressive Loading**: Streaming APIs with Server-Sent Events for real-time updates
- **Caching System**: Multi-level caching with TTL management and cache statistics
- **API Documentation**: Detailed interface documentation in `/IRACING_API_INTERFACES.md`

## 📋 TODO - Features Not Yet Implemented

### 🏎️ **Race Analysis & Statistics**
- [ ] **Live Timing Data**: Real-time race progression and telemetry during active sessions
- [ ] **Detailed Telemetry**: Sector times, speed traps, and corner-by-corner analysis
- [ ] **Weather Impact Analysis**: Track conditions effect on lap times and strategy
- [ ] **Track-Specific Analytics**: Corner speed analysis and racing line optimization
- [ ] **Setup Analysis**: Car setup impact on performance metrics

### 📊 **Advanced Performance Features**
- [ ] **League Integration**: Custom league standings and championship points
- [ ] **World Records Integration**: Official track records and personal bests comparison
- [ ] **Season Statistics**: Complete championship standings and points progression
- [ ] **Team/Multi-Class Analysis**: Team performance tracking and class-specific metrics
- [ ] **Consistency Metrics**: Lap time variance and race pace consistency analysis

### 🎯 **User Experience Enhancements**
- [ ] **Favorites System**: Save favorite tracks, series, and race configurations
- [ ] **Custom Dashboards**: Personalized metric displays and layout preferences
- [ ] **Notification System**: Alerts for friends' races, personal records, and followed series
- [ ] **Export Features**: PDF reports, CSV data export, and sharing capabilities
- [ ] **Mobile App**: Native mobile application for iOS and Android

### 🔄 **API & Data Integration**
- [ ] **Historical Data Import**: Import and analyze years of historical race data
- [ ] **External Tool Integration**: Connect with popular sim racing tools and telemetry software
- [ ] **Social Features**: Follow other drivers, share achievements, and community features
- [ ] **Multi-Sim Support**: Integration with other racing simulators beyond iRacing
- [ ] **Data Backup & Sync**: Cloud backup and cross-device synchronization

### 🛠️ **Technical Improvements**
- [ ] **Offline Mode**: Basic functionality when internet connection is unavailable
- [ ] **Advanced Caching**: Persistent cache across sessions and intelligent prefetching
- [ ] **Performance Monitoring**: Real-time performance metrics and optimization insights
- [ ] **Error Recovery**: Advanced error handling and automatic retry mechanisms
- [ ] **Database Integration**: Move from API-only to hybrid API/database architecture

### 📱 **Platform Expansion**
- [ ] **Desktop Application**: Electron-based desktop app with enhanced features
- [ ] **Browser Extension**: Quick access to driver stats from iRacing website
- [ ] **Discord Bot**: Server integration for league and team functionality
- [ ] **Streaming Integration**: OBS plugins for live streaming race data overlays

---

**Note**: This TODO list represents planned future enhancements. The current application provides a solid foundation with core driver analysis, race data visualization, and comprehensive performance insights. Features are prioritized based on user feedback and iRacing API capabilities.

---

## 🤝 Contributing

This project maintains high code quality standards:
- All API data is properly typed and validated
- Components are modular and reusable
- Error handling is comprehensive and user-friendly
- Performance is optimized through intelligent caching

## 📝 License

This project is for educational and personal use. Please respect iRacing's Terms of Service when using their API.

## ⚠️ Important Notes

- **iRacing Subscription Required**: You must have an active iRacing subscription to use this application
- **CAPTCHA Handling**: Occasionally, iRacing may require CAPTCHA verification - follow the on-screen instructions
- **Rate Limiting**: The application includes intelligent rate limiting to respect iRacing's API guidelines
- **Data Accuracy**: All data is sourced directly from iRacing's official API for maximum accuracy
