/**
 * Shared constants for lesson 31 sims:
 * PreferencePolicyTrainer and RewardModelView.
 */

export const PROMPT =
  'How should I respond to a user asking for cooking advice?';

export const RESPONSES = [
  'Just tell them what to do.',
  "Ask what they're cooking and how confident they feel.",
  'Recite a recipe.',
  'Suggest they try a tutorial.',
] as const;

/**
 * 6 hand-tuned preference triples. After cycling through these at
 * lr=0.3, beta=1.0:
 *   - response 1 ("Ask what…") wins clearly (~60% probability)
 *   - response 2 ("Recite a recipe.") loses clearly (~5%)
 *   - response 0 and 3 land in between
 *
 * The goal: any reader who presses Step once can see a bar shift.
 */
export const PREFERENCES = [
  { preferred: 1, dispreferred: 0 }, // ask > tell
  { preferred: 1, dispreferred: 2 }, // ask > recite
  { preferred: 3, dispreferred: 2 }, // tutorial > recite
  { preferred: 1, dispreferred: 3 }, // ask > tutorial
  { preferred: 3, dispreferred: 0 }, // tutorial > tell
  { preferred: 0, dispreferred: 2 }, // tell > recite
] as const;

export const LR = 0.3;
export const BETA = 1.0;
