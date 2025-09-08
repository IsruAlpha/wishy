# Supabase Setup Guide for Wishper App

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - Project name: `wishper-app`
   - Database password: Choose a strong password
   - Region: Choose closest to your location
4. Click "Create new project"

## Step 2: Get Your Credentials

1. Go to **Settings → API** in your Supabase dashboard
2. Copy these values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Update Environment Variables

1. Open `gegema/.env.local` file
2. Replace the placeholder values with your actual credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

## Step 4: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the entire contents of `supabase-setup.sql` file
4. Click "Run" to execute the SQL

This will create:
- `wishes` table for storing user wishes
- `votes` table for upvotes/downvotes
- `comments` table for comments on wishes
- Proper indexes and Row Level Security policies

## Step 5: Test Your App

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000`
3. Try posting a wish - it should appear in real-time!
4. Try upvoting/downvoting and commenting

## Troubleshooting

- **"Missing Supabase environment variables"**: Make sure your `.env.local` file has the correct values
- **"Invalid URL"**: Check that your Supabase URL is correct and starts with `https://`
- **Database errors**: Make sure you ran the SQL setup script in Step 4

## Database Schema

### Wishes Table
- `id`: Primary key
- `text`: The wish/secret text
- `created_at`: Timestamp

### Votes Table
- `id`: Primary key
- `wish_id`: Foreign key to wishes
- `type`: Either 'upvote' or 'downvote'
- `created_at`: Timestamp

### Comments Table
- `id`: Primary key
- `wish_id`: Foreign key to wishes
- `text`: Comment text
- `created_at`: Timestamp

All tables have Row Level Security enabled with public read/write policies for now.



