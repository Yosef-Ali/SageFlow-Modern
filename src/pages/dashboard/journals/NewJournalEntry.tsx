import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NewJournalEntryPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Journal Entry</h1>
          <p className="text-muted-foreground mt-1">Record a manual journal entry (GL)</p>
        </div>
      </div>

      <div className="p-12 text-center border rounded-lg bg-card text-muted-foreground">
        <p>Journal Entry form is currently under development.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/journals')}>
          Back to Journals
        </Button>
      </div>
    </div>
  )
}
