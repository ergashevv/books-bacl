# Setting up Telegram Authentication

To enable "Login with Telegram" in your app, you need to configure Telegram as an OAuth provider in your Supabase project.

## Step 1: Create a Telegram Bot
1. Open Telegram and search for **@BotFather**.
2. Send the command `/newbot`.
3. Follow the instructions to create a new bot (choose a name and a username).
4. Once created, **BotFather** will give you an **API Token** (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`).
5. Keep this token safe.

## Step 2: Configure Supabase
1. Go to your **Supabase Dashboard**.
2. Navigate to **Authentication** -> **Providers**.
3. Find **Telegram** and toggle it to **Enabled**.
4. Enter the **Bot Token** you provided:
   `8590724909:AAHpMmi9b21S3jBqmDi61rj2pI-U0AKaV_Q`
5. In the **Callback URL (for your site)** field, enter your Supabase Project URL + `/auth/v1/callback` (Wait, for Telegram it's usually automatic for the widget, but for OAuth redirection flow... actually Supabase handles the Widget internally for Web).
   - **Crucial**: For React Native (Expo), we are using the `signInWithOAuth` flow which opens a browser.
   - You need to whitelist your redirect URL `book://login-callback` in **Authentication** -> **URL Configuration** -> **Redirect URLs**. Add `book://login-callback` there.

## Step 3: Test the App
1. Open the app.
2. Go to the **Login** or **Sign Up** screen.
3. Tap **Continue with Telegram**.
4. A browser window will open asking you to authorize via Telegram.
5. After authorization, it should redirect back to the app and log you in.

**Note**: If the redirect back to the app doesn't work, ensure you have added `book://login-callback` to the Redirect URLs in Supabase Dashboard.
