export const SIGNUP_REASON_VALUES = [
  "reduce_scams",
  "spot_scams",
  "learn_online_safety",
  "protect_family",
  "other",
] as const;

export type SignupReason = (typeof SIGNUP_REASON_VALUES)[number];

export const signupReasonOptions: { label: string; value: SignupReason }[] = [
  { label: "Stop receiving scam messages", value: "reduce_scams" },
  { label: "Get help spotting scams online", value: "spot_scams" },
  { label: "Learn how to stay safe online", value: "learn_online_safety" },
  { label: "Protect my family from scams", value: "protect_family" },
  { label: "Other", value: "other" },
];
