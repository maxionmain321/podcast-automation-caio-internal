# Podcast Automation - Internal Tool

A minimal internal web app for automating podcast content creation workflows. Upload podcast files, generate transcripts with Whisper AI, create blog posts and show notes with Claude AI, and publish directly to WordPress.

## Features

- **Secure Authentication** - Simple email/password login for internal team access
- **File Upload** - Direct upload to Cloudflare R2 with presigned URLs or paste direct file URLs
- **Transcription** - Automated transcription via n8n webhook integration with Whisper
- **Content Generation** - AI-powered blog posts and show notes via Claude
- **WordPress Publishing** - One-click publishing with category and tag support
- **Activity Logging** - Track all workflow events and webhook responses

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4 + shadcn/ui
- **Storage**: Cloudflare R2 (S3-compatible)
- **Authentication**: JWT with HTTP-only cookies
- **Integrations**: n8n webhooks for AI processing

## Architecture Flow

\`\`\`
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│  Transcribe │────▶│  Generate   │────▶│   Publish   │
│   to R2     │     │  (Whisper)  │     │  (Claude)   │     │ (WordPress) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │                    │
      │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼
  R2 Bucket          n8n Webhook        n8n Webhook        n8n Webhook
                     (transcribe)        (generate)         (publish)
\`\`\`

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Cloudflare account with R2 enabled
- n8n instance with three configured webhooks
- WordPress site with API access

### Installation

1. **Clone or download this project**

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   \`\`\`

3. **Set up Cloudflare R2**

   a. Create an R2 bucket:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
   - Click "Create bucket"
   - Choose a bucket name (e.g., `podcast-files`)
   - Note your bucket name

   b. Create R2 API tokens:
   - In R2 dashboard, go to "Manage R2 API Tokens"
   - Click "Create API token"
   - Give it a name (e.g., `podcast-app-token`)
   - Set permissions: "Object Read & Write"
   - Select your bucket or allow all buckets
   - Copy the Access Key ID and Secret Access Key

   c. Get your Account ID:
   - Found in the R2 dashboard URL or in your Cloudflare account settings
   - Format: `https://dash.cloudflare.com/<ACCOUNT_ID>/r2`

4. **Configure environment variables**
   
   Copy `.env.example` to `.env.local`:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

   Fill in all required values:
   \`\`\`env
   # Authentication
   ADMIN_EMAIL=admin@company.com
   ADMIN_PASS=your-secure-password
   JWT_SECRET=your-jwt-secret-key-min-32-chars

   # Cloudflare R2 Configuration
   AWS_ACCESS_KEY_ID=your-r2-access-key-id
   AWS_SECRET_ACCESS_KEY=your-r2-secret-access-key
   S3_BUCKET=your-r2-bucket-name
   CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id

   # n8n Webhook URLs
   N8N_TRANSCRIBE_WEBHOOK=https://your-n8n.com/webhook/transcribe
   N8N_GENERATE_WEBHOOK=https://your-n8n.com/webhook/generate
   N8N_PUBLISH_WEBHOOK=https://your-n8n.com/webhook/publish

   # Webhook Security
   WEBHOOK_SECRET=your-webhook-secret-key
   CALLBACK_SECRET=your-callback-secret-key

   # Vercel
   NEXT_PUBLIC_VERCEL_URL=http://localhost:3000
   \`\`\`

5. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Open [http://localhost:3000](http://localhost:3000)**

## Cloudflare R2 Configuration

### Why R2?

Cloudflare R2 is S3-compatible object storage with:
- Zero egress fees (no bandwidth charges)
- S3-compatible API (works with AWS SDK)
- Global distribution via Cloudflare's network
- Competitive pricing

### R2 Endpoint Configuration

The app uses the following endpoint pattern:
\`\`\`
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
\`\`\`

For public access, you can configure a custom domain in the R2 dashboard.

### CORS Configuration (REQUIRED for uploads)

**⚠️ IMPORTANT**: The app uses presigned URLs for file uploads, which require CORS to be properly configured on your R2 bucket. Without CORS, uploads will fail with "Failed to fetch" errors.

**Configure CORS in R2 Dashboard**:

1. Go to your R2 bucket in the Cloudflare dashboard
2. Navigate to "Settings" tab
3. Scroll to "CORS Policy" section
4. Add the following configuration:

\`\`\`json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.vercel.app"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST"
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

**Important Notes**:
- Replace `https://your-production-domain.vercel.app` with your actual production URL
- Add all domains where the app will be accessed (development, staging, production)
- The `PUT` method is essential for presigned URL uploads
- `ExposeHeaders` with `ETag` helps with upload verification

