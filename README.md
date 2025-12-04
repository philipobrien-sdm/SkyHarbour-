# SkyHarbor Tycoon AI

A procedural, AI-enhanced airport simulation game built with React, Tailwind CSS, and the Google Gemini API.

## ✈️ Game Overview

Manage a growing regional airport, expanding it into an international hub. The game runs on a simulated clock with seasonal traffic fluctuations, day/night cycles, and real-time physics for aircraft ground movement.

<img width="1000" height="500" alt="Screenshot 2025-12-04 130121" src="https://github.com/user-attachments/assets/27e1dca2-65ef-421d-b606-a47e8c24af28" />

### Key Features
*   **Procedural Schedules:** Flight schedules are generated dynamically based on airport demand and seasonality.
*   **Realistic Ground Ops:** Planes land, taxi, park at specific gates, push back, and take off using pathfinding logic.
*   **Economic Simulation:** Manage cash flow, reputation, and demand.
*   **Seasonal Traffic:** Passenger numbers peak in Summer (July/Aug) and dip in Winter (Jan/Feb).
*   **Tech Tree:** Unlock upgrades like ILS (for rain safety), Terminal expansions, and Radar.
*   **AI Integration:**
    *   **Advisor:** Get context-aware strategic tips based on your current stats.
    *   **Negotiations:** Haggle with airline CEOs to open new routes.
    *   **Random Events:** AI generates dynamic daily events (e.g., "Tech Convention", "Fuel Spill") affecting gameplay.

## 🛠️ Setup Guide

### Prerequisites
*   Node.js (v18+)
*   NPM or Yarn
*   A Google Gemini API Key

### Local Installation

1.  **Clone the repository** (or download source).
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure API Key**:
    *   Create a `.env` file in the root.
    *   Add your key: `API_KEY=your_gemini_key_here`
    *   *Note: In some bundlers (like Parcel/Vite), you may need to prefix this as `REACT_APP_API_KEY` or `VITE_API_KEY` depending on your build tool.*
4.  **Run the dev server**:
    ```bash
    npm start
    ```

### Google AI Studio / Sandpack Setup

This project is designed to run directly in browser-based coding environments.

1.  Ensure `index.html`, `index.tsx`, `App.tsx`, and component files are present.
2.  The `process.env.API_KEY` is automatically injected by the AI Studio environment when you select your key in the UI.
3.  Dependencies are loaded via `<script type="importmap">` in `index.html` for zero-install execution.

## 🎮 How to Play

1.  **Start Small:** You begin with a single runway and 3 gates.
2.  **Watch the Clock:** Traffic is seasonal. Save money in Summer to survive the Winter lull.
3.  **Expand:** Buy the "Terminal Expansion" to get Gate 4.
4.  **Negotiate:** Use the Economy tab to negotiate with airlines. Lowballing them might make them walk away!
5.  **Traffic Congestion:** If planes wait too long for a gate or runway, they will divert, costing you money and reputation.
6.  **Controls:**
    *   **Map:** Click and drag to pan (limits prevent getting lost). Scroll to zoom.
    *   **Time:** Use the speed controls in the top bar to fast-forward through quiet periods.
    *   **Planes:** Click a plane to see its flight status and passenger count.
