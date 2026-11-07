import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleHelp,
  LockKeyhole,
  LogOut,
  Radio,
  SlidersHorizontal,
  UsersRound,
  Video,
} from "lucide-react";
import { type WorkspaceRole } from "@/lib/internal-access";

export type AdminUserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: WorkspaceRole[];
};

export type AdminPanelSettings = {
  requireSsoForInternal: boolean;
  requireOtpForExternal: boolean;
  allowViewerDashboard: boolean;
};

export type NewAdminUser = {
  firstName: string;
  lastName: string;
  email: string;
  roles: WorkspaceRole[];
};

type AdminPanelPageProps = {
  adminEmail: string;
  users: AdminUserRecord[];
  settings: AdminPanelSettings;
  onAddUser: (user: NewAdminUser) => string | undefined;
  onSaveSettings: (settings: AdminPanelSettings) => string | undefined;
  onBackToDashboard: () => void;
  onSignOut: () => void;
};

type AdminSection =
  | "users"
  | "configuration"
  | "resources"
  | "interviews"
  | "positions";

const inputClass =
  "w-full rounded-xl border border-[#dfe1d8] bg-[#fffefa] px-3.5 py-3 text-[12px] text-[#3f5550] outline-none transition focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10";
const labelClass = "mb-1.5 block text-[11px] font-semibold text-[#50635d]";

function roleStyle(role: WorkspaceRole) {
  if (role === "Admin") return "bg-[#e8efe9] text-[#34715f]";
  if (role === "Viewer") return "bg-[#f2eee4] text-[#8a7049]";
  return "bg-[#edf0e8] text-[#5e705d]";
}