**Alternative: Using Wrangler CLI**:

\`\`\`bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create cors.json with the configuration above

# Apply CORS configuration
wrangler r2 bucket cors put <BUCKET_NAME> --file cors.json

# Verify CORS configuration
wrangler r2 bucket cors get <BUCKET_NAME>
\`\`\`

**Troubleshooting CORS**:
- If uploads fail with "Failed to fetch", check CORS configuration
- Verify your domain is in the `AllowedOrigins` list
- Ensure `PUT` is in `AllowedMethods`
- Check browser console for specific CORS error messages
- If testing locally, include `http://localhost:3000` in allowed origins

## n8n Webhook Configuration

### 1. Transcribe Webhook

**Endpoint**: `N8N_TRANSCRIBE_WEBHOOK`

**Request Format**:
\`\`\`json
{
  "audio_url": "https://bucket.account-id.r2.cloudflarestorage.com/file.mp3",
  "episode_title": "Episode Title",
  "metadata": {
    "filename": "file.mp3",
    "size": 12345678
  }
}
\`\`\`

**Response Format** (Synchronous - Recommended):
\`\`\`json
{
  "success": true,
  "transcript": "Full transcript text here...",
  "episode_title": "Episode Title",
  "transcription_id": "unique-id",
  "metadata": {...},
  "status": "completed"
}
\`\`\`

**Alternative: Asynchronous with Callback**

If your transcription takes a long time, you can return immediately and POST the result later:

Initial Response:
\`\`\`json
{
  "jobId": "unique-job-id",
  "status": "processing"
}
\`\`\`

Then at the end of your n8n workflow, POST to:
`POST https://your-app-url.vercel.app/api/webhook/transcribe-callback`

With headers:
\`\`\`
X-Callback-Secret: your-callback-secret
Content-Type: application/json
\`\`\`

Body:
\`\`\`json
{
  "transcript_text": "Full transcript text here...",
  "episode_title": "Episode Title",
  "transcription_id": "unique-id",
  "metadata": {...},
  "status": "completed",
  "jobId": "unique-job-id"
}
\`\`\`

**Note**: The app automatically polls for transcript updates every 2 seconds after redirecting to the transcript page, so both synchronous and asynchronous approaches work.

### 2. Generate Webhook

**Endpoint**: `N8N_GENERATE_WEBHOOK`

**Request Format**:
\`\`\`json
{
  "transcript_text": "Full transcript...",
  "episode_title": "Episode Title",
  "workflowId": "workflow_123_abc",
  "callback_url": "https://your-app.vercel.app/api/webhook/generate-callback",
  "metadata": {
    "transcript_length": 5000,
    "word_count": 850
  }
}
\`\`\`

**Response Format** (Asynchronous - Recommended):

The webhook should return immediately:
\`\`\`json
{
  "success": true,
  "status": "processing",
  "message": "Content generation started"
}
\`\`\`

**Then POST results to the callback URL** when complete:

**Callback URL**: `POST https://your-app.vercel.app/api/webhook/generate-callback`

