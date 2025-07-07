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

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:9002`.

## Connecting to the iRacing API

By default, Apex Stats uses mock data. To connect it to the live iRacing API, follow these steps.

### 1. Environment Variables

The application requires your iRacing credentials to make API calls.

1. Create a new file named `.env.local` in the root of the project.
2. Copy the contents of `.env.example` into your new `.env.local` file.
3. Replace the placeholder values with your actual iRacing email and password.

```.env.local
# iRacing credentials
IRACING_EMAIL=your_iracing_email@example.com
IRACING_PASSWORD=your_iracing_password
```

### 2. Install the iRacing API Client

This project is set up to use the [`iracing-api`](https://github.com/TheMich4/iracing-api) package. To use it, you will need to install it manually by running the following command:

```bash
npm install iracing-api
```

### 3. Update Server Actions

The core logic for fetching data and passing it to the AI flows is located in `src/app/actions.ts`. This file currently uses mock data. You need to replace the mock data logic with calls to the iRacing API.

Open `src/app/actions.ts` and modify the `getAnalysis` and `getComparisonAnalysis` functions. The comments in the file will guide you on where to replace the mock `driver` objects with data fetched from your iRacing API client.

The process will look something like this:

1. **Import your API functions:** You'll need functions to get a driver's stats, lookup their ID, and fetch their race history.
2. **Fetch Live Data:** In the actions, call your API functions to get the data for the requested driver(s).
3. **Map Data to Schema:** The most critical step is to transform the data you receive from the iRacing API into the exact structure that the Genkit AI flows expect (`AnalyzeDriverStatsInput` and `CompareDriversInput`). The schemas are defined in the flow files (`src/ai/flows/`).

This step is crucial because the AI prompts are engineered to understand the specific data structure provided by the mock data. You must ensure your live data matches this structure for the analysis to work correctly.
