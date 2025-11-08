# Cloudflare R2 Setup Guide

## Overview
This application uses Cloudflare R2 for podcast file storage. R2 is S3-compatible and requires proper CORS configuration for browser uploads.

## Step 1: Create R2 Bucket

1. Go to Cloudflare Dashboard → R2 Object Storage
2. Click "Create bucket"
3. Name your bucket (e.g., `podcast-files`)
4. Click "Create bucket"

## Step 2: Configure CORS for Browser Uploads

**Important:** Browser uploads require CORS to be properly configured.

### Option A: Using Cloudflare Dashboard

1. Go to your R2 bucket settings
2. Navigate to "Settings" tab
3. Scroll to "CORS Policy"
4. Add the following CORS configuration:

\`\`\`json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
\`\`\`

### Option B: Using Wrangler CLI

\`\`\`bash
# Install wrangler if you haven't
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create cors.json file with the configuration above

# Apply CORS configuration
wrangler r2 bucket cors put <BUCKET_NAME> --file cors.json
\`\`\`

## Step 3: Create R2 API Token

1. In R2 Overview, click "Manage R2 API Tokens"
2. Click "Create API Token"
3. Name it (e.g., `podcast-automation-token`)
4. Set permissions:
   - **Object Read & Write** for your bucket
5. Click "Create API Token"
6. Copy the Access Key ID and Secret Access Key

## Step 4: Configure Public Access (Optional)

For public file access, you have two options:

### Option A: R2.dev Subdomain (Free)
1. Go to bucket settings
2. Enable "Public Access via R2.dev"
3. Note the R2.dev URL (e.g., `https://pub-xxx.r2.dev`)
4. Set this as `S3_PUBLIC_URL` environment variable

### Option B: Custom Domain (Recommended)
1. Go to bucket settings → "Custom Domains"
2. Click "Connect Domain"
3. Enter your domain (e.g., `cdn.yourdomain.com`)
4. Follow DNS setup instructions
5. Set this as `S3_PUBLIC_URL` environment variable

## Step 5: Set Environment Variables

Add these to your Vercel project or `.env.local`:

\`\`\`env
# R2 Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
AWS_ACCESS_KEY_ID=your_r2_access_key_here
AWS_SECRET_ACCESS_KEY=your_r2_secret_key_here
S3_BUCKET=your_bucket_name_here
S3_REGION=auto

# Public URL (choose one option)
S3_PUBLIC_URL=https://pub-xxx.r2.dev  # Option A: R2.dev
# OR
S3_PUBLIC_URL=https://cdn.yourdomain.com  # Option B: Custom domain
\`\`\`

## Step 6: Test Upload

1. Start your development server: `npm run dev`
2. Go to `/dashboard`
3. Try uploading a small test file
4. Check browser console for any CORS errors
5. Verify file appears in R2 bucket

## Troubleshooting

### "Failed to fetch" or CORS errors
- Ensure CORS is properly configured in R2 bucket
- Check that your origin URL is in the `AllowedOrigins` list
- Verify `PUT` method is in `AllowedMethods`

### "Access Denied" errors
- Verify R2 API token has Read & Write permissions
- Check that environment variables are correct
- Ensure bucket name matches `S3_BUCKET` env var

### Files upload but can't be accessed
- Configure public access (R2.dev or custom domain)
- Set correct `S3_PUBLIC_URL` environment variable
- Check bucket public access settings

### Large file uploads timing out
- Increase `maxDuration` in API route (already set to 300s)
- Consider using R2's multipart upload for files >100MB
- Check your network connection

## Production Deployment

1. Deploy to Vercel
2. Add environment variables in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add all R2 configuration variables
3. Update CORS `AllowedOrigins` to include your production domain
4. Test uploads in production environment

## Security Best Practices

1. **Never commit API tokens** - Always use environment variables
2. **Restrict CORS origins** - Only allow your actual domains
3. **Use custom domains** - More professional than R2.dev subdomains
4. **Rotate tokens periodically** - Create new tokens every 90 days
5. **Monitor usage** - Check R2 dashboard for unexpected activity

## Cost Considerations

- **Storage**: $0.015 per GB/month
- **Class A Operations** (writes): $4.50 per million requests
- **Class B Operations** (reads): $0.36 per million requests
- **Egress**: FREE (no bandwidth charges)

For a typical podcast automation workflow:
- ~100GB storage: ~$1.50/month
- ~1000 uploads/month: ~$0.005/month
- Unlimited downloads: $0

**Total estimated cost: ~$2/month for moderate usage**

## Additional Resources

- [R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [CORS Configuration](https://developers.cloudflare.com/r2/buckets/cors/)
- [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
