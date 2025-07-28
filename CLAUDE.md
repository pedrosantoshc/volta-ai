# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Volta.AI** is a Brazilian AI-powered digital loyalty platform that converts paper stamp cards to Apple Wallet/Google Pay, combined with intelligent marketing automation via WhatsApp campaigns. The platform targets Brazilian restaurants and high-end establishments, providing automated customer insights and campaign creation.

### Key Features
- Digital wallet loyalty cards (Apple Wallet/Google Pay)
- QR code customer enrollment
- AI-powered campaign suggestions using DeepSeek API
- WhatsApp Business API integration
- LGPD-compliant customer data management
- Brazilian market-specific features (PIX, Portuguese localization)

## Tech Stack
- **Frontend:** Next.js 15 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI:** DeepSeek API for text generation, FLUX.1 via fal.ai for image generation
- **Deployment:** Vercel
- **Repository:** https://github.com/pedrosantoshc/volta-ai.git

## Development Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Add shadcn/ui components
npx shadcn@latest add [component-name]
```

## Project Structure
```
src/
├── app/                    # Next.js 15 App Router
│   ├── globals.css        # Tailwind CSS styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/
│   └── ui/               # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── label.tsx
└── lib/
    └── utils.ts          # Utility functions
```

## Architecture Notes
- Mobile-first responsive design with progressive enhancement
- AI-first UX with prominent suggestions and one-click actions
- Row Level Security (RLS) for multi-tenant data isolation
- Brazilian localization throughout (Portuguese language, local business hours)
- LGPD compliance built into data models and user flows

## Color Palette (from PRD)
- **Primary:** Purple gradient (#7c3aed to #a855f7) - AI/premium feel
- **Success:** Green (#16a34a) - positive metrics
- **Warning:** Amber (#d97706) - attention needed
- **Background:** Light gray (#f8fafc)

## Current Development Phase
**Phase 1: Project Foundation & Initial UI Setup**

### Completed Tasks
✅ Clone repository and set up Next.js 15 project
✅ Configure Tailwind CSS and shadcn/ui

### Next Steps
- Set up Supabase integration
- Create initial UI system and design foundation
- Implement authentication system

## Development Approach
Following iterative development with UI/UX integrated throughout each phase rather than as a separate final step. WhatsApp integration planned as final implementation after API provider research.

## Important Notes
- Always maintain mobile-first approach
- Implement Portuguese localization from the start
- Ensure LGPD compliance in all data handling
- Use shadcn/ui components for consistent design
- Follow the established color palette for brand consistency