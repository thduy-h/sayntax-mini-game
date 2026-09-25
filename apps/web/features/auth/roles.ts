import type { AppRole } from "@shecancode/shared-types";

export function hasAdminRole(user: { role: AppRole } | null) {
  return user?.role === "admin";
}
