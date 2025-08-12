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
**Phase 1B: Core Business Setup (MAJOR PROGRESS MADE)**

### Completed Tasks
✅ Next.js 15 project setup with TypeScript
✅ Tailwind CSS and shadcn/ui configuration  
✅ Supabase integration (database, auth, storage)
✅ Authentication system (login/signup with Google OAuth)
✅ Basic dashboard layout with navigation
✅ Loyalty card designer with real-time preview
✅ Database schema deployed with all tables
✅ API documentation (PassKit, DeepSeek, FAL.AI)
✅ Development rules and workflow established
✅ Environment variables configured with API keys

### Phase 1B Progress - Customer Management & LGPD Compliance
✅ **Customer Management System** - Full CRUD operations with advanced features
✅ **Excel Import System** - Dynamic template generation with loyalty card validation
✅ **LGPD Compliance Framework** - Complete consent tracking and validation
✅ **Bulk Operations** - Customer selection, bulk delete, CSV import/export
✅ **Customer Segmentation** - Active/inactive filters, search functionality
✅ **Conditional Logic** - Stamp validation against card limits, auto-completion
✅ **Action System** - Conditional button enabling based on consent status

## Complete Development Roadmap

### **Phase 1B: Core Business Setup (MAJOR PROGRESS MADE)**

#### **1. Business Onboarding Flow** ⏳ IN PROGRESS
**Goal**: Complete restaurant setup from signup to operational loyalty program

**Components to Build**:
- `/onboarding/step-1` - Enhanced business registration (name, address, CNPJ, owner details)
- `/onboarding/step-2` - Logo upload to Supabase Storage + business type selection
- `/onboarding/step-3` - AI settings (tone: amigável/profissional/casual, brand voice, colors)
- `/onboarding/step-4` - Team management (invite staff, assign roles: owner/manager/staff)
- `/onboarding/complete` - Progress summary + first loyalty card creation

**What This Accomplishes**:
- Gets restaurants fully operational in under 10 minutes
- Sets up AI personality for Brazilian Portuguese campaigns
- Enables team collaboration with role-based access
- Ensures LGPD compliance from the start

#### **2. Customer Enrollment System (MVP Heart)** ⏳ IN PROGRESS
**Goal**: Convert walk-in customers to digital loyalty program members

**Components to Build**:
- `/enroll/[cardId]` - Mobile-optimized public enrollment for QR scans
- `/dashboard/cartoes/[id]/formulario` - Dynamic form builder for custom questions
- ✅ LGPD consent collection system (data processing, WhatsApp marketing, email) - **COMPLETED**
- ✅ Customer data processing pipeline with validation and deduplication - **COMPLETED**
- Automatic digital wallet pass generation and distribution

**What This Accomplishes**:
- Achieves 60%+ customer enrollment rate (PRD target)
- ✅ Collects valuable customer data for AI insights - **COMPLETED**
- Enables all downstream marketing automation
- Creates seamless mobile-first customer experience

### **Phase 1C: Core Loyalty Operations**

#### **3. Customer Management System** ✅ **COMPLETED**
**Components Built**:
- ✅ `/dashboard/clientes` - Customer database with advanced search/filtering - **COMPLETED**
- ✅ Customer segmentation builder (Active, Clientes eventuais, search filters) - **COMPLETED**
- ⏳ Individual customer profile pages with complete interaction history - **PENDING**
- ✅ Bulk operations (Excel import/export, bulk delete, customer selection) - **COMPLETED**  
- ✅ LGPD-compliant consent tracking and validation - **COMPLETED**
- ✅ Conditional action system (buttons enabled based on consent) - **COMPLETED**

#### **4. Manual Stamp Attribution System**
**Components to Build**:
- `/dashboard/selos/adicionar` - Quick stamp addition interface for staff
- `/dashboard/selos/escaneamento` - QR code scanner for customer identification
- Bulk stamp operations for busy periods (add stamps to multiple customers)
- Complete audit trail (who added stamps, when, transaction history)
- Reward redemption tracking and notification system

