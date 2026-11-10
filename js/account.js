// Accounts with Supabase: create an account, sign in, sign out, and keep the person's data
// in their account so it's the same on every device. Setup and the database rules: docs/ACCOUNTS.md.
//
// It talks to Supabase's REST API with fetch, without a library, so every request is visible here.
// Accounts are off until js/config.js has the project URL and the publishable key.

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { exportState, replaceState, deleteEverything, readSession, writeSession, onSave, hasUnsaved, setUnsaved, withOldGoal } from "./store.js";

const PUSH_DELAY_MS = 1500; // changes go to the account 1.5 s after the last one, not on every click

let session = readSession(); // { accessToken, refreshToken, expiresAt (ms), user: { id, email } } or null
let status = ""; // "saving", "saved" or "error: ..." (shown in Me)
let pushTimer = null;
const dataListeners = [];
const statusListeners = [];

// ---------- On or off ----------

export function accountsEnabled() {
  return SUPABASE_URL !== "" && SUPABASE_PUBLISHABLE_KEY !== "" && !isSecretKey(SUPABASE_PUBLISHABLE_KEY);
}

// A secret key gives full access to the whole database, so the app refuses to use one.
export function isSecretKey(key) {
  if (key.startsWith("sb_secret_")) return true;
  try {
    // An old-style key is a JWT: three parts with dots; the middle one says which role it is.
    const middle = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(middle)).role === "service_role";
  } catch {
    return false;
  }
}

export function currentUser() {
  return session?.user ?? null;
}

export function syncStatus() {
  return status;
}

// timeline.js redraws when the account's data replaces this device's; Me updates its status line.
export function onDataReplaced(listener) {
  dataListeners.push(listener);
}

export function onStatusChange(listener) {
  statusListeners.push(listener);
}

function setStatus(next) {
  status = next;
  for (const listener of statusListeners) listener(status);
}

function dataReplaced() {
  for (const listener of dataListeners) listener();
}

// ---------- Talking to Supabase ----------

