# Apex Stats: Your iRacing Performance Dashboard

## ⚠️ Work in Progress

**This project is currently in active development and some features may not be working as expected.** Please be patient as we continue to improve and refine the application.

## 🙏 Credits & Inspiration

This project was inspired by and built upon the excellent work from:
- [iRacing API TypeScript Package](https://github.com/themich4/iracing-api) by TheMich4
- [Season Summary Dashboard](https://github.com/TheMich4/season-summary) by TheMich4

Special thanks to these projects for providing the foundation and inspiration for this dashboard.

---

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

### 🔐 Advanced Authentication
- **Persistent Sessions**: Up to 4-hour authentication sessions eliminate frequent login prompts
- **Automatic Refresh**: Background session renewal 30 minutes before expiry
- **Smart Retry Logic**: Configurable retry attempts with exponential backoff
- **Session Monitoring**: Real-time session status and configuration management
- **Zero Downtime**: Seamless authentication without blocking user interactions

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

This application uses the official iRacing API through the `iracing-api` TypeScript package with **persistent authentication** for optimal performance. All data is fetched in real-time and includes:

- Driver statistics and historical data
- Race results and detailed lap analysis  
- Car and track information
- Series and season data

### 🔐 Persistent Authentication
The app features an advanced authentication system that:
- **Maintains sessions for up to 4 hours** - eliminating frequent re-authentication
- **Automatically refreshes** sessions 30 minutes before expiry
- **Smart retry logic** with configurable backoff for reliability
- **Background processing** - refresh happens without blocking requests

### ⚙️ Authentication Configuration
Customize authentication behavior via environment variables:

```env
# Optional - Session management (defaults work well)
IRACING_SESSION_DURATION_HOURS=4          # Session lifetime
IRACING_REFRESH_THRESHOLD_MINUTES=30      # Refresh timing
IRACING_MAX_RETRY_ATTEMPTS=3              # Retry attempts
IRACING_ENABLE_SESSION_PERSISTENCE=true   # Enable persistence
```

### Authentication Notes
- **Persistent Sessions**: Authentication automatically lasts up to 4 hours
- **Automatic Recovery**: Smart retry logic handles temporary failures
- **CAPTCHA Handling**: Clear instructions when verification is required
- **Background Refresh**: Sessions refresh automatically without interruption
- **Zero Maintenance**: No manual session management required

## 🏗️ Architecture

### Type Safety
- **Official API Interfaces**: Complete TypeScript interfaces matching the iRacing API
- **Zod Validation**: Runtime validation for all API responses
- **Data Transformation**: Utilities for converting API data to application formats

### Performance
- **Persistent Authentication**: Sessions last up to 4 hours, reducing login overhead by ~95%
- **Multi-Level Caching**: Race results cached for 1 hour, individual lap data cached separately
- **Progressive Loading**: Real-time streaming of race data with Server-Sent Events
- **Background Processing**: Non-blocking data fetching with live progress updates
- **Smart Session Management**: Automatic refresh with configurable timing and retry logic
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
- **Persistent Authentication**: Sessions automatically last up to 4 hours for improved performance
- **CAPTCHA Handling**: Occasionally, iRacing may require CAPTCHA verification - follow the on-screen instructions
- **Rate Limiting**: The application includes intelligent rate limiting to respect iRacing's API guidelines
- **Data Accuracy**: All data is sourced directly from iRacing's official API for maximum accuracy
- **Session Management**: No manual authentication needed - the app handles everything automatically
