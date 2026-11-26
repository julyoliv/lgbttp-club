# Club Hub — Backend

REST API for **Club Hub**, an application for managing book and movie clubs. Built with Node.js, Express, and PostgreSQL.

## Features

- **Authentication & Sessions:** User registration, login, logout, and session validation (`GET /auth/me`) using JWT stored in `HttpOnly` cookies (`sameSite: "none"` and `secure: true` in production).
- **Role-Based Access Control:** Middleware enforcing club membership (`clubMemberRequired`) and owner-only administrative actions (`clubOwnerRequired`).
- **Clubs & Invites:** Create book or movie clubs, generate unique invite codes, join clubs, manage cycle phases (`idle`, `suggesting`, `voting`), and configure per-user vote/suggestion limits.
- **Suggestions & Voting:** Transactional suggestion submission and voting with row-level locking (`FOR UPDATE`) to prevent race conditions and enforce per-cycle limits.
- **External Catalog Integrations:** Normalized search endpoint (`GET /clubs/:clubId/integrations/search`) integrating with **TMDb** (movies + director lookup) and **Google Books** (books).
- **Meetings, Attendances & Reviews:** Schedule single or multi-work meetings, track member RSVP statuses (`going`, `not_going`), and manage star ratings and written reviews.
- **Club Message Board:** Create, edit, and delete club announcements.
- **Database Migrations:** Sequential SQL migration runner (`scripts/migrate.js`) tracking applied migrations (`001` through `009`).

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express
- **Database:** PostgreSQL (`pg`)
- **Authentication:** JSON Web Tokens (`jsonwebtoken`) + `bcrypt` + `cookie-parser`
- **External APIs:** TMDb API v3 & Google Books API

## Project Structure

```text
backend/
├── migrations/           # Sequential SQL schema migrations (001_init.sql ... 009_constraints_and_catalog_meta.sql)
├── scripts/
│   └── migrate.js        # Database migration runner
├── src/
│   ├── middleware/       # Auth & club role guards (auth.js, clubAuth.js)
│   ├── routes/           # Express route handlers (auth, clubs, suggestions, meetings, attendances, reviews, messages, clubIntegrations)
│   ├── services/         # External API clients (catalogSerach.js)
│   ├── validators/       # Request payload validation helpers
│   ├── db.js             # PostgreSQL connection pool
│   └── index.js          # Express app setup, CORS, and route mounting
├── package.json
└── .env.example
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local instance, Docker via root `docker-compose.yml`, or Neon)
- TMDb API v3 Key

### Installation

1. Navigate to the `backend` directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create a `.env` file in `backend/` with the following variables:
   ```env
   PORT=3000
   NODE_ENV=development
   DATABASE_URL=postgres://clubhub:clubhub@localhost:5433/clubhub
   JWT_SECRET=your_super_secret_jwt_key
   FRONTEND_URL=http://localhost:5173
   TMDB_API_KEY=your_tmdb_v3_api_key
   GOOGLE_BOOKS_API_KEY=optional_google_books_api_key
   ```

3. Run database migrations:
   ```bash
   npm run migrate
   ```

4. Start the server:
   ```bash
   # Development (with file watch)
   npm run dev

   # Production
   npm start
   ```

## API Overview

| Prefix | Description |
| :--- | :--- |
| `/auth` | Register, login, logout, and current user session |
| `/clubs` | List, create, join, update cycle phase, and delete clubs |
| `/clubs/:clubId/suggestions` | List, create, vote, choose/reject, and reset cycle suggestions |
| `/clubs/:clubId/integrations/search` | Search external movie (TMDb) or book (Google Books) catalogs |
| `/clubs/:clubId/meetings` | List and schedule club meetings |
| `/clubs/:clubId/meetings/:meetingId/attendances` | List and update member RSVP status |
| `/clubs/:clubId/meetings/:meetingId/reviews` | List, create, and delete work reviews |
| `/clubs/:clubId/messages` | List, post, edit, and delete club announcements |