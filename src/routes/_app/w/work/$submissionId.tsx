import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { WorkerTaskDetail } from '@/features/submissions/components/worker-task-detail'
import { mySubmissionQuery } from '@/features/submissions/queries'

export const Route = createFileRoute('/_app/w/work/$submissionId')({
  head: () => ({ meta: [{ title: 'Task · TinyGig' }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(mySubmissionQuery(params.submissionId)),
  component: TaskPage,
})

function TaskPage() {
  const { submissionId } = Route.useParams()
  const { data } = useSuspenseQuery(mySubmissionQuery(submissionId))
  return <WorkerTaskDetail data={data} />
}
