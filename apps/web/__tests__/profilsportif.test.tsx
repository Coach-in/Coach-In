import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import AthleteProfile from '../src/app/profilsportif/page'
import { api, type ApiProgramme } from '../src/app/programation/lib/api'
import { downloadProgramme } from '../src/app/programation/lib/programmes'

const push = vi.fn()
// Must be a stable object: the page re-fetches whenever `router` changes identity (as the real one never does)
const router = { push }
vi.mock('next/navigation', () => ({ useRouter: () => router }))

vi.mock('../src/app/programation/lib/api', () => ({
  api: { listProgrammes: vi.fn(), getProgramme: vi.fn(), deleteProgramme: vi.fn() },
}))
// exerciseCount stays real: it is pure and part of what the page displays
vi.mock('../src/app/programation/lib/programmes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/app/programation/lib/programmes')>()),
  downloadProgramme: vi.fn(),
}))

const ATHLETE = {
  id: 'a1',
  age: 28,
  goals: 'Courir un marathon',
  tags: [
    { id: 't1', name: 'Running', category: { id: 'c1', name: 'Sport' } },
    { id: 't2', name: 'Casual', category: { id: 'c2', name: 'Niveau' } },
  ],
  user: { id: 'u1', username: 'john_doe', email: 'john@x.fr', role: 'athlete' },
}

const programme = (over: Partial<ApiProgramme> & { id: string; name: string }): ApiProgramme => ({
  startDate: '2026-01-01',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-03-15T00:00:00Z',
  coach: null,
  athlete: null,
  days: [{ id: 'd1', dayIndex: 1, exercises: [{ id: 'e1' }, { id: 'e2' }] as never }],
  ...over,
})

const OWN = programme({ id: 'p1', name: 'Mon bloc force' })
const FROM_COACH = programme({
  id: 'p2',
  name: 'Plan du coach',
  coach: { id: 'c', user: { id: 'cu', username: 'coachy' } },
})

const res = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as Response

function mockFetch({ authenticated = true, me = res(ATHLETE) as Response } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input) === '/api/auth/set-token') return res({ authenticated, token: authenticated ? 'tok' : null })
    return me
  })
}

async function renderProfile() {
  render(<AthleteProfile />)
  await screen.findByRole('heading', { level: 1 })
}

