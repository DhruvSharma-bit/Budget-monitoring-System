import PageHeader from '../components/ui/PageHeader'

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile, role, and interface placeholders for administrative configuration" />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel p-5">
          <h3 className="text-base font-semibold text-text">Profile</h3>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-text">Name:</span> Finance Coordinator
            </p>
            <p>
              <span className="font-medium text-text">Email:</span> finance.office@college.edu
            </p>
            <p>
              <span className="font-medium text-text">Department:</span> Student Affairs and Accounts
            </p>
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="text-base font-semibold text-text">Role and Access</h3>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p>
              <span className="font-medium text-text">Role:</span> College Finance Admin
            </p>
            <p>
              <span className="font-medium text-text">Access Level:</span> Full event budget write access
            </p>
            <p>
              <span className="font-medium text-text">Approval Scope:</span> Budget updates and report exports
            </p>
          </div>
        </section>

        <section className="panel p-5">
          <h3 className="text-base font-semibold text-text">Theme</h3>
          <p className="mt-2 text-sm text-muted">Light theme is active. Dark theme support can be added later if needed.</p>
          <button type="button" className="mt-4 rounded-md border border-line px-4 py-2 text-sm text-muted" disabled>
            Theme Placeholder
          </button>
        </section>

        <section className="panel p-5">
          <h3 className="text-base font-semibold text-text">Notifications</h3>
          <p className="mt-2 text-sm text-muted">
            Configure warning alerts for liability overflow, pending approvals, and overpayments.
          </p>
          <button type="button" className="mt-4 rounded-md border border-line px-4 py-2 text-sm text-muted" disabled>
            Notification Placeholder
          </button>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