### **Phase 1D: AI-Powered Insights**

#### **5. Basic AI Copilot Integration (DeepSeek API)**
**Components to Build**:
- AI insights dashboard showing customer behavior patterns
- Automated campaign suggestions: "47 clientes inativos - Campanha 'Sentimos sua falta'"
- Expected engagement predictions and revenue impact estimates
- One-click campaign creation from AI suggestions
- Performance tracking for AI-generated campaigns

**Key AI Features**:
- Inactive customer detection (15+ days since last visit)
- Frequent visitor identification and VIP upgrade suggestions
- Birthday campaign automation
- Completed card reward reminders

#### **6. WhatsApp Integration Foundation**
**Components to Build**:
- WhatsApp Business API provider integration (360Dialog, Twilio, or ChatAPI)
- Template message system for Brazilian compliance
- Automated notifications (stamp additions, rewards available, card completed)
- Manual campaign sending to customer segments
- Message delivery tracking and analytics dashboard

**Compliance Features**:
- 24-hour messaging window compliance
- Template message approval workflow
- Unsubscribe mechanisms in all campaigns
- Rate limiting to prevent spam

### **Phase 2A: Digital Wallet Integration**

#### **7. Apple Wallet PassKit Implementation**
**Components to Build**:
- PassKit certificate setup and management
- Dynamic pass generation with loyalty card data
- Real-time pass updates when stamps are added
- Pass distribution via enrollment flow
- Push notifications for pass changes

**Technical Requirements**:
- Apple Developer account and certificates
- PassKit Node.js SDK integration
- Pass signing and security implementation

#### **8. Google Pay Integration**
**Components to Build**:
- Google Pay API setup and authentication
- Pass generation for Android users
- Cross-platform wallet compatibility testing
- Unified pass management system

### **Phase 2B: Advanced AI Marketing**

#### **9. Advanced Campaign Generation**
**Components to Build**:
- Natural language campaign generation with brand voice matching
- Customer segmentation AI based on behavior patterns
- A/B testing suggestions for campaign optimization
- Dynamic content personalization per customer segment
- Campaign performance prediction models

#### **10. Visual Content Generation (FAL.AI FLUX)**
**Components to Build**:
- Promotional image generation for WhatsApp campaigns
- AI-powered loyalty card background design
- Seasonal campaign imagery (Festa Junina, Natal, Carnaval)
- Brand-consistent visual asset creation
- Social media ready content in multiple formats

#### **11. Advanced Analytics & ROI Tracking**
**Components to Build**:
- Revenue attribution modeling linking campaigns to visits
- Customer lifetime value calculations
- Loyalty program ROI measurement dashboard
- Predictive analytics for customer churn
- Comparative analysis (loyalty vs non-loyalty customers)

### **Phase 3: Enterprise & Scaling**

#### **12. POS System Integration**
**Components to Build**:
- Brazilian payment processor APIs (Stone, Cielo, GetNet)
- Real-time purchase tracking linked to loyalty cards
- Automatic stamp attribution based on spend thresholds
- Revenue correlation analysis and reporting

#### **13. Advanced Enterprise Features**
**Components to Build**:
- Multi-location support for restaurant chains
- Advanced role permissions and user hierarchies
- API for third-party integrations
- White-label solutions for payment processors
- Coalition loyalty programs (cross-brand partnerships)

### **Success Metrics (PRD Targets)**
- **Customer Acquisition**: 60%+ enrollment rate at participating venues
- **Engagement**: 25%+ WhatsApp campaign engagement rates
- **Performance**: 99.5%+ uptime, <200ms dashboard response times
- **ROI**: 15:1 return on AI-generated campaigns
- **Business Growth**: R$ 100K+ ARR within 12 months

### **IMMEDIATE NEXT PRIORITIES (Current Focus)**

#### **High Priority - Core MVP Completion**
1. **Customer Enrollment Flow** - Complete the public-facing customer registration
   - `/enroll/[cardId]` - Mobile-optimized enrollment page for QR scans
   - Dynamic form builder for custom business questions
   - Integration with existing LGPD consent system

