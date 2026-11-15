import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgramationPage from '../../src/app/programation/page'
import { getSession, type Session } from '../../src/app/programation/lib/api'
import { AccessGate } from '../../src/app/programation/_components/AccessGate'

vi.mock('../../src/app/programation/lib/api', () => ({ getSession: vi.fn() }))
vi.mock('../../src/app/programation/_components/ProgramationEditor', () => ({
  ProgramationEditor: ({ session }: { session: Session }) => <div data-testid="editor">editor for {session.username}</div>,
}))

const session = (role: Session['role']): Session => ({ token: 't', role, username: 'john' })

describe('Programation page access control', () => {
  beforeEach(() => vi.mocked(getSession).mockReset())

  test('shows a loading gate while the session is being checked', async () => {
    let resolve!: (s: Session | null) => void
    vi.mocked(getSession).mockReturnValue(new Promise((r) => (resolve = r)))
    render(<ProgramationPage />)
    expect(screen.getByText('Chargement…')).toBeTruthy()
    expect(screen.queryByTestId('editor')).toBeNull()
    resolve(null)
    expect(await screen.findByText('Connectez-vous pour programmer')).toBeTruthy()
  })

  test('asks guests to log in', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    render(<ProgramationPage />)
    expect(await screen.findByText('Connectez-vous pour programmer')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Se connecter' }).getAttribute('href')).toBe('/login')
  })

  test('turns coaches away', async () => {
    vi.mocked(getSession).mockResolvedValue(session('coach'))
    render(<ProgramationPage />)
    expect(await screen.findByText('Espace réservé aux sportifs')).toBeTruthy()
    expect(screen.getByRole('link', { name: "Retour à l'accueil" }).getAttribute('href')).toBe('/')
    expect(screen.queryByTestId('editor')).toBeNull()
  })

  test('turns admins away too', async () => {
    vi.mocked(getSession).mockResolvedValue(session('admin'))
    render(<ProgramationPage />)
    expect(await screen.findByText('Espace réservé aux sportifs')).toBeTruthy()
  })

  test('gives athletes the editor with their session', async () => {
    vi.mocked(getSession).mockResolvedValue(session('athlete'))
    render(<ProgramationPage />)
    expect((await screen.findByTestId('editor')).textContent).toBe('editor for john')
  })
})

describe('AccessGate', () => {
  test('loading kind has no link', () => {
    render(<AccessGate kind="loading" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  test('guest and coach kinds each render one heading and one call to action', () => {
    const { rerender } = render(<AccessGate kind="guest" />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Connectez-vous pour programmer')
    rerender(<AccessGate kind="coach" />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Espace réservé aux sportifs')
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})
