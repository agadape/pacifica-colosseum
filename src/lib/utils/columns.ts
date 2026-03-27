/**
 * Safe column lists for API responses.
 * NEVER include fields ending in _encrypted, _secret, or private_key.
 */

export const ARENA_PUBLIC_COLUMNS = [
  "id", "creator_id", "name", "description", "status", "preset",
  "starting_capital", "min_participants", "max_participants",
  "is_invite_only", "invite_code", "registration_deadline", "starts_at",
  "current_round", "current_round_ends_at", "ended_at",
  "round_1_duration", "round_2_duration", "round_3_duration", "sudden_death_duration",
  "master_wallet_address", "winner_id", "created_at", "updated_at",
].join(", ");

export const PARTICIPANT_PUBLIC_COLUMNS = [
  "id", "arena_id", "user_id", "subaccount_address", "status",
  "eliminated_at", "eliminated_in_round", "elimination_reason", "elimination_equity",
  "equity_round_1_start", "equity_round_1_end",
  "equity_round_2_start", "equity_round_2_end",
  "equity_round_3_start", "equity_round_3_end",
  "equity_sudden_death_start", "equity_final",
  "has_wide_zone", "has_second_life", "second_life_used",
  "trades_this_round", "volume_this_round",
  "total_trades", "total_pnl", "total_pnl_percent", "max_drawdown_hit",
  "joined_at",
].join(", ");

export const USER_PUBLIC_COLUMNS = [
  "id", "wallet_address", "username", "avatar_url", "referral_code",
  "total_arenas_entered", "total_arenas_won", "total_rounds_survived",
  "total_eliminations", "best_pnl_percent", "win_streak", "current_win_streak",
  "created_at", "updated_at",
].join(", ");
