# LoyaltyAI - Brazilian Restaurant Loyalty Platform
## Product Requirements Document

## Executive Summary

**Problem Statement:** Brazilian restaurants and high-end establishments rely on paper loyalty cards that customers frequently lose, creating friction in retention programs. Meanwhile, restaurant owners struggle with consistent, intelligent customer marketing due to lack of technical expertise and time constraints.

**Solution:** An AI-powered digital loyalty platform that converts paper stamp cards to Apple Wallet/Google Pay, combined with intelligent marketing automation that proactively suggests and executes WhatsApp campaigns based on customer behavior patterns.

**Business Impact:** Targets the underserved Brazilian SME market (15% digital loyalty penetration) with a $4.07B opportunity, positioning as the "Amplemarket Duo for restaurant marketing" - where AI handles customer insights and campaign creation automatically.

---

## 🎯 MVP Scope & Success Metrics

### Core MVP Features
1. **Digital Wallet Integration** - Apple Wallet/Google Pay loyalty card creation
2. **QR Code Enrollment** - Single-scan customer onboarding
3. **Business Management Dashboard** - Customer database and manual point attribution
4. **WhatsApp Integration** - Automated customer notifications
5. **Basic AI Copilot** - Simple customer behavior insights and campaign suggestions

### Success Metrics
- 5+ restaurant customers actively using the platform
- 200+ digital loyalty cards issued per venue
- 60%+ customer enrollment rate at participating restaurants
- 25%+ WhatsApp campaign engagement rates
- Proof of concept for AI-generated campaigns

---

## 🧑‍💼 User Stories & Personas

### Primary Users

**👨‍🍳 Restaurant Owner/Manager (High-End Venues)**
- *"I want customers to never lose their loyalty cards again"*
- *"I need my marketing to work automatically - I don't have time to think about campaigns"*
- *"I want to prove that loyalty programs actually increase revenue"*

**👥 Restaurant Customers**
- *"I want my loyalty card in my phone wallet, not another paper card"*
- *"I like getting personalized offers via WhatsApp"*
- *"I want to know how close I am to my next reward"*

### User Journey
```
Business Journey:
Create Account → Design Loyalty Card → Generate QR Codes → 
Customers Enroll → AI Suggests Campaigns → Approve & Send → Track ROI

Customer Journey:
Scan QR Code → Complete Enrollment Form (phone, email, custom questions) → 
Accept Terms & LGPD Consent → Loyalty Card Created → Add to Wallet → 
Earn Stamps → Receive WhatsApp Notifications → Redeem Rewards
```

---

## 🔧 Technical Architecture

### Tech Stack
- **Frontend:** Next.js 15 with App Router
- **UI Components:** Shadcn/ui with Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Hosting:** Vercel
- **AI Services:** 
  - DeepSeek API (text generation at $0.55/1M input, $2.19/1M output)
  - FLUX.1 via fal.ai (image generation at $0.025/MP for promotional content and card design)
- **Messaging:** WhatsApp Business API (provider TBD - evaluating 360Dialog, Twilio, ChatAPI)
- **Wallet Integration:** Apple Wallet PassKit + Google Pay API
- **File Storage:** Supabase Storage for images and QR codes
- **Analytics:** Vercel Analytics + custom dashboard

### Data Models