describe('Athlete profile', () => {
  beforeEach(() => {
    push.mockClear()
    vi.mocked(api.listProgrammes).mockResolvedValue([OWN, FROM_COACH])
    vi.mocked(api.getProgramme).mockResolvedValue(OWN)
    vi.mocked(api.deleteProgramme).mockResolvedValue(undefined)
    vi.mocked(downloadProgramme).mockResolvedValue(undefined as never)
  })

  describe('loading and auth', () => {
    test('shows a loading state first', () => {
      mockFetch()
      render(<AthleteProfile />)
      expect(screen.getByText('Chargement du profil...')).toBeTruthy()
    })

    test('redirects to login when there is no session cookie', async () => {
      mockFetch({ authenticated: false })
      render(<AthleteProfile />)
      await waitFor(() => expect(push).toHaveBeenCalledWith('/login'))
    })

    test('redirects to login when the API answers 401', async () => {
      mockFetch({ me: res({}, false, 401) })
      render(<AthleteProfile />)
      await waitFor(() => expect(push).toHaveBeenCalledWith('/login'))
    })

    test('sends the bearer token to /athletes/me', async () => {
      const fetchMock = mockFetch()
      await renderProfile()
      const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/athletes/me'))!
      expect(call[0]).toBe('http://api.test/athletes/me')
      expect((call[1]?.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    })

    test('shows an error screen when the profile request fails', async () => {
      mockFetch({ me: res({}, false, 500) })
      render(<AthleteProfile />)
      expect(await screen.findByText('Impossible de charger le profil.')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Se reconnecter' }))
      expect(push).toHaveBeenCalledWith('/login')
    })

    test('shows an error screen when fetch rejects', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'))
      render(<AthleteProfile />)
      expect(await screen.findByText('Impossible de charger le profil.')).toBeTruthy()
    })
  })

  describe('header', () => {
    test('shows username, email, role and age', async () => {
      mockFetch()
      await renderProfile()
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('@john_doe')
      expect(screen.getAllByText('john@x.fr').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Sportif').length).toBeGreaterThan(0)
      expect(screen.getAllByText('28 ans').length).toBeGreaterThan(0)
    })

    test('builds initials from the username parts', async () => {
      mockFetch()
      await renderProfile()
      expect(screen.getByText('JD')).toBeTruthy()
    })

    test('lists tags with their category', async () => {
      mockFetch()
      await renderProfile()
      expect(screen.getByText('Running')).toBeTruthy()
      expect(screen.getByText('Sport')).toBeTruthy()
      expect(screen.getByText('Casual')).toBeTruthy()
    })

    test('displays the statistics: total, own programmes, tags', async () => {
      mockFetch()
      await renderProfile()
      // "Programmes" is also a tab label: the stat label is the one with a value sibling
      const stat = (label: string) =>
        screen.getAllByText(label).find((el) => el.previousElementSibling)!.previousElementSibling!.textContent
      expect(stat('Programmes')).toBe('2')
      expect(stat('Créés par moi')).toBe('1')
      expect(stat('Tags')).toBe('2')
    })

    test('logout deletes the cookie and redirects to login', async () => {
      const fetchMock = mockFetch()
      await renderProfile()
      fetchMock.mockClear()
      fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))
      await waitFor(() => expect(push).toHaveBeenCalledWith('/login'))
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/set-token', { method: 'DELETE' })
    })
  })

  describe('overview tab', () => {
    test('shows goals and account information', async () => {
      mockFetch()
      await renderProfile()
      expect(screen.getByText('Courir un marathon')).toBeTruthy()
      expect(screen.getByText('Identifiant')).toBeTruthy()
      expect(screen.getByText('Email')).toBeTruthy()
      expect(screen.getByText('Rôle')).toBeTruthy()
    })

    test('shows placeholders when goals and age are missing', async () => {
      mockFetch({ me: res({ ...ATHLETE, goals: '', age: 0 }) })
      await renderProfile()
      expect(screen.getByText('Aucun objectif renseigné.')).toBeTruthy()
      expect(screen.getByText('Non renseigné')).toBeTruthy()
    })

    test('the goals editor opens a textarea and closes on the second click', async () => {
      mockFetch()
      await renderProfile()
      const toggle = screen.getByText('Objectifs').parentElement!.parentElement!.querySelector('button')!
      fireEvent.click(toggle)
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
      expect(textarea.value).toBe('Courir un marathon')
      fireEvent.change(textarea, { target: { value: 'Nouveau but' } })
      fireEvent.click(toggle)
      expect(screen.queryByRole('textbox')).toBeNull()
      expect(screen.getByText('Nouveau but')).toBeTruthy()
    })

    test('"Dernier programme" opens the first programme', async () => {
      mockFetch()
      await renderProfile()
      const card = screen.getByText('Dernier programme').closest('div[class*="border-gold-heavy"]') as HTMLElement
      expect(within(card).getByText('Mon bloc force')).toBeTruthy()
      expect(within(card).getByText(/2 exercices · modifié le/)).toBeTruthy()
      expect(within(card).getByRole('link', { name: /Ouvrir/ }).getAttribute('href')).toBe('/programation?id=p1')
    })

    test('without programmes it invites to create one', async () => {
      vi.mocked(api.listProgrammes).mockResolvedValue([])
      mockFetch()
      await renderProfile()
      expect(screen.getByText("Aucun programme pour l'instant.")).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Créer un programme' }).getAttribute('href')).toBe('/programation')
    })
  })

  describe('programmes tab', () => {
    const openTab = async () => {
      mockFetch()
      await renderProfile()
      fireEvent.click(screen.getByRole('button', { name: 'Programmes' }))
    }

    test('lists every programme with count and numbering', async () => {
      await openTab()
      expect(screen.getByText('2 programmes au total')).toBeTruthy()
      expect(screen.getByText('Mon bloc force')).toBeTruthy()
      expect(screen.getByText('Plan du coach')).toBeTruthy()
    })

    test('uses the singular for a single programme', async () => {
      vi.mocked(api.listProgrammes).mockResolvedValue([OWN])
      await openTab()
      expect(screen.getByText('1 programme au total')).toBeTruthy()
    })

    test('flags coach programmes and makes them view-only', async () => {
      await openTab()
      expect(screen.getByText('COACH @coachy')).toBeTruthy()
      expect(screen.getByRole('link', { name: /Voir/ }).getAttribute('href')).toBe('/programation?id=p2')
      expect(screen.getByRole('link', { name: /Modifier/ }).getAttribute('href')).toBe('/programation?id=p1')
      // Only the athlete's own programme can be deleted
      expect(screen.getAllByRole('button', { name: 'Supprimer' })).toHaveLength(1)
    })

    test('shows the empty state with a call to action', async () => {
      vi.mocked(api.listProgrammes).mockResolvedValue([])
      await openTab()
      expect(screen.getByText(/pas encore de programme/)).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Créer mon premier programme' })).toBeTruthy()
    })

    test('"+ Nouveau" links to the editor', async () => {
      await openTab()
      expect(screen.getByRole('link', { name: '+ Nouveau' }).getAttribute('href')).toBe('/programation')
    })

    test('shows an error and no empty state when programmes fail to load', async () => {
      vi.mocked(api.listProgrammes).mockRejectedValue(new Error('x'))
      await openTab()
      expect(screen.getByText('Impossible de charger vos programmes.')).toBeTruthy()
      expect(screen.queryByText(/pas encore de programme/)).toBeNull()
    })

    test('delete needs a confirmation click, then removes the programme', async () => {
      await openTab()
      fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
      expect(api.deleteProgramme).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Confirmer ?' }))
      await waitFor(() => expect(screen.queryByText('Mon bloc force')).toBeNull())
      expect(api.deleteProgramme).toHaveBeenCalledWith('tok', 'p1')
      expect(screen.getByText('Plan du coach')).toBeTruthy()
    })

    test('blurring the delete button cancels the confirmation', async () => {
      await openTab()
      const button = screen.getByRole('button', { name: 'Supprimer' })
      fireEvent.click(button)
      fireEvent.blur(screen.getByRole('button', { name: 'Confirmer ?' }))
      expect(screen.getByRole('button', { name: 'Supprimer' })).toBeTruthy()
    })

    test('keeps the programme and shows an error when deletion fails', async () => {
      vi.mocked(api.deleteProgramme).mockRejectedValue(new Error('x'))
      await openTab()
      fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
      fireEvent.click(screen.getByRole('button', { name: 'Confirmer ?' }))
      expect(await screen.findByText('La suppression a échoué.')).toBeTruthy()
      expect(screen.getByText('Mon bloc force')).toBeTruthy()
    })

    test('PDF button fetches the full programme then downloads it', async () => {
      await openTab()
      fireEvent.click(screen.getAllByRole('button', { name: 'PDF' })[0])
      await waitFor(() => expect(downloadProgramme).toHaveBeenCalledWith(OWN))
      expect(api.getProgramme).toHaveBeenCalledWith('tok', 'p1')
    })

    test('shows an error when the PDF cannot be generated', async () => {
      vi.mocked(downloadProgramme).mockRejectedValue(new Error('x'))
      await openTab()
      fireEvent.click(screen.getAllByRole('button', { name: 'PDF' })[0])
      expect(await screen.findByText('Le téléchargement du PDF a échoué.')).toBeTruthy()
    })
  })

  describe('messages tab', () => {
    test('shows the unread counter and the messages', async () => {
      mockFetch()
      await renderProfile()
      fireEvent.click(screen.getByRole('button', { name: /Messages/ }))
      expect(screen.getByText('1 message non lu')).toBeTruthy()
      expect(screen.getByText(/Excellent travail sur le squat/)).toBeTruthy()
      expect(screen.getByRole('button', { name: /Ouvrir le chat complet/ })).toBeTruthy()
    })
  })
})
