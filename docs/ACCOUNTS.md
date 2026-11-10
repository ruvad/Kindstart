# Accounts (Supabase)

Accounts are built, but they stay **off** until `js/config.js` has your Supabase project's URL and publishable key. Until then, Me says "Accounts aren't switched on yet" and the app works only in the browser, as before.

## Switch them on (once, about 15 minutes)

Supabase's menus change now and then, so a name below may be slightly different.

1. **Project.** On [supabase.com](https://supabase.com), sign in (GitHub works) and create a new project on the Free plan. Keep the database password somewhere safe, outside the repo.
2. **Table and rules.** Open *SQL Editor*, paste all of [`supabase-setup.sql`](supabase-setup.sql), and press *Run*. It creates the table `user_data` and the rules that let each person read only their own row.
3. **Email confirmation off.** In *Authentication*, open the Email sign-in settings and turn off *Confirm email*.
   *Why:* Supabase's built-in email only sends to members of your Supabase team, at most 2 emails an hour, and "is not meant for production use" (Supabase docs, checked 2026-11-07). With confirmation on, other people's confirmation emails would never arrive. For a real launch, connect your own email service (SMTP) and turn it back on; the app already handles the confirmation link.
4. **Addresses.** In *Authentication → URL Configuration*, set *Site URL* to `https://ruvad.github.io/Kindstart/` and add `http://127.0.0.1:5560/` to *Redirect URLs*.
5. **Keys.** In *Project Settings → API Keys*, copy the **publishable** key (it starts with `sb_publishable_`), and copy the Project URL (`https://<something>.supabase.co`, shown under *Connect* too). Paste both into [`js/config.js`](../js/config.js).
   - The publishable key is made to be public ("safe to expose online", Supabase docs). The rules from step 2 protect the data.
   - **Never** use the secret key (`sb_secret_...`). It would let anyone read everyone's data. The app refuses it anyway.
   - Don't paste keys into a chat.
6. Commit `config.js` and push.

## First real test (yours)

Claude tested everything against a fake Supabase that answers like the docs describe. The real server is untested until you do this:

1. Run `start.bat`, press Ctrl+Shift+R, open **⋯ → Me → Account**, type your email and a password (6+ characters), press **Create account**. You should see your email and "Saved ✓".
2. In Supabase, open *Table Editor → user_data*: one row, with your tasks inside `data`.
3. Open the app in a private window, sign in: your tasks appear.
4. **Safety test:** a second person creates their own account. Sign in as them: only their tasks show. Sign out, sign in as you: only yours.
5. If something goes wrong, Me → Account shows the reason. The common ones:

| Message | Cause |
|---|---|
| `Supabase 401: Invalid API key` | The key in `config.js` is wrong or not the publishable one |
| `Supabase 404: ... user_data ...` | Step 2 didn't run |
| `Supabase 400: Email not confirmed` | Step 3: confirmation is still on |
| `Couldn't reach Supabase (...)` | No internet, or the Project URL is wrong |
| `new row violates row-level security policy` | The rules from step 2 are missing or changed |

## How it works

- [`js/account.js`](../js/account.js) talks to Supabase's REST API with `fetch`, without a library:

  | What | Request |
  |---|---|
  | Create account | `POST /auth/v1/signup` |
  | Sign in | `POST /auth/v1/token?grant_type=password` → a token for 1 hour + a renewal token |
  | Renew the token | `POST /auth/v1/token?grant_type=refresh_token` |
  | Read your data | `GET /rest/v1/user_data?user_id=eq.<your id>` |
  | Save your data | `POST /rest/v1/user_data` with `Prefer: resolution=merge-duplicates` (add or update) |
  | Delete your data | `DELETE /rest/v1/user_data?user_id=eq.<your id>` |
  | Sign out | `POST /auth/v1/logout` |

  Every request sends the publishable key in the `apikey` header. When signed in, `Authorization: Bearer <your token>` says who you are, and the database rules check it.
- Every `save()` also sends the data to the account 1.5 seconds later. If that fails (offline), it's marked unsent and goes with the next change, when the internet comes back, or at the next start.
- Signing in on a device that already has data **joins** the two: nothing is lost.
- Signing out removes the data from that device. It stays in the account.
- "Delete all my data" while signed in deletes the account's copy too.

## Not done yet

- Two devices changing things at the same moment while offline: the last one to send wins.
- No "forgot password" yet.
- Deleting your data doesn't delete the sign-in itself. Do that in Supabase: *Authentication → Users*.
- A Free project pauses after a week without use (Supabase pricing, checked 2026-10-30). Open the app in the days before the presentation.