```typescript
interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo_url?: string;
  created_at: string;
  settings: BusinessSettings;
}

interface BusinessSettings {
  ai_tone: string; // "friendly", "professional", "casual"
  brand_voice: string; // Custom brand voice description
  auto_campaigns: boolean;
  whatsapp_enabled: boolean;
  apple_wallet_enabled: boolean;
  google_pay_enabled: boolean;
  baseline_metrics?: {
    monthly_customers: string; // Baseline: customers per month
    average_ticket: string; // Baseline: average spend per customer (R$)
    visit_frequency: string; // weekly | biweekly | monthly | quarterly | rarely
    retention_rate: string; // Baseline: customer retention percentage
    marketing_spend: string; // Baseline: monthly marketing investment (R$)
    captured_date: string; // When baseline was captured for ROI calculations
  };
}

interface LoyaltyCard {
  id: string;
  business_id: string;
  name: string;
  description: string;
  design: CardDesign;
  rules: LoyaltyRules;
  enrollment_form: EnrollmentForm;
  is_active: boolean;
  created_at: string;
}

interface CardDesign {
  template_id?: string; // MVP: predefined templates
  background_color: string;
  logo_url: string;
  header_text: string;
  footer_text: string;
  stamp_icon: string; // "coffee", "pizza", "generic"
  custom_background_url?: string; // Phase 2: AI-generated backgrounds
  ai_generated?: boolean; // Phase 2: track AI-created designs
}

interface EnrollmentForm {
  custom_questions: CustomQuestion[];
  require_email: boolean;
  require_phone: boolean;
  terms_text?: string; // Custom terms if needed
}

interface CustomQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'phone';
  options?: string[]; // For select/multiselect
  required: boolean;
  order: number;
}

interface LoyaltyRules {
  stamps_required: number; // e.g., 10 stamps = 1 free coffee
  reward_description: string;
  expiry_days?: number;
  max_stamps_per_day?: number;
}

interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  custom_fields: Record<string, any>; // Store custom form responses
  enrollment_date: string;
  total_visits: number;
  total_spent?: number; // Phase 2: POS integration
  last_visit?: string;
  loyalty_cards: CustomerLoyaltyCard[];
  tags: string[]; // "vip", "birthday_this_month", "inactive"
  consent: {
    lgpd_accepted: boolean;
    marketing_consent: boolean;
    terms_accepted: boolean;
    consent_date: string;
  };
}

interface CustomerLoyaltyCard {
  id: string;
  customer_id: string;
  loyalty_card_id: string;
  current_stamps: number;
  total_redeemed: number;
  wallet_pass_url?: string; // Apple Wallet/Google Pay URL
  qr_code: string;
  status: 'active' | 'completed' | 'expired';
  created_at: string;
}

interface Campaign {
  id: string;
  business_id: string;
  name: string;
  type: 'manual' | 'ai_generated';
  trigger: CampaignTrigger;
  content: CampaignContent;
  target_audience: CustomerSegment;
  schedule: CampaignSchedule;
  status: 'draft' | 'active' | 'paused' | 'completed';
  performance: CampaignMetrics;
  created_at: string;
}

interface CampaignTrigger {
  type: 'manual' | 'inactive_customers' | 'completed_cards' | 'birthday' | 'new_customers';
  conditions: {
    days_inactive?: number;
    customer_segments?: string[];
    recurring?: boolean;
  };
}

interface CampaignContent {
  message: string;
  image_url?: string;
  cta_text?: string;
  offer_details?: string;
}

interface CampaignMetrics {
  sent_count: number;
  delivered_count: number;
  read_count: number;
  clicked_count: number;
  converted_count: number;
  revenue_attributed?: number; // Phase 2
}

interface AIInsight {
  id: string;
  business_id: string;
  type: 'customer_segment' | 'campaign_suggestion' | 'revenue_opportunity';
  title: string;
  description: string;
  recommended_action: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  status: 'pending' | 'acted_on' | 'dismissed';
}
```

---

## 🎨 UI/UX Design Specifications

