# Vizly - AI Image Editor

A modern AI-powered image editor built with Next.js, Supabase, and Google Vertex AI.

## 🚀 Tech Stack

- **Framework**: Next.js 14+ (App Router with Turbopack)
- **Database & Auth**: Supabase (PostgreSQL, Google/Email Auth)
- **AI/ML**: Google Vertex AI (Gemini Pro 1.5, Imagen-4)
- **Canvas Engine**: fabric.js v6
- **UI Components**: shadcn/ui with Tailwind CSS
- **Deployment**: Vercel

## ✨ Features

**AI-Powered Design Generation**
- Generate stunning images from text descriptions
- Uses Google Imagen-4 for high-quality output
- Powered by Gemini Pro 1.5 for intelligent prompting

**Advanced Canvas Editor**
- Full-featured canvas with fabric.js
- Real-time editing and manipulation
- Save and load projects

**Secure Authentication**
- Email/Password authentication
- Google OAuth integration
- Row-level security with Supabase

**Cloud Storage**
- Save projects to cloud
- Brand profile management
- Generation history tracking

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier available)
- Google Cloud account with Vertex AI enabled

## 🔧 Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd ai-image-editor

# 2. Install dependencies
npm install

# 3. Set up environment variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://brqqifiyajnukjdbgaeg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_PSz1alDUqf9Ajw0FYsBlPA_anBGIdTZ
SUPABASE_SERVICE_KEY=sb_secret_eTxedm5J43EBfP2cF_nRwg_rTwKilyK
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret

# 4. Run development server
npm run dev

# 5. Open http://localhost:3000
```

## 🗄️ Database Setup

Run the SQL setup from `docs/database.sql` in your Supabase dashboard:

- **profiles**: Stores user brand information
- **projects**: Stores canvas JSON and project metadata
- **generations**: Logs all AI image generations

The schema includes Row-Level Security (RLS) policies for data protection.

## 🚢 Deployment on Vercel

```bash
# 1. Push to GitHub
git push origin main

# 2. Go to vercel.com and import repository

# 3. Add environment variables in Vercel dashboard

# 4. Deploy!
```

The app is optimized for Vercel with:
- Turbopack for faster builds
- Edge Functions ready
- Serverless API routes

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/                # Login page
│   ├── signup/               # Signup page
│   ├── dashboard/            # User dashboard
│   ├── editor/               # Canvas editor
│   ├── auth/callback/        # OAuth callback
│   └── api/auth/signup/      # Signup API
├── components/
│   ├── header.tsx            # Navigation
│   ├── magic-input.tsx       # Main input component
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── auth-context.tsx     # Auth state
└── styles/
    └── globals.css          # Global styles
```

## 🔐 Security

- Row-Level Security (RLS) in Supabase
- Secure environment variables
- OAuth 2.0 authentication
- CORS properly configured
- Parameterized queries for SQL safety

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📝 Authentication Flow

1. User signs up/logs in via email or Google OAuth
2. Supabase creates a secure session
3. Session stored in HttpOnly cookies
4. Auth context provides global user state
5. Protected routes redirect unauthenticated users

## 🤖 AI Integration

The app integrates with Google Vertex AI:

- **Gemini Pro 1.5**: Text understanding and prompt engineering
- **Imagen-4**: High-quality image generation

API calls made through secure server-side routes.

## 🛠️ Development

```bash
# Run dev server
npm run dev

# Build production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 📄 License

MIT

## 🙋 Support

For issues and questions, please create a GitHub issue.

---

**Built with ❤️ by the Vizly team**