// One request. Errors name the service, the status code and Supabase's reason.
async function call(path, { method = "GET", body, token, prefer } = {}) {
  const headers = { apikey: SUPABASE_PUBLISHABLE_KEY }; // the publishable key goes here, never in Authorization
  if (token) headers.Authorization = `Bearer ${token}`; // the signed-in person's own token
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;
  let response;
  try {
    response = await fetch(SUPABASE_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (error) {
    throw new Error(`Couldn't reach Supabase (${error.message}). Check the internet connection.`);
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { msg: text.slice(0, 200) };
  }
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${errorMessage(data, response.statusText)}`);
  return data;
}

// Supabase answers errors in a few shapes: { msg }, { error_description }, { message }.
export function errorMessage(data, fallback = "") {
  return data?.msg || data?.error_description || data?.message || data?.error || fallback || "no reason given";
}

// A token reply -> what the app keeps. expires_at is in seconds, Date.now() in milliseconds.
export function sessionFrom(data, now = Date.now()) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ? data.expires_at * 1000 : now + (data.expires_in ?? 3600) * 1000,
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
  };
}

function keepSession(data) {
  const next = sessionFrom(data);
  if (!next.user && session?.user) next.user = session.user; // a renewal reply may leave the user out
  session = next;
  writeSession(session);
}

// A valid access token. Supabase's tokens last an hour; this renews one that's about to run out.
async function accessToken() {
  if (!session) throw new Error("Not signed in.");
  if (Date.now() < session.expiresAt - 60_000) return session.accessToken;
  keepSession(await call("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: session.refreshToken } }));
  return session.accessToken;
}

async function fillUser() {
  if (session.user?.id) return;
  const user = await call("/auth/v1/user", { token: session.accessToken });
  session.user = { id: user.id, email: user.email };
  writeSession(session);
}

// ---------- The person's data in the account ----------

// One row per person in the table user_data: { user_id, data, updated_at }. null = no row yet.
async function pullData() {
  const rows = await call(`/rest/v1/user_data?select=data&user_id=eq.${session.user.id}`, { token: await accessToken() });
  return rows?.[0]?.data ?? null;
}

// Sends everything. "merge-duplicates" = add the row, or update it if the person already has one.
export async function pushNow() {
  clearTimeout(pushTimer);
  setStatus("saving");
  try {
    await call("/rest/v1/user_data", {
      method: "POST",
      token: await accessToken(),
      prefer: "resolution=merge-duplicates,return=minimal",
      body: { user_id: session.user.id, data: exportState(), updated_at: new Date().toISOString() },
    });
    setUnsaved(false);
    setStatus("saved");
  } catch (error) {
    setStatus(`error: ${error.message}`);
    throw error;
  }
}

// Every save() lands here while signed in: note that something is unsent, and send it soon.
function schedulePush() {
  if (!session) return;
  setUnsaved(true);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushNow().catch(() => {}), PUSH_DELAY_MS);
}

// Joins this device's data with the account's, so signing in never loses anything.
// Lists are joined by id; when both have the same id, the account's version wins.
export function mergeStates(localData, cloudData) {
  // Data saved by an older version keeps its goal in the profile: turn it into a goal first.
  const local = withOldGoal(localData);
  const cloud = withOldGoal(cloudData);
  const byId = (mine = [], theirs = []) => [...new Map([...mine, ...theirs].map((item) => [item.id, item])).values()];
  const seen = { ...local.seen };
  for (const [id, count] of Object.entries(cloud.seen ?? {})) seen[id] = Math.max(seen[id] ?? 0, count);
  return {
    ...local,
    ...cloud,
    profile: cloud.profile ?? local.profile,
    goals: byId(local.goals, cloud.goals),
    dates: byId(local.dates, cloud.dates),
    sleep: cloud.sleep?.on ? cloud.sleep : local.sleep ?? cloud.sleep,
    tasks: byId(local.tasks, cloud.tasks),
    notes: byId(local.notes, cloud.notes).sort((a, b) => b.id.localeCompare(a.id)), // ids start with the time: newest first
    saved: [...new Set([...(local.saved ?? []), ...(cloud.saved ?? [])])],
    seen,
    shownOn: { ...local.shownOn, ...cloud.shownOn },
    settings: cloud.settings ?? local.settings,
    reminded: { ...local.reminded, ...cloud.reminded },
  };
}

// ---------- Signing up, in and out ----------

// Returns "signed-in", or "check-email" when the Supabase project asks people to confirm their email.
export async function signUp(email, password) {
  const back = location.origin + location.pathname; // where the confirmation email's link leads
  const data = await call(`/auth/v1/signup?redirect_to=${encodeURIComponent(back)}`, { method: "POST", body: { email, password } });
  if (!data?.access_token) return "check-email";
  keepSession(data);
  await afterSignIn();
  return "signed-in";
}

export async function signIn(email, password) {
  keepSession(await call("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } }));
  await afterSignIn();
}

async function afterSignIn() {
  await fillUser();
  const cloud = await pullData();
  if (cloud) {
    replaceState(mergeStates(exportState(), cloud));
    dataReplaced();
  }
  await pushNow();
}

// Sends anything unsent first. If that fails, the person stays signed in and sees why.
export async function signOut() {
  if (hasUnsaved()) await pushNow();
  try {
    await call("/auth/v1/logout", { method: "POST", token: session.accessToken });
  } catch {
    // an expired token can't be signed out on the server; forgetting it here is enough
  }
  forget();
}

// "Delete all my data" while signed in: deletes the account's copy too, then signs out.
export async function deleteAccountData() {
  await call(`/rest/v1/user_data?user_id=eq.${session.user.id}`, { method: "DELETE", token: await accessToken() });
  try {
    await call("/auth/v1/logout", { method: "POST", token: session.accessToken });
  } catch {
    // as above
  }
  forget();
}

// This device forgets the session and the data (the data is safe in the account).
function forget() {
  clearTimeout(pushTimer);
  session = null;
  writeSession(null);
  deleteEverything();
  dataReplaced();
  setStatus("");
}

// ---------- Start-up ----------

// "#access_token=...&refresh_token=...&expires_in=3600" (the email confirmation link) -> a token reply, or null.
export function tokensFromLink(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (!params.get("access_token") || !params.get("refresh_token")) return null;
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    expires_in: Number(params.get("expires_in")) || 3600,
    expires_at: Number(params.get("expires_at")) || undefined,
  };
}

// Signs in from an email confirmation link, then brings this device up to date with the account.
export async function startAccount() {
  if (!accountsEnabled()) {
    if (isSecretKey(SUPABASE_PUBLISHABLE_KEY)) console.error("js/config.js has a SECRET key. Delete it now and use the publishable key.");
    return;
  }
  onSave(schedulePush);
  window.addEventListener("online", () => {
    if (session && hasUnsaved()) pushNow().catch(() => {});
  });

  const fromLink = tokensFromLink(location.hash);
  if (fromLink) {
    history.replaceState(null, "", location.pathname + location.search); // the tokens leave the address bar
    keepSession(fromLink);
    session.user = null; // the link doesn't say who it is; fillUser() asks
    try {
      await afterSignIn();
    } catch (error) {
      setStatus(`error: ${error.message}`);
    }
    return;
  }

  if (!session) return;
  try {
    const cloud = await pullData();
    if (hasUnsaved()) {
      // Changes made here never reached the account (e.g. offline): join them with the account's data.
      if (cloud) {
        replaceState(mergeStates(exportState(), cloud));
        dataReplaced();
      }
      await pushNow();
    } else {
      if (cloud) {
        replaceState(cloud);
        dataReplaced();
      }
      setStatus("saved");
    }
  } catch (error) {
    setStatus(`error: ${error.message}`);
  }
}
