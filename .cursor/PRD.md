OPPORLINK
Cursor AI — Full Build PRD
Backend (Node/Express/TypeScript/Prisma) + Frontend (React Native/Expo)
Version 1.0 · April 2026

How to use this document with Cursor
This document is your master prompt for Cursor AI. It contains everything Cursor needs to build OpporLink from scratch — architecture, file structure, data models, API contracts, and screen-by-screen UI specs.

Setting up Cursor
1.Download Cursor from cursor.com and install it
2.Open your opporlink-backend folder in Cursor
3.Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows) and select "Cursor: Open Chat"
4.In settings, select Claude Sonnet as your model — it writes the best TypeScript
5.Enable "Codebase indexing" in Cursor settings so it can read all your existing files

The three Cursor modes — know when to use each

1. Chat (Cmd+L) — ask questions, get explanations
   Use this when you want to understand something, debug an error, or plan before building. Cursor reads your codebase and answers in context. Example: "Why is my Prisma client throwing a validation error?"

2. Composer (Cmd+I) — build entire features
   This is your main building tool. Cursor writes multiple files at once, creates new files, edits existing ones. Always use Composer when building a new feature. Example: paste a section from this PRD and say "build this feature"

3. Inline edit (Cmd+K) — fix or improve a specific line
   Highlight a block of code, press Cmd+K, describe the change. Use this for targeted fixes, not whole features.

The golden prompting formula for Cursor
Every prompt you give Cursor should follow this structure:

"Build [feature name]. Here is the spec: [paste section from this PRD]. Use TypeScript, follow the existing patterns in src/controllers/ and src/routes/. Create the controller at src/controllers/[name].controller.ts, the route at src/routes/[name].routes.ts, and the schema at src/schemas/[name].schema.ts. Follow the same structure as the auth controller."

The more specific you are, the better the output. Always tell Cursor: what to build, where to put it, and what existing file to model it after.

Cursor rules file — set this up first
Create a file called .cursorrules in your project root. This file tells Cursor your coding standards so every file it generates matches your style automatically:

# OpporLink — Cursor Rules

## Stack

- Node.js + Express + TypeScript
- Prisma ORM with PostgreSQL (Neon)
- Zod for validation
- Pino for logging
- JWT auth (access + refresh tokens)
- React Native + Expo (frontend)

## Code style

- All files in src/ use TypeScript
- No .js extensions on imports (CommonJS mode)
- Use async/await, never .then() chains
- Controllers never import from other controllers
- Models only contain Prisma queries, no business logic
- Services contain all business logic
- Always use the prisma instance from src/config/db
- Always use the logger from src/config/logger
- Always use the env object from src/config/env
- Return consistent API responses using ApiResponse util
- All routes use authenticate middleware for protected endpoints
- All request bodies validated with Zod schemas before hitting controller
- Soft delete pattern: set isDeleted=true, never hard delete posts/comments

## File naming

- Controllers: src/controllers/[feature].controller.ts
- Routes: src/routes/[feature].routes.ts
- Schemas: src/schemas/[feature].schema.ts
- Models: src/models/[Model].ts
- Services: src/services/[feature].service.ts

1. Project overview
   App name OpporLink
   Tagline Professional networking + opportunity discovery for Africa
   Platform Mobile-first (React Native / Expo)
   Backend Node.js + Express + TypeScript + Prisma + PostgreSQL
   Auth JWT (15min access token + 30day refresh token with rotation)
   Database PostgreSQL hosted on Neon
   File storage Cloudinary (avatars, post images, resumes)
   Target users African professionals, students, job seekers, employers
   Investor pitch LinkedIn + Opportunities marketplace for emerging markets

