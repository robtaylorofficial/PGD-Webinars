import WebinarForm from '../../../../../components/admin/webinar-form'

export default function NewWebinarPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">New Webinar</h1>
        <p className="text-white/50 text-sm mt-1">Create a new on-demand or live webinar</p>
      </div>
      <WebinarForm />
    </div>
  )
}
