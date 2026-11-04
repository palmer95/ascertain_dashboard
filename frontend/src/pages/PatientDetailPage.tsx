import { useParams } from 'react-router'

export default function PatientDetailPage() {
  const { patientId } = useParams()

  return (
    <h1 className="text-2xl font-semibold">
      Patient <span className="font-mono text-base text-muted-foreground">{patientId}</span>
    </h1>
  )
}