2. Complete folder structure
   Backend — src/
   src/
   app.ts ← Express app entry point
   config/
   env.ts ← Zod env validation
   db.ts ← Prisma client singleton
   logger.ts ← Pino logger
   schemas/
   auth.schema.ts ← signup/login/refresh Zod schemas
   user.schema.ts ← profile update schemas
   post.schema.ts ← create/update post schemas
   job.schema.ts ← create/update job schemas
   opportunity.schema.ts ← opportunity schemas
   connection.schema.ts ← connect/respond schemas
   report.schema.ts ← report filing schemas
   middleware/
   authenticate.ts ← JWT verification → req.user
   authorize.ts ← role-based access control
   validate.ts ← Zod body validation
   rateLimiter.ts ← express-rate-limit configs
   errorHandler.ts ← global error handler
   upload.ts ← Cloudinary multer config
   models/
   User.ts ← Prisma user queries
   Profile.ts ← Prisma profile queries
   Post.ts ← Prisma post queries
   Job.ts ← Prisma job queries
   Opportunity.ts ← Prisma opportunity queries
   Connection.ts ← Prisma connection queries
   Notification.ts ← Prisma notification queries
   Report.ts ← Prisma report queries
   RefreshToken.ts ← Prisma token queries
   services/
   password.service.ts ← bcrypt hash/compare
   token.service.ts ← JWT sign/verify/rotate
   email.service.ts ← transactional emails
   upload.service.ts ← Cloudinary upload/delete
   feed.service.ts ← feed algorithm
   notification.service.ts ← create + push notifications
   recommendation.service.ts ← opportunity matching
   controllers/
   auth.controller.ts
   user.controller.ts
   profile.controller.ts
   post.controller.ts
   job.controller.ts
   opportunity.controller.ts
   connection.controller.ts
   notification.controller.ts
   report.controller.ts
   admin.controller.ts
   routes/
   auth.routes.ts
   user.routes.ts
   profile.routes.ts
   post.routes.ts
   job.routes.ts
   opportunity.routes.ts
   connection.routes.ts
   notification.routes.ts
   report.routes.ts
   admin.routes.ts
   utils/
   apiResponse.ts ← standard response shape
   pagination.ts ← cursor-based pagination helper

Frontend — opporlink-app/src/
app/ ← Expo Router file-based routing
(auth)/
login.tsx
signup.tsx
forgot-password.tsx
(tabs)/
index.tsx ← Feed
opportunities.tsx ← Opportunities list
network.tsx ← Connections
jobs.tsx ← Jobs board
profile.tsx ← Own profile
profile/[id].tsx ← Public profile
post/[id].tsx ← Single post
job/[id].tsx ← Job detail
opportunity/[id].tsx ← Opportunity detail
notifications.tsx
settings.tsx
components/
ui/ ← buttons, inputs, cards, avatars
feed/ ← PostCard, FeedList
profile/ ← ProfileHeader, ExperienceCard
jobs/ ← JobCard, ApplicationStatus
opportunities/ ← OpportunityCard, DeadlineBadge
notifications/ ← NotificationItem
store/
auth.store.ts ← Zustand auth state
feed.store.ts ← feed state
notification.store.ts
services/
api.ts ← Axios instance + interceptors
auth.api.ts
post.api.ts
job.api.ts
opportunity.api.ts
connection.api.ts

3. Full API contracts
   Every endpoint the backend must expose. Build these in the order listed — auth first, then profile, then social features.

Auth endpoints — /api/auth
Method Route Body Response
POST /api/auth/signup email, password 201 { user, accessToken, refreshToken }
POST /api/auth/login email, password 200 { user, accessToken, refreshToken }
POST /api/auth/refresh refreshToken 200 { accessToken, refreshToken }
POST /api/auth/logout refreshToken 200 { message }

Profile endpoints — /api/profile
•GET /api/profile/:userId — Auth required — Full profile with experience, education, skills
•POST /api/profile — Auth required — Create profile — firstName, lastName, headline
•PATCH /api/profile — Auth required — Update any profile field
•POST /api/profile/experience — Auth required — Add experience entry
•DELETE /api/profile/experience/:id — Auth required — Remove experience
•POST /api/profile/education — Auth required — Add education entry
•DELETE /api/profile/education/:id — Auth required — Remove education
•POST /api/profile/skills — Auth required — Add skills array
•POST /api/profile/avatar — Auth required — Upload avatar — multipart/form-data
•POST /api/profile/banner — Auth required — Upload banner — multipart/form-data

