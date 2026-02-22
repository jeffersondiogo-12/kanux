import { NextResponse } from "next/server";
import serverSupabase from "@/lib/serverSupabase";

// Protect this endpoint with a one-time secret in env: SEED_ADMIN_KEY
// Usage (once):
//   curl -X POST \
//     -H "x-seed-key: YOUR_SEED_ADMIN_KEY" \
//     -H "Content-Type: application/json" \
//     -d '{"email":"diogojefferson206@gmail.com","password":"admin","display_name":"jefferson"}' \
//     http://localhost:3000/api/admin/seed-superadmin

export async function POST(req: Request) {
  try {
    const seedKey = process.env.SEED_ADMIN_KEY;
    const headerKey = req.headers.get("x-seed-key");
    if (!seedKey) {
      return NextResponse.json({ error: "Missing SEED_ADMIN_KEY in environment" }, { status: 500 });
    }
    if (headerKey !== seedKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email as string) || "diogojefferson206@gmail.com";
    const password = (body.password as string) || "admin";
    const display_name = (body.display_name as string) || "jefferson";

    const sb = serverSupabase();

    // 1) Create auth user (idempotent via email check)
    // First, try to find existing profile by email -> auth_user_id mapping requires looking up auth.users, but we only have Admin API.
    // Create user if not exists
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name, seed: "superadmin" },
    });
    // If user exists, createUser returns error: use getUserByEmail if SDK supports, otherwise proceed
    let authUserId = created?.user?.id as string | undefined;

    if (createErr && !authUserId) {
      // getUserByEmail is not available in Admin API
      // Try to get user by listing users and finding by email (not efficient but works)
      // Or just return the error - the user might already exist
      return NextResponse.json({ error: `auth admin error: ${createErr.message}` }, { status: 500 });
    }

    if (!authUserId) {
      return NextResponse.json({ error: "failed to resolve auth user id" }, { status: 500 });
    }

    // 2) Upsert profile with is_super_admin = true
    // Ensure column exists in your DB (ALTER TABLE user_profiles ADD COLUMN is_super_admin boolean DEFAULT false;)
    const { data: profile, error: upsertErr } = await sb
      .from("user_profiles")
      .upsert({
        auth_user_id: authUserId,
        display_name,
        email,
        is_super_admin: true,
      }, { onConflict: "auth_user_id" })
      .select("*")
      .single();

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, authUserId, profile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
