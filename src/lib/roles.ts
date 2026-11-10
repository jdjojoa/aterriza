import type { UserRole } from "@/types/database";

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Usuario",
  admin: "Administrador",
};

export const USER_ROLES = Object.keys(ROLE_LABELS) as UserRole[];