**Headers**:
\`\`\`
Content-Type: application/json
\`\`\`

**Body**:
\`\`\`json
{
  "success": true,
  "workflowId": "workflow_123_abc",
  "titles": {
    "blog_titles": [
      "Title Option 1",
      "Title Option 2",
      "Title Option 3",
      "Title Option 4",
      "Title Option 5"
    ],
    "podcast_titles": [
      "Podcast Title 1",
      "Podcast Title 2",
      "Podcast Title 3",
      "Podcast Title 4",
      "Podcast Title 5"
    ]
  },
  "blog_post": {
    "markdown": "# Blog Title\n\n## Introduction\n\nContent here...",
    "word_count": 1200,
    "reading_time": "6 min"
  },
  "show_notes": {
    "episode_summary": "Summary of the episode...",
    "key_topics_discussed": ["Topic 1", "Topic 2", "Topic 3"],
    "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
    "notable_quotes": ["Quote 1", "Quote 2"],
    "timestamps": [
      {"time": "00:00", "topic": "Introduction"},
      {"time": "05:30", "topic": "Main topic discussion"}
    ]
  },
  "metadata": {
    "primary_keyword": "main topic keyword",
    "secondary_keywords": ["keyword 1", "keyword 2", "keyword 3"]
  }
}
\`\`\`

**Why Asynchronous?**

Content generation with Claude typically takes 2-5 minutes. Waiting for the response causes timeout errors (Error 524). By using the callback pattern:
- The webhook returns immediately, preventing timeouts
- The app polls for updates every 3 seconds
- Users can wait or navigate away and come back later
- No timeout or connection errors

**n8n Implementation**:

1. Your n8n workflow receives the generate request
2. Immediately respond with `{"success": true, "status": "processing"}`
3. Process the content generation (Claude API calls)
4. When complete, use an HTTP Request node to POST to the callback URL
5. Include the `workflowId` so the app knows which workflow to update

### 3. Publish Webhook

**Endpoint**: `N8N_PUBLISH_WEBHOOK`

**Request Format**:
\`\`\`json
{
  "seo_title": "Episode Title",
  "blog_post_html": "<h1>Title</h1><p>Content...</p>",
  "show_notes_html": "<ul><li>Note 1</li></ul>",
  "wordpress_category": "Podcast",
  "tags": ["podcast", "episode"],
  "publish_immediately": true
}
\`\`\`

**Response Format**:
\`\`\`json
{
  "success": true,
  "postUrl": "https://yoursite.com/blog/episode-title",
  "postId": 123
}
\`\`\`

## Manual Testing

Test the transcribe webhook manually:

\`\`\`bash
# Using curl
curl -X POST http://localhost:3000/api/webhook/transcribe \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{
    "audio_url": "https://example.com/test.mp3",
    "episode_title": "Test Episode"
  }'

# Using httpie
http POST localhost:3000/api/webhook/transcribe \
  Cookie:session=YOUR_SESSION_TOKEN \
  audio_url="https://example.com/test.mp3" \
  episode_title="Test Episode"
\`\`\`

## Deployment to Vercel

### Option 1: Deploy via v0 UI

1. Click the "Publish" button in the top right of the v0 interface
2. Follow the prompts to connect your Vercel account
3. Add all environment variables in the Vercel dashboard

### Option 2: Deploy via Vercel CLI

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables
vercel env add ADMIN_EMAIL
vercel env add ADMIN_PASS
vercel env add CLOUDFLARE_ACCOUNT_ID
# ... add all other env vars

# Deploy to production
vercel --prod
\`\`\`

### Option 3: Deploy via GitHub

1. Push code to GitHub repository
2. Import project in Vercel dashboard
3. Add environment variables in project settings
4. Deploy

## Security Considerations

- **Never commit `.env.local`** - Contains sensitive credentials
- **Use strong passwords** - For ADMIN_PASS and JWT_SECRET (min 32 chars)
- **Rotate secrets regularly** - Especially webhook secrets and R2 API tokens
- **Enable HTTPS** - Required in production for secure cookies
- **Limit file sizes** - Max 1.5GB enforced in upload validation
- **Validate webhooks** - Use WEBHOOK_SECRET and CALLBACK_SECRET headers
- **R2 bucket permissions** - Use least-privilege API tokens

## File Structure

\`\`\`
podcast-automate-v0/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── logout/route.ts
│   │   ├── upload/route.ts
│   │   ├── transcription-status/route.ts
│   │   └── webhook/
│   │       ├── transcribe/route.ts
│   │       ├── transcribe-callback/route.ts
│   │       ├── generate/route.ts
│   │       └── publish/route.ts
│   ├── dashboard/page.tsx
│   ├── login/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── activity-log.tsx
│   ├── content-generation-card.tsx
│   ├── dashboard-content.tsx
│   ├── login-form.tsx
│   ├── publish-card.tsx
│   ├── transcription-card.tsx
│   └── upload-card.tsx
├── lib/
│   ├── auth.ts
│   └── s3.ts                  # R2 client (S3-compatible)
├── middleware.ts
├── .env.example
├── package.json
├── README.md
└── tsconfig.json
\`\`\`

## Troubleshooting

### Upload fails

**"Failed to fetch" or CORS errors**:
- **Most common issue**: CORS not configured on R2 bucket
- Verify CORS configuration includes your domain in `AllowedOrigins`
- Ensure `PUT` method is in `AllowedMethods`
- Check browser console for specific CORS error messages
- If testing locally, include `http://localhost:3000` in allowed origins

