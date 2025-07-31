# Vercel Deployment Guide

## Environment Variables Configuration

Configure these environment variables in your Vercel dashboard for proper deployment:

### Required Supabase Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**How to find these values:**
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Copy the Project URL for `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the `anon` `public` key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy the `service_role` `secret` key for `SUPABASE_SERVICE_ROLE_KEY`

### Authentication Variables

```bash
# Google OAuth (if using Google Sign-In)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.vercel.app
```

**Google OAuth Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your Vercel domain to authorized origins
6. Add `https://your-domain.vercel.app/auth/callback/google` to authorized redirect URIs

### Storage Configuration

```bash
# Supabase Storage Bucket Names
NEXT_PUBLIC_LOGO_UPLOADS_BUCKET=logo-uploads
```

**Storage Setup:**
1. In Supabase dashboard, go to Storage
2. Create bucket named `logo-uploads`
3. Set bucket to public if you want direct access to uploaded images
4. Configure RLS policies for secure access

### Optional Variables

```bash
# Analytics (if implementing)
NEXT_PUBLIC_GA_TRACKING_ID=GA_TRACKING_ID

# Error Monitoring (if implementing)
SENTRY_DSN=your-sentry-dsn

# Email Service (if implementing)
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@your-domain.com

# WhatsApp Integration (if implementing)
WHATSAPP_API_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
```

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### 2. Configure Environment Variables

1. In your Vercel project dashboard
2. Go to Settings > Environment Variables
3. Add all required variables listed above
4. Make sure to select appropriate environments (Production, Preview, Development)

### 3. Configure Domains (Optional)

1. Go to Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` and Google OAuth settings with new domain

### 4. Database Setup

Ensure your Supabase database is properly configured:

```sql
-- Run this in Supabase SQL Editor to ensure RLS is properly set up
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty_cards ENABLE ROW LEVEL SECURITY;

-- Create storage bucket policies
INSERT INTO storage.buckets (id, name, public) VALUES ('logo-uploads', 'logo-uploads', true);
```

## Environment-Specific Configuration

### Production Environment

Use these values for production deployment:

```bash
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXTAUTH_URL=https://your-domain.com
```

### Preview/Staging Environment

Use these for preview deployments:

```bash
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXTAUTH_URL=https://your-preview-branch-git-branch-name.vercel.app
```

## Troubleshooting

### Common Issues

1. **Authentication not working:**
   - Check `NEXTAUTH_URL` matches your deployment URL
   - Verify Google OAuth redirect URIs include your domain
   - Ensure `NEXTAUTH_SECRET` is set in production

2. **Database connection issues:**
   - Verify Supabase URL and keys are correct
   - Check RLS policies are properly configured
   - Ensure service role key has proper permissions

3. **Image uploads failing:**
   - Verify storage bucket exists in Supabase
   - Check bucket policies allow public access
   - Ensure bucket name matches environment variable

4. **Build failures:**
   - Check all required environment variables are set
   - Verify TypeScript types are correct
   - Review build logs for specific errors

### Debugging Tips

1. Enable Vercel function logs:
   ```bash
   vercel logs your-deployment-url
   ```

2. Check browser console for client-side errors

3. Verify environment variables in Vercel dashboard

4. Test API endpoints with Postman or curl

## Security Checklist

- [ ] All sensitive keys are in environment variables, not code
- [ ] `NEXTAUTH_SECRET` is a strong random string
- [ ] Google OAuth redirect URIs only include trusted domains
- [ ] Supabase RLS policies are properly configured
- [ ] Service role key is only used server-side
- [ ] CORS settings allow only necessary origins

## Performance Optimization

1. **Enable caching:**
   ```javascript
   // In next.config.js
   module.exports = {
     async headers() {
       return [
         {
           source: '/api/:path*',
           headers: [
             {
               key: 'Cache-Control',
               value: 's-maxage=1, stale-while-revalidate',
             },
           ],
         },
       ]
     },
   }
   ```

2. **Configure ISR for static pages:**
   ```javascript
   export async function getStaticProps() {
     return {
       props: {},
       revalidate: 3600, // 1 hour
     }
   }
   ```

3. **Enable compression and optimization:**
   ```javascript
   // In next.config.js
   module.exports = {
     compress: true,
     swcMinify: true,
     images: {
       domains: ['your-supabase-url.supabase.co'],
       formats: ['image/avif', 'image/webp'],
     },
   }
   ```

## Monitoring and Analytics

1. **Set up Vercel Analytics:**
   - Enable in Vercel dashboard
   - Add `@vercel/analytics` package
   - Configure in `_app.tsx`

2. **Error tracking with Sentry:**
   ```bash
   npm install @sentry/nextjs
   ```

3. **Performance monitoring:**
   - Use Vercel Speed Insights
   - Monitor Core Web Vitals
   - Set up alerts for performance degradation

## Backup and Recovery

1. **Database backups:**
   - Supabase automatically backs up your database
   - Configure additional backup strategies if needed

2. **Environment variable backup:**
   - Keep a secure copy of all environment variables
   - Use a password manager or secure note-taking app

3. **Code backups:**
   - Ensure GitHub repository is properly backed up
   - Consider additional git remotes for redundancy

---

**Last Updated:** July 31, 2025
**Version:** 1.0