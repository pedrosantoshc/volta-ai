Excellent. I have read the updated `docs/UX-improvements.md` file and integrated your answers. This is exactly the process we need to lock down the spec.

Your decisions have clarified many points and even introduced more sophisticated user flows, like the card deletion process.

Here is the revised and consolidated spec. I have:
1.  Removed the "Open Questions" and "Answers" sections.
2.  Replaced them with a clear **"Specifications & Decisions"** block in each category.
3.  Refined my previous "SaaS Industry Feedback" to align with your choices and deepen the analysis.

This is the final, unified spec ready for implementation. I recommend replacing the entire content of `docs/UX-improvements.md` with the following.

### Loyaltea – UX/Product Improvement Spec (v1)

This document captures current UX issues, solutions, and key decisions. It is the source of truth for the next development cycle.

---

### Dashboard (`/dashboard`)

*   **Problems**
    *   The page doesn’t immediately convey value or guide user actions.
    *   Metrics cards have low visual emphasis.
*   **Proposed Changes**
    *   Add a compact, actionable "Insights" stripe.
    *   Restyle stat cards for larger numeric weight and higher contrast.
*   **Specifications & Decisions**
    *   **Dashboard Snippets:** The three insights to display are:
        1.  Best-performing campaign.
        2.  Customers close to a reward.
        3.  Inactive customers to re-engage.
*   **SaaS Industry Feedback & Journey Analysis**
    *   **The "Welcome Mat" & "Mission Control" Journey:** The dashboard must orient new users and provide a "mission control" for returning ones, answering, "How is my business?" and "What needs my attention?"
    *   **Action-Oriented Design:** Each metric card must be a launchpad. If "Campanhas Enviadas" is 0, the card should feature a CTA to "Lançar sua primeira campanha." Use sparkline charts within the cards to show trends, which is more impactful than static numbers.
    *   **Onboarding Checklist:** A persistent, dismissible onboarding checklist for new users (e.g., "Step 1: Create a card," "Step 2: Add customers") is a standard, highly effective pattern to guide users to the "aha!" moment.

---

### Clientes (`/dashboard/clientes`)

*   **Problems**
    *   "Selecionar todos" is awkwardly placed.
    *   KPI boxes are not center-aligned.
    *   Actions are not conditional based on whether a customer has a card.
    *   No clear path to message a customer.
    *   LGPD/Consent details clutter the main list.
*   **Proposed Changes**
    *   Move "Selecionar todos" into the filter row.
    *   Center-align KPI box text and emphasize numbers.
    *   Implement conditional actions: "Adicionar Cartão" (no card) vs. "Dar Selo" (has card).
    *   Add an "Enviar mensagem" action (add to campaign or send individual message).
    *   Move consent details into the "Ver Detalhes" view.
*   **Specifications & Decisions**
    *   **Add Card Flow:** When clicking "Adicionar Cartão," if there is only one active loyalty card, assign it by default. If there are multiple, the button should open a dropdown menu for selection.
    *   **Messaging Channel:** For now, all messaging (individual and campaign) will be via **WhatsApp** template messages only.
*   **SaaS Industry Feedback & Journey Analysis**
    *   **From List to CRM:** This page is the heart of your CRM. The `/clientes/[id]` page is critical and must show a reverse-chronological timeline of every interaction: enrollment, stamps, redemptions, campaigns received (and opens/clicks). This is a standard feature in modern CRMs.
    *   **Powerful Bulk Actions:** When a user selects one or more customers, a contextual action bar should appear (typically at the bottom of the screen) with options like "Adicionar a uma campanha," "Exportar," "Excluir." This is a more scalable pattern than row-level actions.

---

### Cartões (`/dashboard/cartoes`)

*   **Problems**
    *   Cannot delete cards.
    *   Logos do not render.
    *   The new-card form is confusing (two description fields) and limiting (only emojis for icons).
*   **Proposed Changes**
    *   Allow logo uploads and custom PNGs for stamp icons.
    *   Revise the new-card form to be clearer: separate internal name from the on-card title and have a single description field.
*   **Specifications & Decisions**
    *   **Deletion Policy:** Implement a sophisticated delete flow. When a user tries to delete a card with active customers, present a modal with a warning and three options:
        1.  **Transpose stamps to a new card.**
        2.  **Delete anyway** (orphaning the in-progress stamps).
        3.  **Create a segment** of these customers (allowing for a targeted "this campaign is over" message).
    *   **Stamp Icon:** Follow industry standards for user-uploaded icons. Recommend a square PNG (e.g., 256x256px) and handle resizing.
*   **SaaS Industry Feedback & Journey Analysis**
    *   **"Product Catalog" Mentality:** Treat this page as the business's "product catalog." Each card listed should display its own key KPIs: number of active customers, total stamps given, and completion rate. This turns the list into a performance dashboard.
    *   **Creation Wizard:** Convert the long creation form into a multi-step wizard to reduce cognitive load: Step 1 (Basics), Step 2 (Design), Step 3 (Rules). Always show a live preview throughout the process.