2. **Individual Customer Actions** - Replace placeholder alerts with real functionality
   - Customer detail pages (`/dashboard/clientes/[id]`) 
   - Manual stamp addition interface
   - Loyalty card status management

3. **Digital Wallet Integration** - Core value proposition
   - Apple Wallet PassKit implementation
   - Google Pay Pass generation and distribution
   - Real-time pass updates when stamps are added

#### **Medium Priority - Business Operations**
4. **Enhanced Onboarding Flow** - Complete business setup experience
   - Multi-step onboarding with logo upload
   - AI personality configuration for campaigns
   - Team member invitation and role management

5. **Manual Stamp Attribution System** - Staff operational tools
   - QR code scanner for customer identification
   - Bulk stamp operations for busy periods
   - Complete audit trail and transaction history

#### **Future Phases - AI & Marketing**
6. **Basic AI Copilot Integration** - DeepSeek API
   - Customer behavior analysis and insights
   - Simple campaign suggestions based on patterns
   - One-click campaign creation

7. **WhatsApp Business API Integration** - Customer communication
   - Provider evaluation and selection
   - Automated notifications for stamps/rewards
   - Manual campaign sending to segments

## Technical Priorities
- **Mobile-first**: All features must work perfectly on mobile devices
- **Brazilian compliance**: LGPD, Portuguese language, local business practices
- **AI integration**: DeepSeek for campaigns, FAL.AI for imagery
- **Performance**: <200ms dashboard loads, <500ms API responses
- **Scalability**: Multi-tenant architecture with Row Level Security

## Development Approach
Following iterative development with UI/UX integrated throughout each phase rather than as a separate final step. WhatsApp integration planned as final implementation after API provider research.

## **STRATEGIC DEVELOPMENT PLAN - DECEMBER 2024**

### **GPT vs Current Progress Comparison**

After completing Phase 1B customer management and loyalty operations, here's how our current progress compares to the original GPT roadmap:

#### **✅ MAJOR ACCOMPLISHMENTS (Ahead of Schedule)**

**Customer Management System** - **FULLY COMPLETED**
- ✅ Advanced customer database with search, filtering, and bulk operations
- ✅ Excel import/export with dynamic template generation
- ✅ LGPD compliance framework with comprehensive consent tracking
- ✅ Customer segmentation (Active vs "Clientes eventuais") 
- ✅ Conditional action system based on consent status
- ✅ Bulk delete operations with customer selection
- **Status:** GPT plan estimated this as Phase 1C, we completed in Phase 1B

**Loyalty Card Operations** - **CORE FUNCTIONALITY COMPLETED**
- ✅ Business scoping utility (`getCurrentBusinessId`) - Fixed critical multi-tenant bug
- ✅ Customer detail pages with loyalty card progress visualization
- ✅ "Dar selo" API (`/api/stamps/add`) with business validation and auto-completion
- ✅ GiveStampDialog component for intuitive stamp attribution
- ✅ Manual stamp attribution pages (`/dashboard/selos/adicionar`)
- ✅ Wallet integration stubs ready for Phase 2 implementation
- **Status:** GPT plan had this spread across Phases 1B-1C, we consolidated effectively

**Technical Foundation** - **ROBUST AND SCALABLE**
- ✅ Next.js 15 with proper TypeScript configuration
- ✅ Supabase integration with Row Level Security
- ✅ Mobile-first responsive design
- ✅ Error handling and user feedback systems
- ✅ API route structure following RESTful patterns
- **Status:** Exceeded GPT plan expectations for technical quality

#### **🎯 CURRENT FOCUS AREAS (Next 4-6 Weeks)**

**1. Customer Enrollment System** - **HIGH PRIORITY**
- ✅ Public enrollment page (`/enroll/[cardId]`) - **COMPLETED**
- ✅ LGPD consent collection with comprehensive compliance - **COMPLETED**
- ✅ Custom form builder integration - **COMPLETED**
- ⏳ QR code scanning functionality with camera integration - **PENDING**
- ⏳ Real-time QR code generation and management - **PENDING**

