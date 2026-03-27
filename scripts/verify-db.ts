import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verify() {
  console.log(`Connecting to: ${supabaseUrl}\n`);

  // 1. Query badges table
  const { data: badges, error: badgesError } = await supabase
    .from("badges")
    .select("*");

  if (badgesError) {
    console.error("Failed to query badges:", badgesError.message);
    process.exit(1);
  }

  console.log(`Badges found: ${badges.length} (expected: 13)`);
  if (badges.length === 13) {
    console.log("  OK — all 13 badges present");
  } else {
    console.error("  FAIL — badge count mismatch");
  }

  // 2. List all tables by trying to count from each
  const tables = [
    "users", "arenas", "arena_participants", "rounds",
    "equity_snapshots", "trades", "eliminations",
    "spectator_votes", "badges", "user_badges", "events"
  ];

  console.log("\nTable check:");
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`  ${table}: FAIL (${error.message})`);
    } else {
      console.log(`  ${table}: OK (${count} rows)`);
    }
  }

  // 3. Print badge details
  console.log("\nBadge details:");
  for (const b of badges) {
    console.log(`  [${b.rarity}] ${b.id}: ${b.name} — ${b.description}`);
  }

  console.log("\nVerification complete!");
}

verify().catch(console.error);
