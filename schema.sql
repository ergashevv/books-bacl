-- Supabase Database Schema for Online Kitob + Audiokitob App

-- 1. Profiles (Public user data)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text, -- Optional: user avatar
  updated_at timestamptz,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- 2. Categories
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.categories enable row level security;

-- Policies for Categories
create policy "Categories are viewable by everyone."
  on public.categories for select
  using ( true );

-- Only service role can modify categories (Admin/Supabase dashboard)
-- No insert/update policy for public/authenticated users.

-- 3. Books
create table public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text,
  description text,
  cover_path text, -- Path in storage bucket 'library'
  pdf_path text,   -- Path in storage bucket 'library'
  language text default 'uz',
  is_premium boolean default false,
  views int default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.books enable row level security;

-- Policies for Books
create policy "Books are viewable by everyone."
  on public.books for select
  using ( true );

-- Only service role can modify books.

-- 4. Book Categories (Junction table)
create table public.book_categories (
  book_id uuid references public.books(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  primary key (book_id, category_id)
);

-- Enable RLS
alter table public.book_categories enable row level security;

-- Policies for Book Categories
create policy "Book Categories are viewable by everyone."
  on public.book_categories for select
  using ( true );

-- 5. Audio Tracks
create table public.audio_tracks (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books(id) on delete cascade,
  title text,
  audio_path text, -- Path in storage bucket 'library'
  duration_seconds int,
  order_index int default 1,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.audio_tracks enable row level security;

-- Policies for Audio Tracks
create policy "Audio Tracks are viewable by everyone."
  on public.audio_tracks for select
  using ( true );

-- 6. Favorites
create table public.favorites (
  user_id uuid references auth.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, book_id)
);

-- Enable RLS
alter table public.favorites enable row level security;

-- Policies for Favorites
create policy "Users can view their own favorites."
  on public.favorites for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own favorites."
  on public.favorites for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own favorites."
  on public.favorites for delete
  using ( auth.uid() = user_id );

-- 7. User Book Progress
create table public.user_book_progress (
  user_id uuid references auth.users(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  last_page int,
  last_opened_at timestamptz default now(),
  primary key (user_id, book_id)
);

-- Enable RLS
alter table public.user_book_progress enable row level security;

-- Policies for User Book Progress
create policy "Users can view their own book progress."
  on public.user_book_progress for select
  using ( auth.uid() = user_id );

create policy "Users can insert/update their own book progress."
  on public.user_book_progress for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own book progress."
  on public.user_book_progress for update
  using ( auth.uid() = user_id );

-- 8. User Audio Progress
create table public.user_audio_progress (
  user_id uuid references auth.users(id) on delete cascade,
  audio_track_id uuid references public.audio_tracks(id) on delete cascade,
  position_seconds int default 0,
  completed boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, audio_track_id)
);

-- Enable RLS
alter table public.user_audio_progress enable row level security;

-- Policies for User Audio Progress
create policy "Users can view their own audio progress."
  on public.user_audio_progress for select
  using ( auth.uid() = user_id );

create policy "Users can manage their own audio progress."
  on public.user_audio_progress for all
  using ( auth.uid() = user_id );

-- 9. Subscriptions
create table public.subscriptions (
  user_id uuid references auth.users(id) on delete cascade primary key,
  plan text,
  expires_at timestamptz,
  provider text, -- e.g., 'click', 'payme', 'iap'
  status text default 'inactive' -- 'active', 'inactive', 'cancelled'
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies for Subscriptions
create policy "Users can view their own subscription."
  on public.subscriptions for select
  using ( auth.uid() = user_id );

-- Insert/Update only by service role (secure backend function or webhook).


-- FUNCTIONS & TRIGGERS

-- Function to handle new user signup -> create profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC Function to increment book views safely
create or replace function increment_book_views(book_id uuid)
returns void as $$
begin
  update public.books
  set views = views + 1
  where id = book_id;
end;
$$ language plpgsql security definer;

-- STORAGE POLICIES (For 'library' bucket)
-- Assumes you created a 'library' bucket in Supabase Storage.

-- 1. Public Content (Free Books):
-- In Supabase dashboard, set bucket to Public? Or handle via RLS.
-- RLS approach for storage.objects:
-- Allow SELECT if bucket_id = 'library' AND (auth.role() = 'authenticated' OR user is logged in).
-- But we need to restrict PREMIUM content.

-- Storage policy is complex in SQL. Usually done in Dashboard UI policy editor.
-- Example logic:
-- SELECT allowed if:
-- (bucket_id = 'library') AND
-- (
--   (auth.role() = 'authenticated') -- Basic access
--   AND
--   (
--     -- Check if file belongs to a PREMIUM book?
--     -- This requires a join or a consistent naming convention / metadata.
--     -- For MVP, use Signed URLs generated by backend/RPC if needed, OR:
--     -- Just allow authenticated users to read for now, client app respects 'is_premium'.
--     -- Real security: Use a Postgres function to verify access and generate signed URL.
--   )
-- )

