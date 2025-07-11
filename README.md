# Apex Stats: Your iRacing Performance Dashboard

Apex Stats is a modern, data-driven web application that provides comprehensive analysis and visualization of iRacing driver performance. Built with the latest web technologies and integrated with the official iRacing API, it offers detailed statistics, historical trend analysis, and AI-powered insights to help drivers understand their racing performance.

## ✨ Features

### 🏎️ Driver Analysis
- **Comprehensive Driver Dashboard**: Complete overview of iRacing career statistics including iRating, Safety Rating, and race pace trends
- **Historical Charts**: Interactive visualizations showing performance progression over time
- **Advanced Filtering**: Filter data by year, season, car category, tracks, and specific vehicles
- **AI-Powered Insights**: GenKit-powered analysis providing qualitative performance summaries

### 🏁 Race Analysis
- **Detailed Race Results**: Complete race breakdowns with all participant data
- **Lap-by-Lap Analysis**: Individual lap times and performance metrics
- **Enhanced Statistics**: Average lap times, incident analysis, and strength of field calculations
- **Navigation Integration**: Seamless navigation between driver profiles and race results

### 👥 Driver Management
- **Driver Search**: Find and explore any iRacing driver by name
- **Tracked Drivers**: Save and manage your favorite drivers for quick access
- **Driver Comparison**: Side-by-side performance comparisons with combined history analysis

### 🎨 User Experience
- **Modern UI**: Clean, responsive design optimized for data visualization
- **Dark/Light Mode**: Theme toggle for comfortable viewing
- **Real-time Data**: Live integration with iRacing API for up-to-date information
- **Mobile Responsive**: Optimized experience across all device sizes

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with comprehensive type safety
- **Styling**: Tailwind CSS with shadcn/ui components
- **AI**: Google AI & Genkit for intelligent analysis
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
   
   # Optional: AI Configuration (for enhanced features)
   GOOGLE_GENAI_API_KEY=your_google_ai_key
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
- **Intelligent Caching**: Multi-level caching for optimal performance
- **Background Processing**: Non-blocking data fetching
- **Efficient Updates**: Minimal API calls with smart data aggregation

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
└── ai/                    # AI integration and flows
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
- **CAPTCHA Handling**: Occasionally, iRacing may require CAPTCHA verification - follow the on-screen instructions
- **Rate Limiting**: The application includes intelligent rate limiting to respect iRacing's API guidelines
- **Data Accuracy**: All data is sourced directly from iRacing's official API for maximum accuracy
