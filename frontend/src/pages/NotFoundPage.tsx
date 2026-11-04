import { Link } from 'react-router'

import { MessageState } from '@/components/MessageState'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <MessageState
      title="Page not found"
      description="The page you're looking for doesn't exist."
      actions={
        <Button render={<Link to="/" />} nativeButton={false}>
          Back to dashboard
        </Button>
      }
    />
  )
}