Posts endpoints — /api/posts
•GET /api/posts/feed — Auth required — Paginated feed of posts from connections
•POST /api/posts — Auth required — Create post — content, mediaUrls[]
•GET /api/posts/:id — Auth required — Single post with comments and likes
•DELETE /api/posts/:id — Auth required — Soft delete own post (isDeleted=true)
•POST /api/posts/:id/like — Auth required — Toggle like on post
•POST /api/posts/:id/comments — Auth required — Add comment to post
•DELETE /api/posts/:postId/comments/:commentId — Auth required — Delete own comment

Jobs endpoints — /api/jobs
•GET /api/jobs — Auth required — Paginated job list with filters: type, location, remote
•POST /api/jobs — Auth required — Post a job — title, company, description, type, location
•GET /api/jobs/:id — Auth required — Job detail with application count
•PATCH /api/jobs/:id — Auth required — Update own job posting
•DELETE /api/jobs/:id — Auth required — Close job posting
•POST /api/jobs/:id/apply — Auth required — Apply — coverLetter, resumeUrl
•GET /api/jobs/:id/applications — Auth required (poster only) — List all applications
•POST /api/jobs/save/:id — Auth required — Save/unsave a job
•GET /api/jobs/saved — Auth required — Get saved jobs list

Connections endpoints — /api/connections
•POST /api/connections/request/:userId — Auth required — Send connection request
•POST /api/connections/accept/:connectionId — Auth required — Accept connection
•POST /api/connections/decline/:connectionId — Auth required — Decline connection
•DELETE /api/connections/:connectionId — Auth required — Remove connection
•GET /api/connections — Auth required — List accepted connections
•GET /api/connections/pending — Auth required — List pending incoming requests
•GET /api/connections/suggestions — Auth required — People you may know

Opportunities endpoints — /api/opportunities
•GET /api/opportunities — Auth required — Paginated list — filter by category, deadline, remote
•GET /api/opportunities/:id — Auth required — Opportunity detail + save status
•POST /api/opportunities/save/:id — Auth required — Save/unsave opportunity
•POST /api/opportunities/:id/apply — Auth required — Apply with cover note
•GET /api/opportunities/recommended — Auth required — AI-matched opportunities for user
•POST /api/opportunities — Admin/Mod only — Create opportunity
•PATCH /api/opportunities/:id — Admin/Mod only — Update opportunity
•POST /api/opportunities/:id/approve — Admin only — Approve PENDING_REVIEW opportunity
•POST /api/opportunities/:id/reject — Admin only — Reject with reason

Notifications endpoints — /api/notifications
•GET /api/notifications — Auth required — Paginated notifications list
•POST /api/notifications/read/:id — Auth required — Mark single notification as read
•POST /api/notifications/read-all — Auth required — Mark all as read
•GET /api/notifications/unread-count — Auth required — Count of unread notifications

Reports endpoints — /api/reports
•POST /api/reports — Auth required — File a report — type, targetId, reason, details
•GET /api/reports/mine — Auth required — Own filed reports
•GET /api/admin/reports — Mod/Admin only — Pending moderator queue
•POST /api/admin/reports/:id/resolve — Mod/Admin only — Resolve with action
•POST /api/admin/reports/:id/dismiss — Mod/Admin only — Dismiss report

4. Standard code patterns — always follow these
   Every file Cursor generates must follow these exact patterns. Include these in every Cursor prompt.

ApiResponse util — src/utils/apiResponse.ts
Every controller must return responses using this shape. Never return raw objects.
export const success = (res: Response, data: unknown, status = 200) =>
res.status(status).json({ success: true, data })

export const error = (res: Response, message: string, status = 400) =>
res.status(status).json({ success: false, error: message })

Pagination util — src/utils/pagination.ts
All list endpoints use cursor-based pagination, not page numbers. Page numbers break under real traffic when new items are inserted.
export const paginate = (cursor?: string, limit = 20) => ({
take: limit + 1,
...(cursor && { cursor: { id: cursor }, skip: 1 }),
})

