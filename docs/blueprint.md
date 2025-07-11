# Apex Stats - Development Blueprint

## Application Overview

**Apex Stats** is a comprehensive iRacing performance dashboard built with modern web technologies, providing drivers with detailed analytics, historical trends, and AI-powered insights.

## Core Features (Current Implementation)

### Driver Management
- **Advanced Driver Search**: Find iRacing drivers by name with intelligent search capabilities
- **Driver Profiles**: Comprehensive career statistics and performance metrics
- **Tracked Drivers**: Save and manage favorite drivers for quick access
- **Driver Comparison**: Side-by-side analysis with combined historical data

### Performance Analytics
- **Historical Charts**: Interactive visualizations for iRating, Safety Rating, and race pace trends
- **Advanced Filtering**: Filter by year, season, car category, tracks, and vehicles
- **Lap-by-Lap Analysis**: Detailed race breakdowns with individual lap performance
- **AI-Powered Insights**: GenKit integration for qualitative performance analysis

### Race Analysis
- **Detailed Race Results**: Complete race data with all participants
- **Strength of Field**: Race quality metrics and competitive analysis
- **Navigation Integration**: Seamless flow between drivers and race data

### User Experience
- **Responsive Design**: Optimized for desktop and mobile devices
- **Theme Support**: Dark/light mode with system preference detection
- **Real-time Data**: Live integration with official iRacing API
- **Intelligent Caching**: Multi-level performance optimization

## Technical Architecture

### Design System
- **Theme**: Modern CSS custom properties with light/dark mode support
- **Typography**: 
  - Headlines: Orbitron (700 weight) for racing aesthetic
  - Body: Inter for optimal readability and data presentation
- **Components**: shadcn/ui component library with Tailwind CSS
- **Color System**: HSL-based design tokens for consistent theming
- **Responsive**: Mobile-first approach with Tailwind breakpoints

### Development Standards
- **Type Safety**: Comprehensive TypeScript with Zod runtime validation
- **API Integration**: Official iRacing API with proper error handling
- **Performance**: Intelligent caching and optimized data fetching
- **Code Quality**: Modular architecture with reusable components
- **Testing**: Component and integration test coverage

## Key Design Principles

1. **Data-Driven**: Clean presentation that emphasizes racing metrics and trends
2. **Performance-Focused**: Fast loading with intelligent background processing
3. **User-Centric**: Intuitive navigation and clear information hierarchy
4. **Scalable**: Modular architecture supporting feature expansion
5. **Accessible**: Proper contrast ratios and responsive design for all users