### Design Principles
- **Modern SaaS Aesthetic:** Clean, professional interface similar to successful B2B tools
- **Brazilian Localization:** Portuguese language, local cultural references, PIX integration ready
- **Mobile-First:** Restaurant owners manage from phones, customers use mobile wallets
- **AI-First UX:** Prominent AI suggestions, one-click campaign execution
- **Color Palette:**
  - Primary: Purple gradient (#7c3aed to #a855f7) - AI/premium feel
  - Success: Green (#16a34a) - positive metrics
  - Warning: Amber (#d97706) - attention needed
  - Background: Light gray (#f8fafc)

### Key UI Components

#### 1. AI Copilot Dashboard
```
🤖 AI Insight: 47 customers haven't visited in 15 days
   Suggested: "Miss You" WhatsApp campaign with 15% discount
   Expected Response: 23% | Revenue Impact: R$ 1,840
   
   [✨ Create Campaign] [📊 View Details] [❌ Dismiss]
```

#### 2. Loyalty Card Designer
```
┌─── Card Preview ───┐  ┌─── Settings ───┐
│ ☕ CAFÉ REDENTOR   │  │ Stamps: [10] ▼ │
│                    │  │ Reward: [____] │
│ ●●●○○○○○○○         │  │ Colors: [■■■]  │
│ 3/10 stamps        │  │ Icon: ☕ ▼     │
│ Free coffee!       │  │               │
└────────────────────┘  └───────────────┘
```

#### 3. WhatsApp Campaign Builder
```
👥 Target: Inactive customers (47 people)
📱 Channel: WhatsApp ○
🎨 Content: [AI Generate] [Manual Write]

✨ AI Suggestion:
"Olá [Nome]! Sentimos sua falta no Redentor Bar 🍺 
Volte essa semana e ganhe 15% de desconto!"

[🖼️ Generate Image] [📤 Send Campaign] [📅 Schedule]
```

---

## 📋 Feature Specifications

### MVP Phase: Core Loyalty Platform

#### Authentication & Business Setup
- **Supabase Auth** with email/password and Google OAuth
- **Business onboarding flow** with logo upload and basic settings
- **Team management** with role-based access (owner, staff)

#### Digital Loyalty Cards
- **Card design interface** with predefined templates for MVP
- **Custom enrollment forms** with business-specific questions
- **LGPD-compliant consent collection** during customer onboarding
- **Apple Wallet PassKit integration** for iOS users
- **Google Pay Pass integration** for Android users
- **QR code generation** with embedded enrollment flow
- **Real-time card updates** (stamp count, reward status)

#### Customer Management
- **Customer database** with search, filter, and segmentation
- **Manual customer addition** and bulk import from CSV
- **Customer profiles** with visit history and preferences
- **Tag system** for customer segmentation (VIP, Birthday, etc.)

#### Point/Stamp Attribution
- **Manual stamp addition** by restaurant staff
- **QR code scanning** for quick customer identification
- **Bulk operations** for busy periods
- **Stamp history** and audit trail

#### WhatsApp Integration
- **WhatsApp Business API** connection (provider TBD - evaluating 360Dialog, Twilio, ChatAPI)
- **Automated notifications** for stamp additions and rewards
- **Manual message sending** to individuals or groups
- **Message templates** for common scenarios

#### Basic AI Copilot
- **Customer behavior analysis** (inactive customers, frequent visitors)
- **Simple campaign suggestions** based on predefined rules
- **Success rate predictions** using historical data
- **One-click campaign creation** from AI suggestions

8. **Basic AI Copilot**
   - DeepSeek API integration for text generation
   - Simple customer behavior analysis
   - Rule-based campaign suggestions
   - One-click campaign creation Automation

#### Advanced AI Copilot (DeepSeek Integration)
- **Natural language campaign generation** with brand voice matching
- **Customer segmentation AI** based on behavior patterns
- **Optimal timing predictions** for maximum engagement
- **A/B testing suggestions** for campaign optimization
- **Performance analysis** with actionable insights

#### AI-Generated Visual Content (FLUX.1 via fal.ai)
- **Automated promotional images** for WhatsApp campaigns
- **AI-powered loyalty card design** with natural language input
- **Portuguese prompt interpretation** ("eu quero um cartão vermelho, com um símbolo de café no meio e minha logo")
- **Brand-consistent visual assets** matching restaurant aesthetic
- **Seasonal campaign imagery** (holidays, special events)
- **Social media ready content** in multiple formats
- **Template enhancement** using AI for custom modifications

#### Advanced Campaign Automation
- **Behavior-triggered campaigns** (inactive customers, completed cards)
- **Recurring campaign schedules** (weekly specials, monthly promotions)
- **Dynamic content personalization** per customer segment
- **Campaign performance optimization** with AI recommendations

#### ROI Tracking & Analytics
- **Revenue attribution modeling** linking campaigns to visits
- **Customer lifetime value** calculations
- **Loyalty program ROI** measurement
- **Comparative analysis** (loyalty vs non-loyalty customers)
- **Predictive analytics** for customer churn and value

#### POS System Integration
- **Payment processor APIs** (Stone, Cielo, GetNet)
- **Real-time purchase tracking** linked to loyalty cards
- **Automatic stamp attribution** based on spend thresholds
- **Revenue tracking** per customer and campaign
- **Integration webhooks** for popular Brazilian POS systems

### Backlog: Advanced Features

#### Enterprise Capabilities
- **Multi-location support** for restaurant chains
- **Franchisee management** with centralized control
- **Advanced role permissions** and user hierarchies
- **White-label solutions** for payment processors
- **API for third-party integrations**

#### Coalition Programs
- **Cross-brand loyalty** partnerships
- **Point exchange systems** between businesses
- **Shared customer databases** with privacy controls
- **Revenue sharing** for coalition campaigns
- **Network effect** marketing opportunities

#### Advanced AI Features
- **Predictive customer behavior** modeling
- **Dynamic pricing suggestions** based on demand
- **Inventory-based promotions** (promote items before expiry)
- **Competitor analysis** integration
- **Market trend integration** for campaign timing

#### Compliance & Advanced Security
- **LGPD compliance dashboard** with automated reporting
- **Data portability tools** for customer data requests
- **Advanced consent management** for marketing communications
- **Audit trails** for all customer data interactions
- **International expansion** compliance (Colombia, Mexico)

#### Advanced Analytics
- **Machine learning insights** for customer prediction
- **Market benchmarking** against industry standards
- **Custom dashboard builder** for specific business needs
- **Advanced cohort analysis** and customer journey mapping
- **Integration with Google Analytics** and Meta Pixel

---

## 🔒 Security & Privacy Considerations

### MVP Security Measures
- **Supabase RLS (Row Level Security)** for data isolation
- **JWT authentication** with secure token management
- **HTTPS enforcement** for all communications
- **Environment variable protection** for API keys
- **Input validation** and sanitization

### LGPD Compliance (Brazilian Data Protection)
- **Explicit consent** for data collection and WhatsApp messaging
- **Data minimization** - collect only necessary information
- **Right to deletion** - customers can remove their data
- **Data portability** - customers can export their data
- **Transparent privacy policy** in Portuguese

### WhatsApp Business API Compliance
- **Opt-in only** messaging with clear consent
- **24-hour messaging window** compliance
- **Template message approval** process
- **Unsubscribe mechanisms** in all campaigns
- **Rate limiting** to prevent spam

---

## 🚀 Development Phases

### Phase 1: MVP Foundation
1. **Project Setup**
   - Next.js 15 project initialization with TypeScript
   - Tailwind CSS and Shadcn/ui component library setup
   - Supabase integration (auth, database, storage)
   - Vercel deployment pipeline

2. **Authentication & Business Management**
   - Supabase Auth integration with email/password
   - Business registration and profile management
   - Basic settings and team member invitation

3. **Customer Enrollment System**
   - QR code scanning landing page
   - Custom enrollment form builder for businesses
   - LGPD consent collection and terms acceptance
   - Customer data validation and storage
   - Automatic loyalty card creation post-enrollment

4. **Digital Wallet Integration**
   - Apple Wallet PassKit implementation
   - Google Pay Pass generation
   - QR code creation and management
   - Real-time pass updates

5. **Customer Management System**
   - Customer database CRUD operations
   - Search, filter, and segmentation features
   - Custom field management from enrollment forms
   - Customer profile pages with complete interaction history

6. **Loyalty Card System**
   - Card design interface with predefined templates
   - Loyalty rules configuration (stamps, rewards)
   - Manual stamp attribution interface
   - Reward redemption tracking

7. **WhatsApp Integration**
   - WhatsApp Business API provider evaluation and selection
   - Template message system implementation
   - Automated notifications for stamps/rewards
   - Message history and delivery tracking
   - Compliance framework for Brazilian messaging regulations

### Phase 2: Advanced AI Marketing
   - Advanced customer segmentation with AI
   - Natural language campaign generation
   - Brand voice learning and matching
   - Performance prediction models

2. **Visual Content Generation**
   - FLUX.1 API integration via fal.ai
   - Automated promotional image creation
   - Brand-consistent visual generation
   - Social media content optimization

4. **Advanced Campaign Automation**
   - Behavior-triggered campaign systems
   - Multi-channel campaign coordination
   - Dynamic content personalization
   - A/B testing framework

4. **Advanced Analytics & ROI Tracking**
   - **Real-time ROI Dashboard**: Compare baseline metrics captured during onboarding with post-launch performance
   - **Campaign Revenue Attribution**: Link WhatsApp campaigns directly to customer visits and revenue
   - **Customer Lifetime Value (CLV)**: Calculate CLV with and without loyalty program participation
   - **Baseline Comparison Reports**: Show improvement in monthly customers, average ticket, retention rate, and visit frequency
   - **ROI Calculation Engine**: Automated formula: (Post-launch metrics - Baseline metrics) - Program Cost = Net ROI
   - **Predictive Analytics**: Forecast customer churn, CLV, and optimal campaign timing
   - **Loyalty vs Non-Loyalty Analysis**: Compare performance between loyalty program participants and regular customers
   - **Marketing Spend Efficiency**: Track ROI per campaign and overall marketing spend optimization
   - **Executive Summary Reports**: Monthly automated reports showing program impact on business growth

5. **ROI Tracking Implementation Requirements**
   - **Baseline Data Collection**: Capture business metrics during onboarding (monthly customers, average ticket, retention rate, visit frequency, marketing spend)
   - **POS Integration Dependency**: Real revenue tracking requires integration with Brazilian payment processors (Stone, Cielo, GetNet, PagSeguro)
   - **Manual Revenue Input**: Alternative for businesses without POS integration - manual revenue reporting interface
   - **Campaign Attribution Model**: Link campaigns to customer visits using QR code scans and loyalty card usage
   - **Performance Comparison Engine**: Compare pre-loyalty vs post-loyalty customer behavior patterns
   - **Cost Tracking**: Track loyalty program operational costs (platform fees, WhatsApp messages, staff time)
   - **ROI Dashboard Components**: 
     - Baseline vs Current Performance charts
     - Campaign ROI breakdown by type and audience
     - Customer segment performance analysis
     - Monthly/quarterly ROI summary reports
   - **Integration Timeline**: ROI features dependent on Phase 2 POS integration completion

6. **POS System Integration** (Required for Full ROI Tracking)
   - **Brazilian Payment Processors**: Stone, Cielo, GetNet, PagSeguro API integration
   - **Real-time Purchase Tracking**: Link transactions to loyalty card customers
   - **Automatic Stamp Attribution**: Award points based on spend thresholds
   - **Revenue Attribution**: Track which campaigns drive actual sales
   - **Transaction Analysis**: Compare spending patterns of loyalty vs non-loyalty customers

### Phase 3: Backlog Implementation
1. **Enterprise Features**
   - Multi-location management
   - Advanced user permissions
   - White-label solutions
   - API for integrations

2. **Advanced AI & Analytics**
   - Machine learning model implementation
   - Market trend integration
   - Competitor analysis features
   - Custom reporting tools

3. **Coalition Programs**
   - Cross-brand loyalty systems
   - Point exchange mechanisms
   - Network marketing features
   - Revenue sharing models

---

## 📊 Brazilian Market Integration

### Local Payment Systems
- **PIX integration** for instant payment confirmations
- **Brazilian payment processors** (Stone, Cielo, GetNet, PagSeguro)
- **Local banking APIs** for transaction correlation
- **Real currency formatting** and Brazilian tax compliance

### Cultural Adaptation
- **Portuguese language** throughout the platform
- **Brazilian business hours** and timezone handling
- **Local holiday calendars** for campaign scheduling
- **WhatsApp-first** communication (primary channel in Brazil)
- **Cultural messaging templates** for different occasions

### Regulatory Compliance
- **LGPD (Lei Geral de Proteção de Dados)** full compliance
- **Brazilian consumer protection** law adherence
- **Local tax reporting** capabilities for loyalty programs
- **Data residency requirements** (Brazilian data centers)

---

## 💰 Pricing Strategy & Business Model

### Freemium Model Structure
- **Free Tier:** Up to 100 customers, basic wallet integration, manual campaigns
- **Básico (R$ 79/month):** Up to 500 customers, WhatsApp integration, basic AI suggestions
- **Crescimento (R$ 139/month):** Up to 2000 customers, AI campaigns, advanced analytics
- **Negócios (R$ 249/month):** Unlimited customers, POS integration, multi-location

### AI Usage Pricing
- **DeepSeek API costs:** ~R$ 0.003 per AI-generated campaign (extremely low)
- **FLUX.1 image generation:** ~R$ 0.13 per promotional image
- **WhatsApp messaging:** R$ 0.02-0.05 per message (market rate)
- **Total AI cost per customer:** Under R$ 1/month even for active campaigns

---

## 📈 Success Metrics & KPIs

### MVP Success Indicators
- **Customer Acquisition:** 20+ restaurants signed up within 3 months
- **User Engagement:** 60%+ customer enrollment rate at participating venues
- **Technical Performance:** 99.5%+ uptime, <200ms response times
- **AI Effectiveness:** 25%+ campaign engagement rates

### Phase 2 Success Targets
- **Revenue Growth:** R$ 100K+ ARR within 12 months
- **Market Penetration:** 5% market share in target segments
- **Customer Satisfaction:** 4.5+ rating, <5% monthly churn
- **AI ROI:** 15:1 return on AI-generated campaigns
- **ROI Tracking:** Demonstrate measurable business impact through baseline comparison
- **POS Integration:** 50%+ of customers using integrated payment tracking

### Long-term Vision Goals
- **Market Leadership:** #1 loyalty platform for Brazilian SMEs
- **Revenue Scale:** R$ 5M+ ARR by year 3
- **Geographic Expansion:** Colombia and Mexico markets
- **Platform Integration:** Partnerships with major POS providers

---

## 🎯 Go-to-Market Strategy

### Target Market Prioritization
1. **Primary:** High-end restaurants and bars in São Paulo/Rio
2. **Secondary:** Coffee shops and açaí stores with premium positioning
3. **Expansion:** Beauty salons, retail stores, service businesses

### Distribution Channels
- **Direct sales:** Founder-led sales to premium venues
- **Partnership channel:** Payment processor integrations
- **Content marketing:** ROI case studies and success stories
- **Community building:** Restaurant owner WhatsApp groups

### Competitive Differentiation
- **AI-first approach:** Only platform with proactive marketing AI
- **Brazilian-specific:** Built for local market, LGPD compliant
- **ROI focus:** Prove revenue impact, not just engagement
- **Premium positioning:** Target quality over quantity customers

---

## 🔄 Integration Roadmap

### Immediate Integrations (MVP)
- **Apple Wallet PassKit** for iOS loyalty cards
- **Google Pay API** for Android loyalty cards
- **WhatsApp Business API** (provider evaluation: 360Dialog vs Twilio vs ChatAPI)
- **Supabase ecosystem** for backend services

### Phase 2 Integrations
- **WhatsApp Business API** (final provider based on MVP evaluation)
- **Brazilian payment processors** (Stone, Cielo, GetNet)
- **Popular POS systems** (Oracle Micros, NCR Aloha, local systems)
- **Email marketing platforms** (Mailchimp, SendGrid)
- **Analytics platforms** (Google Analytics, Meta Pixel)

### Future Integrations
- **ERP systems** used by restaurant chains
- **Accounting software** (ContaAzul, Omie) for revenue tracking
- **Delivery platforms** (iFood, Uber Eats) for customer data
- **Coalition partners** for cross-brand loyalty programs

---

## 📱 Technical Implementation Notes

### Next.js 15 Architecture
- **App Router** for file-based routing
- **Server Components** for optimal performance
- **Streaming** for AI-generated content
- **Edge Runtime** for global performance

### Supabase Integration
- **Database:** PostgreSQL with Row Level Security
- **Auth:** Built-in authentication with social logins
- **Storage:** File uploads for logos and generated images
- **Realtime:** Live updates for customer interactions
- **Edge Functions:** Custom business logic execution

### AI Integration Patterns
- **Streaming responses** for real-time AI generation
- **Caching strategies** for frequently used AI outputs
- **Error handling** for API failures and rate limits
- **Cost optimization** through intelligent prompt engineering

---

## ✅ Definition of Done

### MVP Acceptance Criteria
- ✅ Restaurant owner can create account and design loyalty card
- ✅ Customers can scan QR code and add card to Apple/Google Wallet
- ✅ Staff can manually add stamps and customers receive WhatsApp notifications
- ✅ AI suggests basic campaigns based on customer behavior
- ✅ Business owner can send WhatsApp campaigns to customer segments
- ✅ Platform tracks basic metrics (customers, stamps, campaign performance)
- ✅ Application is mobile-responsive and works offline
- ✅ Data is secure and LGPD compliant

### Phase 2 Acceptance Criteria
- ✅ AI generates personalized campaign content using brand voice
- ✅ FLUX.1 creates promotional images automatically
- ✅ POS integration tracks real revenue attribution
- ✅ Advanced analytics show loyalty program ROI
- ✅ Behavior-triggered campaigns run automatically

---

*This PRD serves as the comprehensive blueprint for building Brazil's first AI-powered loyalty platform specifically designed for the SME market. The focus is on proving genuine business value through measurable ROI while providing a magical user experience that feels like having a dedicated marketing team.* 🚀