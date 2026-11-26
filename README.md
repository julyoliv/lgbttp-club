<img width="150" height="150" alt="icon" src="https://github.com/user-attachments/assets/fae41862-c5e9-47fa-a85e-294fcc0cb333" />


# Club Hub

A full-stack web application designed to organize and manage book and movie clubs.

## Features
- **Club Management:** Create book or movie clubs and invite members via shareable invite codes.
- **Suggestions & Voting Cycles:** Manage themed or open cycles where members submit works, vote on favorites, and owners select picks for upcoming sessions.
- **Catalog Search Integration:** Auto-fill movie and book details (title, director/author, release year, and cover art) via TMDb and Google Books APIs, with manual upload fallback.
- **Meetings & Attendance:** Schedule sessions with one or multiple works, track member RSVPs, and share post-session ratings and reviews.
- **Club Message Board:** Post, edit, and manage announcements for club members.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Backend:** Node.js, Express, PostgreSQL (`pg`), JWT (`HttpOnly` cookies)
- **External APIs:** TMDb API & Google Books API