**2. Digital Wallet Integration** - **CORE VALUE PROPOSITION**
- ⏳ Apple Wallet PassKit implementation with certificate setup
- ⏳ Google Pay Pass generation and distribution
- ⏳ Real-time pass updates when stamps are added
- ⏳ Pass signing and security implementation
- **Business Impact:** This is the primary differentiator vs competitors

**3. QR Code & Scanning System** - **OPERATIONAL EFFICIENCY**
- ✅ Manual QR input functionality - **COMPLETED**
- ⏳ Camera integration for live QR scanning - **PENDING** 
- ⏳ Customer identification and validation workflow - **PENDING**
- ✅ QR code scanning page structure - **COMPLETED**

#### **📋 REFINED NEXT STEPS (Priority Order)**

**Phase 1C Completion (January 2025)**

1. **QR Scanning Implementation** - **IMMEDIATE PRIORITY**
   - Complete camera integration for live QR code scanning
   - Implement QR code generation with customer card linking
   - Add QR validation and error handling
   - **Files:** `src/app/dashboard/selos/escaneamento/page.tsx`, QR generation utilities

2. **Digital Wallet Integration** - **CORE MVP FEATURE**
   - Apple Wallet PassKit certificate configuration
   - Pass generation API endpoints (`/api/wallet/pass/[customerCardId]`)
   - Google Pay Pass implementation
   - Real-time pass updates via webhooks
   - **Files:** `src/lib/wallet.ts`, Apple/Google Pay API integration

3. **Onboarding Flow Polish** - **USER EXPERIENCE**
   - Multi-step business setup with progress tracking
   - Logo upload to Supabase Storage integration
   - AI personality configuration (tone, brand voice)
   - Team member invitation system with role management

**Phase 2A (February-March 2025) - AI Integration**

4. **Basic AI Copilot** - **COMPETITIVE ADVANTAGE**
   - DeepSeek API integration for customer insights
   - Inactive customer detection (15+ days since last visit)
   - Simple campaign suggestions based on behavior patterns
   - One-click campaign creation interface
   - **Files:** `src/lib/ai-insights.ts`, dashboard components

5. **WhatsApp Business API** - **CUSTOMER COMMUNICATION**
   - Provider evaluation and selection (360Dialog vs Twilio vs ChatAPI)
   - Template message system for Brazilian compliance
   - Automated notifications for stamps/rewards
   - Manual campaign sending to customer segments
   - Message delivery tracking and analytics

**Phase 2B (April-May 2025) - Advanced Features**

6. **Advanced AI Marketing** - **DIFFERENTIATION**
   - FLUX.1 integration via fal.ai for promotional imagery
   - Natural language campaign generation with brand voice
   - A/B testing suggestions and optimization
   - Performance prediction models

7. **POS Integration Foundation** - **ROI TRACKING**
   - Brazilian payment processor API research (Stone, Cielo, GetNet)
   - Real-time purchase tracking linked to loyalty cards
   - Revenue attribution modeling for campaign ROI
   - Baseline vs performance comparison dashboard

#### **🏗️ ARCHITECTURAL DECISIONS**

**What We Got Right:**
- Business multi-tenancy with proper scoping prevents data leakage
- Component reusability (GiveStampDialog used across multiple pages)
- API design follows consistent patterns and error handling
- TypeScript interfaces properly model business logic
- Mobile-first approach ensures broad compatibility

**Technical Debt to Address:**
- Complete TypeScript `any` type elimination (currently in progress)
- Implement comprehensive RLS policy audit
- Add unit tests for critical business logic
- Optimize database queries for larger datasets
- Add proper logging and monitoring integration

#### **🎯 SUCCESS METRICS TRACKING**

**Completed Milestones:**
- ✅ Customer management system supports 1000+ customers per business
- ✅ LGPD compliance framework prevents legal issues
- ✅ Manual stamp attribution enables operational efficiency
- ✅ Customer segmentation allows targeted marketing

