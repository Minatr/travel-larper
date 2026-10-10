import { useHealth } from '../hooks/useHealth.ts'

/** Shows whether the frontend can reach the API and the API its database. */
export function HealthPage() {
  const state = useHealth()

  return (
    <main>
      <h1>Travel Larper</h1>
      {state.kind === 'loading' && <p>Vérification…</p>}
      {state.kind === 'unreachable' && <p>API : injoignable</p>}
      {state.kind === 'loaded' && (
        <ul>
          <li>API : {state.health.status}</li>
          <li>Base : {state.health.database}</li>
        </ul>
      )}
    </main>
  )
}