---

### Selos (`/dashboard/selos`)

*   **Problems**
    *   UI doesn't update after stamp/redemption actions.
    *   Stamp limits are not enforced on the frontend.
    *   No defined flow for card completion.
    *   The establishment-facing "Scan QR code" is not a valid user journey.
*   **Proposed Changes**
    *   Use optimistic UI updates for stamp actions.
    *   Enforce stamp limits on the server and reflect them in the UI.
    *   Remove the QR scanning feature from this page.
    *   Add a flow to assign a card to a customer who doesn't have one.
*   **Specifications & Decisions**
    *   **New Card on Completion:** When a card is completed, **always prompt** the user with a modal asking if they want to create a new card for the customer.
    *   **Stamps Per Day:** This will be a configurable rule on the loyalty card itself. The "Dar Selo" action will enforce this limit.
    *   **Card Uniqueness:** For the current scope, a customer can only have **one active card at a time**, simplifying the "give stamp" logic.
*   **SaaS Industry Feedback & Journey Analysis**
    *   **The "Point of Sale" Experience:** This is a frontline tool for busy staff. The UI must be optimized for **speed and accuracy**. It should be built around a single, powerful search bar: "Find Customer (by name, phone)." Once a customer is selected, the available actions ("Dar Selo," "Resgatar Recompensa") become obvious.
    *   **Activity Feed:** Include a simple "Histórico de Atividade Recente" on this page, showing the last 5-10 transactions to provide a valuable audit trail for managers.

---

### Campanhas (`/dashboard/campanhas`)

*   **Problems**
    *   Segment creation is just a name/description with no logic.
    *   AI generation is a black box with no user input.
*   **Proposed Changes**
    *   Build a proper segment builder with filter-based logic.
    *   Allow users to provide a prompt to guide the AI, which is then optimized by our system.
*   **Specifications & Decisions**
    *   **Channel:** The only supported channel is **WhatsApp**.
    *   **AI Personality Configuration:** Create a new settings area where users can define their AI's personality. It should include:
        *   Pre-defined tone of voice choices (e.g., Amigável, Profissional).
        *   An open text field for them to describe their business/brand value proposition.
        *   Fields for their website and social media links.
        The prompt optimizer will use this data to craft highly personalized messages.
*   **SaaS Industry Feedback & Journey Analysis**
    *   **The Marketer's Workflow:** This section must support the standard marketing workflow: **Segment -> Create -> Preview -> Send/Schedule -> Analyze**.
    *   **Campaign Analytics are Key:** The main page must list all campaigns and show core metrics for each: `Recipients`, `Opens`, `Clicks`, and ideally a measure of `ROI`. Without this feedback loop, the feature's value is drastically reduced.
    *   **Drafts & Scheduling:** Users must be able to save campaigns as drafts and schedule them for future delivery. These are non-negotiable features for a marketing tool.

---

### Insights (`/dashboard/insights`)

*   **Problems**
    *   Very slow to load.
    *   Insights are inconsistent and not standardized.
*   **Proposed Changes**
    *   Standardize a set of fixed and dynamic insights.
    *   Use pre-computation and caching to improve performance.
*   **Specifications & Decisions**
    *   **Fixed Insights (Locking these in):**
        1.  Best performing campaign this month.
        2.  New customers enrolled this month vs. last.
        3.  Customers near reward (within 1-2 stamps).
        4.  Redemption rate trend (last 30 days).
        5.  Active vs. occasional customers ratio.
        6.  Message send volume and delivery rate.
    *   **Refresh Frequency:** Data will be refreshed **hourly**.
*   **SaaS Industry Feedback & Journey Analysis**
    *   **From Data to Narrative:** Insights must tell a story and guide a decision.
    *   **Actionability is Everything:** Every insight must have a "call to action" button.
        *   *Insight:* "You have 31 'clientes eventuais' who haven't visited in 60 days." -> **Action Button:** "Criar campanha de reengajamento". This button should take the user to the campaign creation page with this exact segment of 31 customers pre-loaded.

---

### Overarching SaaS Principles & Blind Spots

*   **Empty States:** Every page, when empty, must explain its purpose and provide a clear primary CTA to get started (e.g., the `Clientes` page should have an "Importar Clientes" button).
*   **Help & Support:** A persistent help icon ("?") should link to documentation or tutorials.
*   **Notifications & Feedback:** Use non-blocking toast notifications ("Selo adicionado com sucesso") to provide immediate feedback for all user actions.

---

### Suggested Next Steps (Order of Implementation)

1.  **Clientes UX fixes** (filters, conditional actions, KPI alignment, consent visibility).
2.  **Selos correctness & UX** (optimistic updates, server-side rule enforcement, completion flow).
3.  **Cartões form overhaul**, logo/custom stamp upload, and the full deletion flow.
4.  **Dashboard** metric and insight snippet implementation.
5.  **Campanhas** segment builder MVP and the AI personality configuration.
6.  **Insights** standardization and performance optimization (caching).