**Next Milestones:**
- 📱 60%+ customer enrollment rate via QR scanning
- 💳 Apple Wallet/Google Pay integration working end-to-end
- 🤖 AI insights provide actionable customer behavior analysis  
- 📈 WhatsApp campaigns achieve 25%+ engagement rates

#### **🔄 STRATEGIC PIVOTS FROM ORIGINAL PLAN**

**What Changed:**
1. **Customer Management Priority:** Moved from Phase 1C to 1B due to operational importance
2. **LGPD Compliance Depth:** Implemented more comprehensive framework than originally scoped
3. **Business Scoping:** Added robust multi-tenant architecture not in original plan
4. **Component Architecture:** Created more reusable components for operational efficiency

**Why These Changes Worked:**
- Earlier customer management completion enables better business validation
- Comprehensive LGPD compliance prevents future legal blockers
- Robust architecture supports scaling without major refactoring
- Operational tools (stamp attribution) provide immediate business value

#### **💡 KEY INSIGHTS FOR NEXT PHASE**

1. **QR Integration is Critical:** Digital wallet value depends on seamless QR scanning
2. **AI Must Be Practical:** Focus on actionable insights vs complex analytics
3. **WhatsApp Provider Research:** Brazilian compliance requirements are complex
4. **Mobile Experience:** All features must work perfectly on mobile devices
5. **Business Validation:** Each feature should solve real restaurant operational pain points

This strategic plan positions us ahead of the original GPT timeline while maintaining focus on core business value delivery.

## Development Rules & Documentation
**IMPORTANT**: Before implementing any feature, always follow these steps:

1. **Check PRD.md** - Understand feature requirements and business context
2. **Review API Documentation** - Check `/docs/` folder for relevant API docs:
   - `passkit-api.md` - Apple Wallet & Google Pay integration
   - `deepseek-api.md` - AI campaign generation and insights
   - `fal-ai-api.md` - FLUX.1 image generation for marketing
   - `development-rules.md` - Complete development workflow and standards
3. **Ask Questions** - When information is missing or unclear, ask before proceeding

### API Keys Configured
- ✅ **DeepSeek**: AI campaign generation and customer insights
- ✅ **FAL.AI**: FLUX.1 image generation for promotional content
- ✅ **Supabase**: Database, auth, and storage backend
- ⏳ **PassKit**: Digital wallet integration (to be configured)
- ⏳ **WhatsApp Business API**: Customer messaging (provider TBD)

## Development Rules & Guidelines

### Core Development Workflow
1. **Always check PRD first** (`docs/PRD.md`) for requirements and specifications
2. **Check API documentation** (`docs/passkit-api.md`, `docs/deepseek-api.md`, `docs/fal-ai-api.md`)
3. **Ask for clarification** if information is missing or unclear
4. **Never assume** API capabilities without checking documentation

### Available API Documentation
- **PassKit API** (`docs/passkit-api.md`) - Apple Wallet + Google Pay loyalty cards
- **DeepSeek API** (`docs/deepseek-api.md`) - AI campaign generation and customer insights
- **FAL.AI API** (`docs/fal-ai-api.md`) - FLUX image generation for promotional content
- **Development Rules** (`docs/development-rules.md`) - Complete development guidelines

### API Keys Configured
- ✅ DeepSeek AI: `sk-a1ebdaeadc6b44459940d3bc40fb6f36`
- ✅ FAL.AI FLUX: `791c05e6-beb4-4114-8036-64a52f39c6fa:4f5b9a7f03021af62598985027156208`
- ✅ Supabase: Real production credentials configured

## Important Notes
- Always maintain mobile-first approach
- Implement Portuguese localization from the start
- Ensure LGPD compliance in all data handling
- Use shadcn/ui components for consistent design
- Follow the established color palette for brand consistency
- **ALWAYS** check PRD and API documentation before implementing features
- **Never assume API capabilities** - Always check documentation first
- **Test integrations thoroughly** - Verify all API calls work correctly