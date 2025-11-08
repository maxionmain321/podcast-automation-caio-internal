# Podcast Automation Workflow

This internal tool provides a streamlined 3-step workflow for podcast content automation.

## Workflow Steps

### Step 1: Upload & Transcription (`/dashboard`)

1. **Upload your podcast file**
   - Drag and drop or browse for `.mp4`, `.mov`, or `.mp3` files (max 1.5GB)
   - Or paste a direct file URL
   - File is uploaded to S3 using presigned URLs

2. **Generate Transcript**
   - Click "Generate Transcript" to trigger the n8n transcription webhook
   - The system polls for completion or receives a callback
   - Transcript appears when ready

3. **Auto-redirect**
   - When transcription completes, you're automatically redirected to the transcript review page
   - Or click "Continue to Transcript Review" to proceed manually

**Activity Log** is visible on this page to track all workflow events.

---

### Step 2: Transcript Review & Content Generation (`/transcript/:id`)

1. **Review Transcript**
   - View the full transcript in a scrollable panel
   - Click "Edit" to make changes if needed
   - Click "Approve Transcript" when ready

2. **Generate Content**
   - Optionally add an episode title for better context
   - Click "Generate Content" to trigger the n8n content generation webhook
   - AI generates:
     - SEO-optimized title
     - Blog post HTML
     - Show notes HTML

3. **Review & Edit Generated Content**
   - Use tabs to view and edit each content type
   - Preview HTML in a new window
   - Regenerate if needed

4. **Continue to Publish**
   - Click "Continue to Publish" to move to the final step

---

### Step 3: Publish to WordPress (`/publish/:id`)

1. **Review Content**
   - Final review of SEO title, blog post, and show notes
   - Make any last-minute edits

2. **Configure Publishing Settings**
   - Set WordPress category (default: "Podcast")
   - Add tags (comma-separated)
   - Choose to publish immediately or save as draft

3. **Publish**
   - Click "Publish to WordPress" to trigger the n8n publish webhook
   - Success toast appears on completion
   - View published post or return to dashboard

---

## Technical Details

### State Management
- Workflow data is stored in browser localStorage
- Each workflow has a unique ID
- Data persists across page refreshes
- Includes: uploaded file, transcript, generated content, and activity log

### Authentication
- JWT-based authentication with HTTP-only cookies
- All routes except `/` and `/login` are protected
- Session expires based on JWT configuration

### Environment Variables
Required environment variables (configured in Vercel):
- `ADMIN_EMAIL` / `ADMIN_PASS` - Admin credentials
- `JWT_SECRET` - JWT signing secret
- `N8N_TRANSCRIBE_WEBHOOK` - n8n transcription webhook URL
- `N8N_GENERATE_WEBHOOK` - n8n content generation webhook URL
- `N8N_PUBLISH_WEBHOOK` - n8n WordPress publish webhook URL
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - S3 credentials
- `S3_BUCKET` / `S3_REGION` - S3 configuration
- `WEBHOOK_SECRET` / `CALLBACK_SECRET` - Webhook security

### API Routes
- `POST /api/upload` - Generate S3 presigned URL
- `POST /api/webhook/transcribe` - Trigger transcription
- `POST /api/webhook/transcribe-callback` - Receive transcription result
- `GET /api/transcription-status` - Poll transcription status
- `POST /api/webhook/generate` - Trigger content generation
- `POST /api/webhook/publish` - Trigger WordPress publishing
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout

---

## Development

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
\`\`\`

---

## Notes

- This is an internal tool - no public access
- All n8n webhooks must be configured and running
- S3 bucket must have proper CORS configuration
- WordPress API credentials must be configured in n8n
