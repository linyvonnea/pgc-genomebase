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
};

/**
 * Maps formal admin usernames to friendly emoji icons.
 */
const ADMIN_ICON_MAP: Record<string, string> = {
  acnoblezada: "👨‍🔬", // Albert
  apbernas: "👨‍💻",    // Dan
  ccflorece: "👩‍💼",    // Tine
  ctmueda: "👩‍🔬",     // Cams
  kptenizo: "👨‍🏫",    // Karl
  madayon1: "👩‍💻",    // Merl
  mdlojera: "👩‍🎨",    // Mics
  mfjavier: "👩‍🔬",    // Carms
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
