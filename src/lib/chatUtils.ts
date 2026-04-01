/**
 * Maps formal admin usernames to informal display names for the chat widget.
 */
const ADMIN_NAME_MAP: Record<string, string> = {
  acnoblezada: "Albert",
  apbernas: "Dan",
  ccflorece: "Tine",
  ctmueda: "Cams",
  kptenizo: "Karl",
  madayon1: "Merl",
  mdlojera: "Mics",
  mfjavier: "Carms",
  jcvelo: "Jaz",
};

/**
 * Maps formal admin usernames to friendly emoji icons.
 */
const ADMIN_ICON_MAP: Record<string, string> = {
  acnoblezada: "👨‍🔬", // Albert
  apbernas: "👩‍🎨",    // Dan
  ccflorece: "👩‍🎨",    // Tine
  ctmueda: "👩‍🎨",     // Cams
  kptenizo: "👨‍🏫",    // Karl
  madayon1: "👨‍🔬",    // Merl
  mdlojera: "👩‍🎨",    // Mics
  mfjavier: "👩‍🎨",    // Carms
  jcvelo: "👩‍🎨",    // Jaz
};

/**
 * Returns a formal or informal name for an admin based on their email or username.
 * If the username is found in the map, it returns the mapped name.
 * Otherwise, it returns the capitalized username or the original value.
 */
export function getAdminDisplayName(identifier: string | null | undefined): string {
  if (!identifier) return "Admin";

  // Extract username if it's an email
  const username = identifier.includes("@") 
    ? identifier.split("@")[0].toLowerCase() 
    : identifier.toLowerCase();

  const displayName = ADMIN_NAME_MAP[username] || (username.charAt(0).toUpperCase() + username.slice(1));
  const icon = ADMIN_ICON_MAP[username] || "👋";

  return `${icon} ${displayName}`;
}

export function getClientInitials(name: string | null | undefined): string {
  const normalizedName = name?.trim();

  if (!normalizedName) return "CL";

  const parts = normalizedName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
