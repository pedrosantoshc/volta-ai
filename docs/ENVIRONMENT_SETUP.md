# Environment Setup Guide

This guide helps you set up all required environment variables for the Loyaltea application.

## Quick Setup

1. Copy the environment variables below into a new `.env.local` file in your project root:

```bash
# Create .env.local file
cp docs/env-template.txt .env.local
```

Or manually create `.env.local` with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ayrcywkhtnipaufowxyp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cmN5d2todG5pcGF1Zm93eHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NjUzNzcsImV4cCI6MjA1MDA0MTM3N30.L7HbWGFVQpJE6DLSKxSWX9fDK2FZ6y-HSMn-nD8S8Tc

# DeepSeek AI API (for campaign generation)
DEEPSEEK_API_KEY=sk-a1ebdaeadc6b44459940d3bc40fb6f36

# FAL.AI API (for image generation - optional)
FAL_AI_API_KEY=791c05e6-beb4-4114-8036-64a52f39c6fa:4f5b9a7f03021af62598985027156208

# PassKit API (for Apple Wallet integration - optional, future feature)
# PASSKIT_API_KEY=your_passkit_api_key
# PASSKIT_TEMPLATE_ID=your_template_id
```

## Environment Variables Explained

### Required for Core Functionality

1. **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
   - Used for: Database, authentication, real-time features
   - Required: ✅ Yes

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase anonymous key
   - Used for: Client-side database access
   - Required: ✅ Yes

3. **DEEPSEEK_API_KEY**: DeepSeek AI API key
   - Used for: AI-powered campaign generation
   - Required: ✅ Yes (for AI features)
   - Fallback: Basic templates if not provided

### Optional Features

4. **FAL_AI_API_KEY**: FAL.AI API key
   - Used for: AI image generation in campaigns
   - Required: ❌ No (future feature)

5. **PASSKIT_API_KEY** & **PASSKIT_TEMPLATE_ID**: PassKit configuration
   - Used for: Apple Wallet integration
   - Required: ❌ No (future feature)

## Verifying Your Setup

1. Start the development server:
```bash
npm run dev
```

2. Check the browser console for any missing environment variable warnings

3. Test AI campaign generation in `/dashboard/campanhas/nova`

4. Verify authentication and dashboard data loading

## Troubleshooting

### AI Campaign Generation Not Working
- Ensure `DEEPSEEK_API_KEY` is set correctly
- Check browser network tab for API errors
- Verify the API key hasn't expired

### Login Issues / Session Not Persisting
- Verify Supabase environment variables are correct
- Check that middleware is working (should be automatic)
- Clear browser cookies and try again

### Dashboard Showing Zeros
- Ensure Supabase connection is working
- Check that you have created loyalty cards
- Verify database permissions

## Security Notes

- Never commit `.env.local` to version control
- The provided API keys are for development only
- In production, use your own API keys
- Rotate keys regularly for security