**R2 API/credentials issues**:
- Check R2 API credentials in environment variables
- Verify CLOUDFLARE_ACCOUNT_ID is correct
- Verify R2 bucket exists and has correct permissions
- Ensure API token has "Object Read & Write" permissions

**Presigned URL issues**:
- Presigned URLs expire after 1 hour (3600 seconds)
- If upload takes too long, the URL may expire
- Check that `ChecksumAlgorithm` is disabled to avoid zlib.crc32 errors

### Transcription doesn't start
- Verify N8N_TRANSCRIBE_WEBHOOK is correct
- Check n8n workflow is active
- Verify WEBHOOK_SECRET matches in both systems

### Content generation fails
- Check N8N_GENERATE_WEBHOOK configuration
- Verify Claude API key in n8n workflow
- Check transcript is approved before generating

### Publishing fails
- Verify N8N_PUBLISH_WEBHOOK is correct
- Check WordPress API credentials in n8n
- Verify category and tags are valid

### Authentication issues
- Clear browser cookies and try again
- Verify ADMIN_EMAIL and ADMIN_PASS are set
- Check JWT_SECRET is at least 32 characters

### R2-specific issues
- Verify endpoint format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- Check R2 API token has correct permissions (Object Read & Write)
- Ensure bucket name doesn't contain invalid characters
- Note: R2 doesn't support all S3 features (ACLs, bucket versioning, etc.)

## Development Notes

### Regenerating with v0

This project was generated with v0. To iterate or regenerate:

1. Open v0.app
2. Reference this README and the original specification
3. Use prompts like:
   - "Add a settings modal for WordPress categories"
   - "Add support for multiple file uploads"
   - "Improve the transcript editor with syntax highlighting"

### Adding Features

Common feature requests:

- **Multiple file uploads**: Modify `upload-card.tsx` to accept arrays
- **Draft saving**: Add database integration (Supabase/Neon)
- **User management**: Extend auth system with role-based access
- **Analytics**: Track processing times and success rates
- **Notifications**: Add email/Slack notifications on completion

### Switching Back to AWS S3

If you need to switch back to AWS S3:

1. Update `lib/s3.ts` and `app/api/upload/route.ts`:
   - Remove `endpoint` configuration
   - Change `region: "auto"` to `region: process.env.S3_REGION || "us-east-1"`
2. Update `.env.example` to use AWS credentials
3. Update file URL format to use `s3.amazonaws.com`

## License

Internal use only - Not for public distribution

## Support

For issues or questions, contact your internal development team.
