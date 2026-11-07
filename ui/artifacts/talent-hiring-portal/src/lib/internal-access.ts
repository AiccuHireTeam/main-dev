export type WorkspaceRole = "Admin" | "Hiring Manager" | "Viewer";

type LegacyInternalRole =
  | WorkspaceRole
  | "Admin + Hiring Manager / HR";

export function hasDashboardAccess(
  role: string | null | undefined,
  assignedRoles: readonly WorkspaceRole[] = [],
): boolean {
  return (
    assignedRoles.length > 0 ||
    (role !== null &&
      role !== undefined &&
      ["Admin", "Hiring Manager", "Admin + Hiring Manager / HR", "Viewer"].includes(
        role as LegacyInternalRole,
      ))
  );
}

export function hasAdminAccess(
  role: string | null | undefined,
  assignedRoles: readonly WorkspaceRole[] = [],
): boolean {
  return (
    assignedRoles.includes("Admin") ||
    role === "Admin" ||
    role === "Admin + Hiring Manager / HR"
  );
}

export function hasHiringManagerAccess(
  role: string | null | undefined,
  assignedRoles: readonly WorkspaceRole[] = [],
): boolean {
  return (
    assignedRoles.includes("Hiring Manager") ||
    role === "Hiring Manager" ||
    role === "Admin + Hiring Manager / HR"
  );
}

export function hasViewerOnlyAccess(
  role: string | null | undefined,
  assignedRoles: readonly WorkspaceRole[] = [],
): boolean {
  return (
    (assignedRoles.includes("Viewer") || role === "Viewer") &&
    !hasAdminAccess(role, assignedRoles) &&
    !hasHiringManagerAccess(role, assignedRoles)
  );
}

export function getRoleLandingPath(role: string): string {
  if (role === "Candidate") return "/candidate";
  if (role === "Stakeholder") return "/stakeholder";
  return "/dashboard";
}
