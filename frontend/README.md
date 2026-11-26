# Club Hub — Frontend

Web client for **Club Hub**, an application for managing book and movie clubs. Built with React, Vite, and Tailwind CSS.

## Features

- **Authentication:** User registration, login, and persistent session handling via `HttpOnly` cookies.
- **Clubs Dashboard:** Create new book or movie clubs, or join existing ones using invite codes.
- **Suggestions & Voting Cycles:**
  - Search movies (TMDb) and books (Google Books) with debounced autocomplete to auto-fill title, director/author, release year, and cover image.
  - Manual cover upload fallback with automatic client-side image resizing.
  - Cycle management for club owners (open suggestions, open voting, set cycle theme, vote/suggestion limits, and reset cycles).
- **Meetings & Attendance:** Schedule sessions with single or multiple works, confirm RSVP attendance, and submit post-session star ratings and reviews.
- **Club Message Board:** Announcement board for club owners to post, edit, and delete updates.
- **Responsive Design:** Mobile-first layout optimized for both smartphones and desktop browsers.

## Tech Stack

- **Framework:** React + Vite
- **Styling:** Tailwind CSS (v4)
- **Routing:** React Router (`react-router-dom`)
- **Icons:** Lucide React

## Project Structure

```text
frontend/
├── public/               # Static assets (app icon, favicon)
├── src/
│   ├── api/              # Fetch client and API endpoints (client.js)
│   ├── components/       # UI components (ClubMeetings, ClubSuggestions, ClubMural, MeetingCard, modals)
│   ├── context/          # Global contexts (AuthContext, LoadingContext)
│   ├── pages/            # Route views (Home, Club, Login, Register)
│   ├── App.jsx           # Route definitions and protected route wrappers
│   ├── index.css         # Tailwind CSS configuration and custom theme tokens
│   └── main.jsx          # Application entry point
├── index.html
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running locally or deployed

### Installation

1. Navigate to the `frontend` directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Create a `.env` file in the `frontend/` root (optional in local development if using Vite's `/api` proxy):
   ```env
   VITE_API_URL=http://localhost:3000
   ```

3. Start the development server:
   ```bash
   # Localhost only
   npm run dev

   # Expose to local network (for testing on mobile devices)
   npm run dev -- --host
   ```

## Deployment (Vercel)

1. Import the GitHub repository into **Vercel** and set the **Root Directory** to `frontend`.
2. Add the environment variable:
   - `VITE_API_URL`: Public URL of your deployed backend (e.g., `https://your-backend.onrender.com`).
3. Ensure `frontend/vercel.json` is present so client-side routes work properly on page refresh:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```