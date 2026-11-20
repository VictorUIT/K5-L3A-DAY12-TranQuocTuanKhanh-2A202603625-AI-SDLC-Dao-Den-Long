// Single source of truth for gameplay numbers. game.contract.json must mirror these (checked by tests).
export const TUNING = {
  player_speed: 5,
  carry_capacity: 5,
  lantern_cost: 5,
  lantern_count_night1: 5,
  pickup_radius: 1.0,
  interact_radius: 2.5,
  pulse_cost: 1,
  pulse_radius: 6,
  night1_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 3,
  pulse_push_m: 3,
  pulse_cooldown_s: 2,
  safe_radius: 6,
  shade_speed: 3,
  shade_hit_radius: 1.0,
  fall_enabled: false,
  score: { per_mote: 10, per_lantern: 100, per_stun: 20, per_second_left: 1, per_flame_left: 50 },
};

// Internal (not part of contract tuning) constants.
export const WORLD = {
  island_radius: 30,
  lantern_ring_radius: 20,
  jump_velocity: 6,
  gravity: 20,
  shade_height: 1.0,
  mote_initial: 20,
  mote_max: 20,
  mote_respawn_s: 4,
  shade_first_s: 10,
  shade_every_s: 25,
  shade_max: 3,
};
