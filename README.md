# Apex Stats: Your iRacing Performance Dashboard

Apex Stats is a modern, data-driven web application designed to analyze and visualize iRacing driver performance. It provides detailed statistics, historical trend charts, and AI-powered analysis to help drivers understand their strengths, weaknesses, and overall progression.

![Apex Stats Screenshot](https://placehold.co/800x450.png)

## Features

- **Driver Dashboard:** A comprehensive overview of a driver's iRacing career, including iRating, Safety Rating, and average race pace.
- **Advanced Filtering:** Dynamically filter performance data by year, season, car category, specific tracks, and cars.
- **Historical Trend Charts:** Visualize iRating, Safety Rating, and race pace progression over time.
- **Recent Race Analysis:** A paginated list of recent races with detailed results for every subsession participant.
- **Driver Comparison Tool:** A side-by-side "tale of the tape" comparison of two drivers, complete with combined history charts and head-to-head race analysis.
- **AI-Powered Insights:** Genkit-powered AI analysis provides qualitative summaries of a driver's performance and direct comparisons between competitors.
- **Light/Dark Mode:** A theme toggle for user comfort.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Generative AI:** Google AI & Genkit
- **Language:** TypeScript
- **iRacing Data:** `iracing-api` package

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
3. **Set Environment Variables (Connect to iRacing API):**
   Create a new file named `.env.local` in the root of the project and add your iRacing email and password:
   ```.env.local
   # iRacing credentials
   IRACING_EMAIL=your_iracing_email@example.com
   IRACING_PASSWORD=your_iracing_password
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:9002`. After starting the server, the app will use your credentials to fetch and display live data from the iRacing API.