export const paginatedResponse = <T extends { id: string }>(
items: T[], limit = 20
) => {
const hasMore = items.length > limit
const data = hasMore ? items.slice(0, limit) : items
return { data, nextCursor: hasMore ? data[data.length - 1].id : null }
}

Controller pattern
// src/controllers/post.controller.ts
import { Request, Response } from "express"
import { success, error } from "../utils/apiResponse"
import { logger } from "../config/logger"
import \* as PostModel from "../models/Post"

export const createPost = async (req: Request, res: Response) => {
const { content, mediaUrls } = req.body
const post = await PostModel.create(req.user.id, content, mediaUrls)
logger.info({ userId: req.user.id, postId: post.id }, "Post created")
return success(res, { post }, 201)
}

Route pattern
// src/routes/post.routes.ts
import { Router } from "express"
import { authenticate } from "../middleware/authenticate"
import { validate } from "../middleware/validate"
import { createPostSchema } from "../schemas/post.schema"
import \* as PostController from "../controllers/post.controller"

const router = Router()
router.post("/", authenticate, validate(createPostSchema), PostController.createPost)
export default router

5. Frontend screen specs
   Build each screen in this order. Each screen spec tells Cursor exactly what components, API calls, and state it needs.

Screen 1 — Onboarding / Auth flow
Login screen
•Email + password inputs with validation
•Login button — calls POST /api/auth/login
•On success: store accessToken + refreshToken in SecureStore
•Navigate to Feed tab
•"Forgot password?" link
•"Don't have an account? Sign up" link

Signup screen
•Email + password + confirm password
•Calls POST /api/auth/signup
•On success: navigate to Create Profile screen

Screen 2 — Create profile (onboarding step)
•firstName, lastName, headline inputs
•Optional: location, bio
•Avatar upload button — opens image picker
•Calls POST /api/profile
•On success: navigate to main tabs

Screen 3 — Feed tab (home)
•FlatList of PostCard components
•Infinite scroll — cursor-based pagination
•Pull to refresh
•PostCard shows: avatar, name, headline, timestamp, content, images, like count, comment count
•Tap like button → POST /api/posts/:id/like (optimistic update)
•Tap post → navigate to post/:id detail
•FloatingActionButton → Create post modal

Screen 4 — Create post modal
•Text input (multiline)
•Image picker — up to 4 images
•Calls POST /api/posts with content + mediaUrls
•On success: prepend to feed, close modal

Screen 5 — Opportunities tab
•Search bar with debounced query
•Filter chips: All, Jobs, Scholarships, Fellowships, Grants
•OpportunityCard: title, organisation, logo, deadline badge, category badge
•Deadline badge turns red if < 7 days remaining
•Save button on each card (heart icon)
•Tap card → opportunity/:id detail

Screen 6 — Opportunity detail
•Header: logo, title, organisation, deadline
•Tabs: Overview, Requirements, About org
•Apply button → opens apply bottom sheet
•Apply sheet: cover note textarea + submit
•Save/unsave button in header
•Share button

Screen 7 — Network tab
•Pending requests section at top (if any)
•Accept / Decline buttons on each request
•Connections list below
•"People you may know" suggestions section
•Connect button on each suggestion
•Tap any user → profile/:id

Screen 8 — Jobs tab
•Search bar
•Filter: Full-time, Part-time, Contract, Remote
•JobCard: title, company, location, type badge, salary, posted date
•Save job button
•Tap card → job/:id detail

Screen 9 — Profile tab (own profile)
•Banner image + avatar with edit overlay
•Name, headline, location, website
•Connection count
•Edit profile button
•Experience section with timeline
•Education section
•Skills chips
•Posts section — own posts in reverse chrono

Screen 10 — Public profile (profile/:id)
•Same as own profile but read-only
•Connect / Pending / Connected button based on connection status
•Message button (Phase 2)