export function AdminPanelPage({
  adminEmail,
  users,
  settings,
  onAddUser,
  onSaveSettings,
  onBackToDashboard,
  onSignOut,
}: AdminPanelPageProps) {
  const [section, setSection] = useState<AdminSection>("users");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<WorkspaceRole[]>(["Hiring Manager"]);
  const [formError, setFormError] = useState("");
  const [addNotice, setAddNotice] = useState("");
  const [draftSettings, setDraftSettings] = useState(settings);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    setDraftSettings({
      requireSsoForInternal: settings.requireSsoForInternal,
      requireOtpForExternal: settings.requireOtpForExternal,
      allowViewerDashboard: settings.allowViewerDashboard,
    });
  }, [
    settings.requireSsoForInternal,
    settings.requireOtpForExternal,
    settings.allowViewerDashboard,
  ]);

  const submitUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setAddNotice("");
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFirstName || !cleanLastName || !cleanEmail) {
      setFormError("Complete each field before adding a user.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError("Enter a valid email address, such as name@company.com.");
      return;
    }
    if (roles.length === 0) {
      setFormError("Select at least one user type.");
      return;
    }
    if (users.some((user) => user.email.trim().toLowerCase() === cleanEmail)) {
      setFormError(
        "A user with this email address is already in the directory.",
      );
      return;
    }

    const saveError = onAddUser({
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: cleanEmail,
      roles,
    });
    if (saveError) {
      setFormError(saveError);
      return;
    }
    setFirstName("");
    setLastName("");
    setEmail("");
    setRoles(["Hiring Manager"]);
    setAddNotice(
      `${cleanFirstName} ${cleanLastName} was added to the directory.`,
    );
  };

  const toggleUserRole = (selectedRole: WorkspaceRole) => {
    setRoles((current) =>
      current.includes(selectedRole)
        ? current.filter((role) => role !== selectedRole)
        : [...current, selectedRole],
    );
    setFormError("");
  };

  const toggleSetting = (key: keyof AdminPanelSettings) => {
    setDraftSettings((current) => ({ ...current, [key]: !current[key] }));
    setSettingsNotice("");
    setSettingsError("");
  };

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saveError = onSaveSettings(draftSettings);
    if (saveError) {
      setSettingsNotice("");
      setSettingsError(saveError);
      return;
    }
    setSettingsError("");
    setSettingsNotice("Configuration saved.");
  };

  const navItems: {
    id: AdminSection;
    label: string;
    Icon: typeof UsersRound;
  }[] = [
    { id: "users", label: "Users", Icon: UsersRound },
    { id: "configuration", label: "Configuration", Icon: SlidersHorizontal },
    { id: "resources", label: "Resource Management", Icon: Radio },
    { id: "interviews", label: "Candidate Management", Icon: Video },
    { id: "positions", label: "Position Management", Icon: BriefcaseBusiness },
  ];

  return (
    <div className="page-enter min-h-[100dvh] bg-[#f5f3ec] px-4 pb-12 pt-5 text-[#243942] sm:px-6 sm:pt-7 lg:px-8">
      <div className="mx-auto w-full max-w-[1240px]">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#557068] transition hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to dashboard
        </button>

        <header className="relative mb-6 overflow-hidden rounded-[24px] border border-[#e1e3d9] bg-[#f4f2e9] px-5 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-[#d9e0d3]" />
          <div className="pointer-events-none absolute -right-2 -top-10 h-48 w-48 rounded-full border border-[#e0e4d8]" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#68857a]">
                AiccuHire / Hiring workspace
              </div>
              <h1 className="serif text-[clamp(28px,4vw,40px)] font-bold leading-tight tracking-[-.05em] text-[#2d4446]">
                Admin panel
              </h1>
              <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#71817a]">
                Manage workspace access and the rules that keep your hiring team
                moving.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start rounded-2xl border border-[#dfe3d8] bg-[#fbfaf5]/80 px-3.5 py-2.5 sm:self-auto">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dfe9dd] text-[11px] font-bold uppercase text-[#42695c]">
                {adminEmail.slice(0, 1) || "A"}
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-[.12em] text-[#89958d]">
                  Signed in as
                </div>
                <div className="max-w-[220px] truncate text-[11px] font-semibold text-[#435a54]">
                  {adminEmail}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#dfe1d8] bg-[#fbfaf5] px-3 text-[10px] font-semibold text-[#526664] hover:bg-[#f1efe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
            >
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </div>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="rounded-[20px] border border-[#e3e2d9] bg-[#fbfaf5] p-3 lg:sticky lg:top-6">
            <div className="px-3 pb-3 pt-2 text-[9px] font-bold uppercase tracking-[.15em] text-[#97a09a]">
              Workspace admin
            </div>
            <nav aria-label="Admin sections" className="flex gap-1 lg:flex-col">
              {navItems.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSection(id);
                    setSettingsNotice("");
                  }}
                  aria-current={section === id ? "page" : undefined}
                  className={`flex min-h-11 flex-1 items-center gap-3 rounded-xl px-3 text-left text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] lg:flex-none ${
                    section === id
                      ? "bg-[#e8efe8] text-[#2f6758]"
                      : "text-[#687771] hover:bg-[#f2f1e9] hover:text-[#3e5c52]"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                  {label}
                  {section === id && (
                    <ChevronRight
                      className="ml-auto hidden lg:block"
                      size={14}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </nav>
            <div className="mt-4 hidden rounded-xl border border-[#e8e5da] bg-[#f7f5ed] p-3 lg:block">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-[#63786d]">
                <CircleHelp size={14} aria-hidden="true" />
                Demo workspace
              </div>
              <p className="mt-1.5 text-[10px] leading-4 text-[#8a958e]">
                Admin controls here are for a browser-only product demo.
              </p>
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            {section === "users" ? (
              <>
                <section className="rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5] p-5 sm:p-7">
                  <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                        Access management
                      </div>
                      <h2 className="serif mt-1 text-[22px] font-bold tracking-[-.04em] text-[#30484a]">
                        Add a team member
                      </h2>
                      <p className="mt-1 text-[11px] leading-5 text-[#819089]">
                        Create a demo profile and select one or more workspace
                        roles.
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#edf2e9] px-2.5 py-1.5 text-[9px] font-bold text-[#557365]">
                      <LockKeyhole size={12} aria-hidden="true" />
                      Admin access
                    </span>
                  </div>

                  <form onSubmit={submitUser} noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          className={labelClass}
                          htmlFor="admin-first-name"
                        >
                          First name
                        </label>
                        <input
                          id="admin-first-name"
                          className={inputClass}
                          autoComplete="given-name"
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          placeholder="e.g. Morgan"
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="admin-last-name">
                          Last name
                        </label>
                        <input
                          id="admin-last-name"
                          className={inputClass}
                          autoComplete="family-name"
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          placeholder="e.g. Ellis"
                        />
                      </div>
                      <div>
                        <label
                          className={labelClass}
                          htmlFor="admin-user-email"
                        >
                          Email address
                        </label>
                        <input
                          id="admin-user-email"
                          className={inputClass}
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="name@company.com"
                        />
                      </div>
                      <fieldset className="sm:col-span-2">
                        <legend className={labelClass}>User type</legend>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {(
                            [
                              ["Admin", "Admin"],
                              ["Hiring Manager", "Hiring Manager"],
                              ["Viewer", "Viewer"],
                            ] as const
                          ).map(([value, label]) => (
                            <label
                              key={value}
                              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-[#dfe1d8] bg-[#fffefa] px-3 text-[11px] font-semibold text-[#50635d] transition hover:border-[#a7bbb0] focus-within:ring-4 focus-within:ring-[#438274]/10"
                            >
                              <input
                                type="checkbox"
                                checked={roles.includes(value)}
                                onChange={() => toggleUserRole(value)}
                                className="h-4 w-4 accent-[#205e53]"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                        <p className="mt-2 text-[9px] text-[#8a958e]">
                          HR uses the Hiring Manager role in this workspace.
                        </p>
                      </fieldset>
                    </div>
                    {formError && (
                      <p
                        role="alert"
                        className="mt-3 rounded-xl border border-[#ecd4cd] bg-[#fbefea] px-3.5 py-2.5 text-[11px] text-[#9a5548]"
                      >
                        {formError}
                      </p>
                    )}
                    {addNotice && (
                      <p
                        role="status"
                        className="mt-3 rounded-xl border border-[#dce5db] bg-[#edf3ec] px-3.5 py-2.5 text-[11px] text-[#42665a]"
                      >
                        {addNotice}
                      </p>
                    )}
                    <div className="mt-5 flex flex-col justify-between gap-3 border-t border-[#ece9df] pt-4 sm:flex-row sm:items-center">
                      <p className="max-w-lg text-[10px] leading-4 text-[#929991]">
                        Added users use the shared demo password. They are demo
                        profiles, not real authenticated accounts.
                      </p>
                      <button
                        type="submit"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#205e53] px-4 py-3 text-[11px] font-bold text-[#f8f6ee] transition hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#438274]/20"
                      >
                        Add user <ArrowUpRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </form>
                </section>

                <section
                  aria-labelledby="workspace-limits-heading"
                  className="rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5] p-5 sm:p-7"
                >
                  <div className="mb-5">
                    <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                      Workspace limits
                    </div>
                    <h2
                      id="workspace-limits-heading"
                      className="serif mt-1 text-[21px] font-bold tracking-[-.04em] text-[#30484a]"
                    >
                      Account capacity
                    </h2>
                    <p className="mt-1 text-[11px] leading-5 text-[#819089]">
                      Current workspace limits are managed by your plan.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        className={labelClass}
                        htmlFor="maximum-active-users"
                      >
                        Maximum Active Users
                      </label>
                      <input
                        id="maximum-active-users"
                        className={`${inputClass} cursor-not-allowed border-[#e8e7e0] bg-[#eeede7] text-[#8b918b]`}
                        type="number"
                        value={20}
                        readOnly
                        aria-readonly="true"
                      />
                    </div>
                    <div>
                      <label
                        className={labelClass}
                        htmlFor="monthly-dashboard-queries"
                      >
                        Number of Dashboard Queries per month
                      </label>
                      <input
                        id="monthly-dashboard-queries"
                        className={`${inputClass} cursor-not-allowed border-[#e8e7e0] bg-[#eeede7] text-[#8b918b]`}
                        type="number"
                        value={500}
                        readOnly
                        aria-readonly="true"
                      />
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5]">
                  <div className="flex flex-col justify-between gap-2 border-b border-[#ece9df] px-5 py-5 sm:flex-row sm:items-end sm:px-7">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                        Directory
                      </div>
                      <h2 className="serif mt-1 text-[21px] font-bold tracking-[-.04em] text-[#30484a]">
                        Workspace users
                      </h2>
                    </div>
                    <span className="text-[10px] font-semibold text-[#85928a]">
                      {users.length} {users.length === 1 ? "person" : "people"}
                    </span>
                  </div>
                  {users.length ? (
                    <>
                      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)] gap-4 bg-[#f7f6ef] px-7 py-2.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#98a098] sm:grid">
                        <span>Name</span>
                        <span>Email</span>
                        <span>Access</span>
                      </div>
                      <ul className="divide-y divide-[#eeece3]">
                        {users.map((user) => (
                          <li
                            key={user.id}
                            className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)] sm:items-center sm:gap-4 sm:px-7"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8ece1] text-[10px] font-bold uppercase text-[#547065]">
                                {`${user.firstName.slice(0, 1)}${user.lastName.slice(0, 1)}`}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-[12px] font-semibold text-[#455b54]">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="mt-0.5 truncate text-[10px] text-[#929b95] sm:hidden">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                            <div className="hidden truncate text-[11px] text-[#75847c] sm:block">
                              {user.email}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {user.roles.map((userRole) => (
                                <span
                                  key={userRole}
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${roleStyle(userRole)}`}
                                >
                                  {userRole}
                                </span>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#edf1e9] text-[#628073]">
                        <UsersRound size={19} aria-hidden="true" />
                      </div>
                      <h3 className="mt-3 text-[12px] font-semibold text-[#536860]">
                        No users in the directory yet
                      </h3>
                      <p className="mt-1 text-[10px] text-[#909a93]">
                        Add a team member above to get started.
                      </p>
                    </div>
                  )}
                </section>

                <section className="rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5] p-5 sm:p-7">
                  <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                    Account details
                  </div>
                  <h2 className="serif mt-1 text-[21px] font-bold tracking-[-.04em] text-[#30484a]">
                    Admin account
                  </h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        className={labelClass}
                        htmlFor="current-admin-email"
                      >
                        Current admin email
                      </label>
                      <input
                        id="current-admin-email"
                        className={`${inputClass} bg-[#f4f3ed]`}
                        value={adminEmail}
                        readOnly
                      />
                    </div>
                    <div>
                      <label
                        className={labelClass}
                        htmlFor="shared-demo-password"
                      >
                        Shared demo password
                      </label>
                      <input
                        id="shared-demo-password"
                        className={`${inputClass} bg-[#f4f3ed] tracking-[.2em]`}
                        type="text"
                        value="••••••••••••"
                        readOnly
                        aria-label="Masked shared demo password"
                        aria-describedby="demo-password-note"
                      />
                      <p
                        id="demo-password-note"
                        className="mt-1.5 text-[9px] text-[#929b95]"
                      >
                        Masked for display. Never shown as plain text.
                      </p>
                    </div>
                  </div>
                </section>
              </>
            ) : section === "configuration" ? (
              <section className="rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5] p-5 sm:p-7">
                <div className="mb-6">
                  <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                    Workspace policy
                  </div>
                  <h2 className="serif mt-1 text-[24px] font-bold tracking-[-.04em] text-[#30484a]">
                    Configuration
                  </h2>
                  <p className="mt-1 max-w-xl text-[11px] leading-5 text-[#819089]">
                    Choose how people enter and move through your hiring
                    workspace.
                  </p>
                </div>
                <form onSubmit={saveSettings}>
                  <div className="divide-y divide-[#ece9df]">
                    <SettingRow
                      title="Require demo SSO for internal users"
                      description="Ask Hiring Manager / HR and Admin demo profiles to use single sign-on."
                      checked={draftSettings.requireSsoForInternal}
                      onChange={() => toggleSetting("requireSsoForInternal")}
                    />
                    <SettingRow
                      title="Require OTP for candidates and stakeholders"
                      description="Add a one-time passcode step for candidate and stakeholder demo access."
                      checked={draftSettings.requireOtpForExternal}
                      onChange={() => toggleSetting("requireOtpForExternal")}
                    />
                    <SettingRow
                      title="Allow Viewer access to Reports & Analytics"
                      description="Let Viewer profiles open workspace reports without editing hiring data."
                      checked={draftSettings.allowViewerDashboard}
                      onChange={() => toggleSetting("allowViewerDashboard")}
                    />
                  </div>
                  {settingsError && (
                    <p
                      role="alert"
                      className="mt-5 rounded-xl border border-[#ecd4cd] bg-[#fbefea] px-3.5 py-3 text-[11px] font-medium text-[#9a5548]"
                    >
                      {settingsError}
                    </p>
                  )}
                  {settingsNotice && (
                    <p
                      role="status"
                      className="mt-5 flex items-center gap-2 rounded-xl border border-[#dce5db] bg-[#edf3ec] px-3.5 py-3 text-[11px] font-medium text-[#42665a]"
                    >
                      <Check size={14} aria-hidden="true" />
                      {settingsNotice}
                    </p>
                  )}
                  <div className="mt-6 flex flex-col justify-between gap-3 border-t border-[#ece9df] pt-5 sm:flex-row sm:items-center">
                    <p className="text-[10px] text-[#929991]">
                      Changes apply to this demo workspace after saving.
                    </p>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#205e53] px-4 py-3 text-[11px] font-bold text-[#f8f6ee] transition hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#438274]/20"
                    >
                      Save settings <Check size={14} aria-hidden="true" />
                    </button>
                  </div>
                </form>
              </section>
            ) : section === "resources" ? (
              <section className="rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5] p-5 sm:p-7">
                <div className="mb-6">
                  <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                    Workspace resources
                  </div>
                  <h2 className="serif mt-1 text-[24px] font-bold tracking-[-.04em] text-[#30484a]">
                    Resource Management
                  </h2>
                  <p className="mt-1 max-w-xl text-[11px] leading-5 text-[#819089]">
                    Configured communication channels and AI service tiers.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className={labelClass} htmlFor="sms-channel">
                      SMS Channel
                    </label>
                    <input
                      id="sms-channel"
                      className={`${inputClass} cursor-not-allowed border-[#e8e7e0] bg-[#eeede7] text-[#8b918b]`}
                      value="https://aiccuhire.com/"
                      readOnly
                      aria-readonly="true"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="phone-channel">
                      Phone Channel
                    </label>
                    <input
                      id="phone-channel"
                      className={`${inputClass} cursor-not-allowed border-[#e8e7e0] bg-[#eeede7] text-[#8b918b]`}
                      value="https://aiccuhire.com/"
                      readOnly
                      aria-readonly="true"
                    />
                  </div>
                  <ResourceTierField label="AI Speech Engine" />
                  <ResourceTierField label="AI Inference Engine" />
                  <ResourceTierField label="Advance Resume Analysis" />
                </div>
              </section>
            ) : section === "interviews" ? (
              <section className="rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5] p-5 sm:p-7">
                <div className="mb-6">
                  <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                    Interview workflow
                  </div>
                  <h2 className="serif mt-1 text-[24px] font-bold tracking-[-.04em] text-[#30484a]">
                    Candidate Management
                  </h2>
                  <p className="mt-1 max-w-xl text-[11px] leading-5 text-[#819089]">
                    Default limits for resume screening and interview timelines.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReadOnlyAdminField
                    label="Max Interview per Job posting"
                    value="10"
                  />
                  <ReadOnlyAdminField
                    label="Max Resume to be screened"
                    value="100"
                  />
                  <ReadOnlyAdminField
                    label="Max number of days to accept resume for a Job Posting"
                    value="10"
                  />
                  <ReadOnlyAdminField
                    label="Max number of days to wait before evaluating resume"
                    value="7"
                  />
                  <ReadOnlyAdminField
                    label="Max number of days for interview completion"
                    value="14 days"
                  />
                </div>
              </section>
            ) : (
              <div className="space-y-5">
                <section className="rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5] p-5 sm:p-7">
                  <div className="mb-6">
                    <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                      Position integrations
                    </div>
                    <h2 className="serif mt-1 text-[24px] font-bold tracking-[-.04em] text-[#30484a]">
                      Position Management
                    </h2>
                    <p className="mt-1 max-w-xl text-[11px] leading-5 text-[#819089]">
                      Read-only connection settings for the JobPortal and its
                      hiring services.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnlyAdminField
                      label="JobPortal connection link"
                      value="https://aiccuhire.com/"
                    />
                    <ReadOnlyAdminField
                      label="JobPortal ID"
                      value="••••••••••"
                    />
                    <ReadOnlyAdminField
                      label="JobPortal password"
                      value="••••••••••"
                    />
                  </div>
                </section>

                <section className="rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5] p-5 sm:p-7">
                  <div className="mb-5">
                    <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                      Connected services
                    </div>
                    <h2 className="serif mt-1 text-[21px] font-bold tracking-[-.04em] text-[#30484a]">
                      Subscriptions
                    </h2>
                    <p className="mt-1 text-[11px] leading-5 text-[#819089]">
                      Three services are selected. Subscription settings are
                      read-only.
                    </p>
                  </div>
                  <ReadOnlyOptionField
                    label="Subscribed services"
                    options={[
                      "Linked in",
                      "Indeed",
                      "Anthropic",
                      "Chat-gpt",
                      "Gemini",
                    ]}
                    selected={["Linked in", "Indeed", "Chat-gpt"]}
                  />
                </section>

                <section className="rounded-[20px] border border-[#e2e2d9] bg-[#fbfaf5] p-5 sm:p-7">
                  <div className="mb-5">
                    <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
                      Resume integrations
                    </div>
                    <h2 className="serif mt-1 text-[21px] font-bold tracking-[-.04em] text-[#30484a]">
                      Resume partners
                    </h2>
                    <p className="mt-1 text-[11px] leading-5 text-[#819089]">
                      Configured partners are shown below and cannot be edited.
                    </p>
                  </div>
                  <ReadOnlyOptionField
                    label="Available resume partners"
                    options={[
                      "Insight global",
                      "Black diamond networks",
                      "Teal",
                      "Careerflow",
                      "Jobright",
                    ]}
                    selected={["Jobright"]}
                  />
                </section>
              </div>
            )}
          </main>
        </div>
        <footer className="mt-8 border-t border-[#e6e2d9] pt-4 text-center text-[10px] text-[#929b95]">
          AiccuHire · A demo workspace for thoughtful hiring
        </footer>
      </div>
    </div>
  );
}

function ReadOnlyAdminField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const id = `admin-setting-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div>
      <label className={labelClass} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`${inputClass} cursor-not-allowed border-[#e8e7e0] bg-[#eeede7] text-[#8b918b]`}
        value={value}
        readOnly
        aria-readonly="true"
      />
    </div>
  );
}

function ResourceTierField({ label }: { label: string }) {
  return (
    <fieldset
      disabled
      className="rounded-xl border border-[#e8e7e0] bg-[#eeede7] px-3.5 py-3"
    >
      <legend className={`${labelClass} mb-2 px-1`}>{label}</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {["Silver", "Gold", "Platinum"].map((tier) => (
          <label
            key={tier}
            className="inline-flex cursor-not-allowed items-center gap-2 text-[11px] font-medium text-[#8b918b]"
          >
            <input
              type="checkbox"
              checked={tier === "Silver"}
              readOnly
              className="h-4 w-4 accent-[#829187]"
              aria-label={`${label}: ${tier}`}
            />
            {tier}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ReadOnlyOptionField({
  label,
  options,
  selected,
}: {
  label: string;
  options: string[];
  selected: string[];
}) {
  return (
    <div>
      <div className={labelClass}>{label}</div>
      <fieldset
        disabled
        aria-label={label}
        className="grid gap-2 rounded-xl border border-[#e8e7e0] bg-[#eeede7] p-3 sm:grid-cols-2"
      >
        {options.map((option) => (
          <label
            key={option}
            className="flex min-h-10 cursor-not-allowed items-center gap-2.5 rounded-lg border border-[#e4e3dc] bg-[#f3f2ec] px-3 text-[11px] font-medium text-[#8b918b]"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              readOnly
              className="h-4 w-4 accent-[#829187]"
              aria-label={option}
            />
            {option}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-5 first:pt-1 last:pb-1">
      <span className="pr-2">
        <span className="block text-[12px] font-semibold text-[#435a54]">
          {title}
        </span>
        <span className="mt-1 block max-w-xl text-[10px] leading-4 text-[#85928a]">
          {description}
        </span>
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          aria-label={title}
        />
        <span className="h-6 w-11 rounded-full bg-[#d9ddd4] transition peer-checked:bg-[#438274] peer-focus-visible:ring-4 peer-focus-visible:ring-[#438274]/20" />
        <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-[#fffefa] shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
