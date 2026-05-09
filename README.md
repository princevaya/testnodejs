# Smart Complaint Management System

Full-stack complaint platform with a Node.js/Express API, MySQL storage, Google Sheets sync, email notifications, and a React TypeScript TSX frontend.

## Stack

- Backend: Node.js, Express, MySQL, JWT, Multer, Nodemailer, Google Sheets API
- Frontend: React + TypeScript + Vite (TSX)

## Project Structure

```text
frontend/
  src/
  vite.config.ts
src/
  config/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
sql/
uploads/
```

## Roles

- User
- Admin
- Staff

## API Endpoints

- POST /api/auth/register
- POST /api/auth/login
- POST /api/complaints/create
- GET /api/complaints/all
- GET /api/complaints/staff
- GET /api/complaints/my
- GET /api/complaints/assigned
- POST /api/complaints/assign
- PATCH /api/complaints/update-status
- POST /api/feedback/add
- GET /api/dashboard/summary

## Smart Logic

- Auto category:
  - wifi, internet -> Network
  - water, leak -> Plumbing
  - electric, light -> Electrical
  - default -> General
- Auto priority:
  - urgent, danger, shock, leak -> High
  - issue, problem, not working -> Medium
  - default -> Low
- Duplicate prevention:
  - same room + same category + status != Resolved

## Frontend Features

- TSX role-based dashboards for User, Admin, and Staff
- User panel: create complaint, view status, add feedback after resolution
- Admin panel: dashboard stats, filters, assign staff, update statuses
- Staff panel: view assigned complaints, update statuses

## Setup and Run

1. Install root dependencies.

```bash
npm install
```

2. Install frontend dependencies (if needed).

```bash
npm --prefix frontend install
```

3. Configure .env in project root with values for:

- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET
- EMAIL_HOST
- EMAIL_PORT
- EMAIL_SECURE
- EMAIL_USER
- EMAIL_PASS
- EMAIL_FROM
- GOOGLE_SERVICE_ACCOUNT_FILE
- GOOGLE_SHEETS_SPREADSHEET_ID
- UPLOAD_DIR

4. Run MySQL schema.

```bash
mysql -u root -p -e "source C:/Users/Lenovo/lcnc project/sql/schema.sql"
```

If mysql is not in PATH, use full executable path:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "source C:/Users/Lenovo/lcnc project/sql/schema.sql"
```

5. Start full development mode (backend + frontend).

```bash
npm run dev:full
```

- Frontend dev URL: http://localhost:5173
- Backend API URL: http://localhost:5000

6. Production-style run from backend serving built frontend.

```bash
npm run start:full
```

Then open: http://localhost:5000

## Google Sheets Setup

1. Enable Google Sheets API in Google Cloud.
2. Create a service account and download credentials JSON.
3. Place JSON in project root and set GOOGLE_SERVICE_ACCOUNT_FILE.
4. Share your sheet with the service account email (Editor).
5. Put sheet ID in GOOGLE_SHEETS_SPREADSHEET_ID.

## Notes

- Backend serves frontend only when frontend build output exists in frontend/dist.
- During development, Vite proxies /api and /uploads to backend.
- For production hardening, add rate limiting and API docs.
