import assert from "node:assert/strict";
import test from "node:test";
import {
  getRoleLandingPath,
  hasAdminAccess,
  hasDashboardAccess,
  hasHiringManagerAccess,
  hasViewerOnlyAccess,
} from "../src/lib/internal-access.ts";

test("internal users land on the dashboard", () => {
  for (const role of [
    "Admin",
    "Hiring Manager",
    "Admin + Hiring Manager / HR",
    "Viewer",
  ]) {
    assert.equal(getRoleLandingPath(role), "/dashboard");
    assert.equal(hasDashboardAccess(role), true);
  }
  assert.equal(getRoleLandingPath("Candidate"), "/candidate");
  assert.equal(getRoleLandingPath("Stakeholder"), "/stakeholder");
});

test("Admin and Job Portal permissions follow assigned roles", () => {
  assert.equal(hasAdminAccess("Admin"), true);
  assert.equal(hasHiringManagerAccess("Admin"), false);

  assert.equal(hasAdminAccess("Hiring Manager"), false);
  assert.equal(hasHiringManagerAccess("Hiring Manager"), true);

  assert.equal(hasAdminAccess("Admin + Hiring Manager / HR"), true);
  assert.equal(hasHiringManagerAccess("Admin + Hiring Manager / HR"), true);

  assert.equal(hasAdminAccess("Viewer"), false);
  assert.equal(hasHiringManagerAccess("Viewer"), false);
});

test("selected role checkboxes preserve each independent capability", () => {
  const adminViewer = ["Admin", "Viewer"] as const;
  const managerViewer = ["Hiring Manager", "Viewer"] as const;
  const allRoles = ["Admin", "Hiring Manager", "Viewer"] as const;

  assert.equal(hasAdminAccess("Admin", adminViewer), true);
  assert.equal(hasHiringManagerAccess("Admin", adminViewer), false);
  assert.equal(hasViewerOnlyAccess("Admin", adminViewer), false);

  assert.equal(hasAdminAccess("Hiring Manager", managerViewer), false);
  assert.equal(hasHiringManagerAccess("Hiring Manager", managerViewer), true);
  assert.equal(hasViewerOnlyAccess("Hiring Manager", managerViewer), false);

  assert.equal(hasAdminAccess("Admin + Hiring Manager / HR", allRoles), true);
  assert.equal(
    hasHiringManagerAccess("Admin + Hiring Manager / HR", allRoles),
    true,
  );
  assert.equal(
    hasViewerOnlyAccess("Admin + Hiring Manager / HR", allRoles),
    false,
  );

  assert.equal(hasViewerOnlyAccess("Viewer", ["Viewer"]), true);
});