Screen 11 — Notifications
•Grouped by: Today, This week, Earlier
•NotificationItem: avatar, description, timestamp, unread dot
•Tap notification → navigate to relevant entity
•Mark all read button in header

6. State management
   Use Zustand for global state. Three stores only — keep it simple.

auth.store.ts
•user: User | null
•accessToken: string | null
•isAuthenticated: boolean
•login(email, password): Promise<void>
•logout(): void
•refreshToken(): Promise<void>

feed.store.ts
•posts: Post[]
•nextCursor: string | null
•isLoading: boolean
•fetchFeed(): Promise<void>
•loadMore(): Promise<void>
•toggleLike(postId): void — optimistic update
•prependPost(post): void — after creating

notification.store.ts
•notifications: Notification[]
•unreadCount: number
•fetchNotifications(): Promise<void>
•markAllRead(): Promise<void>

7. Recommended Cursor build order
   Give Cursor one section at a time in this exact order. Do not skip ahead.

6.src/utils/apiResponse.ts + src/utils/pagination.ts
7.src/middleware/validate.ts + src/middleware/errorHandler.ts + src/middleware/rateLimiter.ts
8.src/middleware/authenticate.ts + src/middleware/authorize.ts
9.src/schemas/auth.schema.ts → src/models/User.ts + src/models/RefreshToken.ts → src/services/password.service.ts + src/services/token.service.ts → src/controllers/auth.controller.ts → src/routes/auth.routes.ts → src/app.ts
10.Profile feature: schema → model → controller → routes
11.Posts feature: schema → model → controller → routes
12.Connections feature: schema → model → controller → routes
13.Jobs feature: schema → model → controller → routes
14.Opportunities feature: schema → model → controller → routes
15.Notifications feature: schema → model → service → controller → routes
16.Reports feature: schema → model → controller → routes
17.Admin routes
18.Frontend: Expo project setup + auth store + auth screens
19.Frontend: Feed screen + PostCard component
20.Frontend: Opportunities screen
21.Frontend: Network screen
22.Frontend: Profile screens
23.Frontend: Jobs screen
24.Frontend: Notifications screen

8. Ready-to-paste Cursor prompts
   Copy and paste these directly into Cursor Composer (Cmd+I). Do them in order.

Prompt 1 — Utils and middleware
Create src/utils/apiResponse.ts with success() and error() helper functions that return consistent JSON responses. Create src/utils/pagination.ts with paginate() and paginatedResponse() helpers for cursor-based pagination. Then create src/middleware/validate.ts (Zod body validation), src/middleware/errorHandler.ts (global Express error handler that handles Prisma P2002/P2025 codes), src/middleware/rateLimiter.ts (authLimiter: 20 req/15min, globalLimiter: 100 req/15min), src/middleware/authenticate.ts (verifies JWT Bearer token, attaches req.user with id and role), and src/middleware/authorize.ts (...allowedRoles: Role[] — checks req.user.role). Use the prisma instance from src/config/db, logger from src/config/logger, env from src/config/env.

Prompt 2 — Auth feature
Build the complete auth feature. Create: (1) src/schemas/auth.schema.ts with signupSchema (email, password min 8), loginSchema, refreshSchema using Zod. (2) src/models/User.ts with findByEmail, findById (never return passwordHash), createUser. (3) src/models/RefreshToken.ts with storeToken, findToken, deleteToken, deleteAllForUser. (4) src/services/password.service.ts with hashPassword and verifyPassword using bcrypt, 12 rounds. (5) src/services/token.service.ts with signAccess (15m, includes role), signRefresh (30d), verifyAccess, verifyRefresh, storeRefresh, rotateRefresh, validateStoredRefresh. (6) src/controllers/auth.controller.ts with signup, login (timing-attack-safe), refresh (reuse detection — nuke all sessions if reuse detected), logout. (7) src/routes/auth.routes.ts. Use apiResponse util for all responses.

