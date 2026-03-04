

# MediScan Secure Go — Premium UI Rebuild

A high-end medical dashboard frontend with glassmorphism design, smooth animations, and an interactive 3D Spline background.

---

## 🎨 Design Foundation
- **Dark-to-light gradient color scheme** with medical blue/cyan accents
- **Glassmorphism cards** with frosted glass effect and subtle borders
- **Spline 3D particle background** as a fullscreen interactive layer behind all content
- **Soft glowing accents** on interactive elements
- **Clean Inter/Outfit typography** with generous spacing

---

## 📄 Pages & Features

### 1. Login Page (`/login`)
- Centered glassmorphism login card floating over the 3D background
- Email & Password fields with glowing focus states
- "Sign In" button with gradient + hover animation
- "Sign Up" link at bottom
- Subtle fade-in animation on load

### 2. Sign Up Page (`/signup`)
- Same layout as login with Name, Email, Password fields
- Smooth transition from login page

### 3. Dashboard / Home (`/dashboard`)
- Top navbar: MediScan logo + "Welcome, user" + Logout button
- **5 Feature Cards** in a responsive grid with hover-scale + glow effects:
  - Search Medicines, History, My Medicines, Scan Rx, AI Assistant
  - Each with colored icon and soft gradient background
- **Today's Schedule** card — shows reminders or empty state
- **Recent Scans** card — shows scan history or empty state
- Bottom tab navigation bar (Home, Search, Reminders, History, Profile)

### 4. Search Medicines (`/search`)
- Back arrow + "Find Medicines" header
- Large search input with glowing border on focus
- Empty state with pill icon and "Type a medicine name to search"
- Placeholder for search results list (cards with medicine info)
- Bottom navigation

### 5. My Reminders (`/reminders`)
- Back arrow + "My Reminders" header
- Reminder cards with:
  - Medicine name + delete icon
  - Stock counter with +/- buttons
  - Active reminder times with badges
  - "Taken" (green) and "Skip" (outlined) action buttons
  - "Edit Reminder" button
- Bottom navigation

### 6. History Log (`/history`)
- Back arrow + "History Log" header
- Timeline-style vertical list with:
  - Green checkmark (TAKEN) or orange minus (SKIPPED) status icons
  - Medicine name + timestamp
  - Color-coded status badges
- Bottom navigation

### 7. Profile / Settings (`/profile`)
- Back arrow + "Settings" header
- **Profile Information** card: Full Name + Email fields
- **Language Preference** card: Toggle buttons for English, Tamil, Hindi, Telugu, Malayalam
- **Security** card: Change Password button + Logout button (red)
- Bottom navigation

---

## 🧩 Shared Components
- **SplineBackground** — fullscreen 3D iframe layer with proper z-indexing
- **BottomNavBar** — fixed bottom tab bar with 5 tabs (Home, Search, Reminders, History, Profile) with active state indicator
- **GlassCard** — reusable glassmorphism card component
- **PageHeader** — back arrow + page title component
- **AppLayout** — wrapper with 3D background + content layering

---

## ✨ Animations & Interactions
- Page transitions with fade-in + slide-up
- Cards animate in with staggered delays on page load
- Hover effects: scale-up + glow on feature cards
- Input focus: glowing blue border animation
- Button hover: gradient shift + subtle lift
- Bottom nav: active tab icon fills + label highlights
- Timeline entries fade in sequentially on the History page

---

## 🔌 Placeholder API Routes
- `POST /api/login` — login form submission
- `POST /api/signup` — registration
- `GET /api/medicines?q=` — medicine search
- `GET /api/reminders` — fetch reminders
- `POST /api/reminders/:id/taken` — mark as taken
- `POST /api/reminders/:id/skip` — mark as skipped
- `GET /api/history` — fetch history log
- `GET /api/profile` — fetch profile
- `PUT /api/profile` — update profile

All forms and actions will call these placeholder routes (currently returning mock data) so backend integration is straightforward later.