Prompt 3 — app.ts
Create src/app.ts — the Express entry point. Apply in order: import env first, then express-async-errors. Middleware stack: helmet(), cors (localhost:8081 in dev), express.json limit 10kb, hpp(), compression(), globalLimiter. Health check: GET /health. Mount routes: /api/auth, /api/user, /api/profile, /api/posts, /api/jobs, /api/opportunities, /api/connections, /api/notifications, /api/reports, /api/admin. 404 handler. Global errorHandler last. Listen on env.PORT.

Prompt 4 — Profile feature
Build the complete profile feature. Schema: createProfileSchema, updateProfileSchema, addExperienceSchema, addEducationSchema. Model: getProfileByUserId (include experiences, educations, skills), createProfile, updateProfile, addExperience, deleteExperience, addEducation, deleteEducation, addSkills. Controller: getProfile, createProfile, updateProfile, addExperience, deleteExperience, addEducation, deleteEducation, addSkills, uploadAvatar, uploadBanner. Routes: GET /api/profile/:userId, POST /api/profile, PATCH /api/profile, POST/DELETE /api/profile/experience, POST/DELETE /api/profile/education, POST /api/profile/skills, POST /api/profile/avatar, POST /api/profile/banner. All routes require authenticate middleware.

Prompt 5 — Posts + Feed
Build the posts feature. Schema: createPostSchema (content required, mediaUrls array max 4 items), createCommentSchema. Model: getFeed (posts from accepted connections, isDeleted: false, cursor paginated), createPost, getPostById (include author, comments, likes), softDeletePost (set isDeleted: true), toggleLike (create if not exists, delete if exists), addComment, deleteComment. Controller: getFeed, createPost, getPostById, deletePost, toggleLike, addComment, deleteComment. Routes: GET/POST /api/posts, GET /api/posts/feed, GET/DELETE /api/posts/:id, POST /api/posts/:id/like, POST /api/posts/:id/comments, DELETE /api/posts/:postId/comments/:commentId.

Prompt 6 — Frontend setup
Create a new Expo project called opporlink-app using: npx create-expo-app opporlink-app --template expo-template-blank-typescript. Then install: expo-router, axios, zustand, expo-secure-store, @expo/vector-icons, expo-image-picker, nativewind, tailwindcss. Set up Expo Router file-based routing. Create services/api.ts with an Axios instance pointing to http://localhost:3000, request interceptor that attaches Authorization Bearer header from auth store, response interceptor that handles 401 by calling refresh token then retrying. Create store/auth.store.ts with Zustand — user, accessToken, isAuthenticated, login, logout, refreshToken functions. Create the login screen at app/(auth)/login.tsx and signup at app/(auth)/signup.tsx. Use NativeWind for styling.

9. Environment variables reference
   Your complete .env file needs these values. Never commit this file.

# Database

DATABASE_URL="postgresql://..." ← from Neon dashboard

# JWT — generate with:

# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

JWT_ACCESS_SECRET=<64-byte-hex>
JWT_REFRESH_SECRET=<different-64-byte-hex>

# Server

PORT=3000
NODE_ENV=development

# Cloudinary (for file uploads — get from cloudinary.com)

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email (for verification emails — get from resend.com, free tier)

RESEND_API_KEY=
FROM_EMAIL=noreply@opporlink.com

10. What to do when Cursor gets it wrong
    Cursor will occasionally generate code that does not match your patterns or has type errors. Here is how to fix it efficiently.

If TypeScript shows type errors:
•Highlight the error in VS Code, press Cmd+K, say "fix the TypeScript error"
•Or open Cursor Chat, paste the error message, say "fix this"

If Cursor generates the wrong pattern:
•Open the file it generated, select all
•Press Cmd+K and say "rewrite this to match the pattern in src/controllers/auth.controller.ts"
•Cursor will read your existing file and match the style

If a feature is missing something:
•Do not start over — open Cursor Chat
•Say "in src/controllers/post.controller.ts, add a getPostsByUserId function that follows the same pattern as getFeed"

General rule:
Always give Cursor a reference file to match. "Follow the same pattern as X" produces much better output than building from nothing.

— End of OpporLink Cursor PRD v1.0 —
