import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RegisterPage from '../src/app/register/page'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const jsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response
const type = (placeholder: string | RegExp, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } })

function fillStep1(password = 'password1', confirm = password) {
  type('johndoe', 'john')
  type('vous@exemple.com', 'john@x.fr')
  type('8 caractères minimum', password)
  type('••••••••', confirm)
}
const submitForm = (placeholder: string | RegExp) =>
  fireEvent.submit(screen.getByPlaceholderText(placeholder).closest('form')!)

describe('Register page - step 1 (account)', () => {
  beforeEach(() => push.mockClear())

  test('starts on the account step as athlete with two steps', () => {
    render(<RegisterPage />)
    expect(screen.getByText('Compte')).toBeTruthy()
    expect(screen.getByText('Profil')).toBeTruthy()
    expect(screen.queryByText('Diplôme')).toBeNull()
    expect(screen.getByText(/accéder aux coachs certifiés/)).toBeTruthy()
  })

  test('choosing coach adds a third "Diplôme" step and changes the hint', () => {
    render(<RegisterPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }))
    expect(screen.getByText('Diplôme')).toBeTruthy()
    expect(screen.getByText(/diplômes seront vérifiés avant activation/)).toBeTruthy()
  })

  test('links to the login page', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('link', { name: 'Se connecter' }).getAttribute('href')).toBe('/login')
  })

  test('password requires at least 8 characters', () => {
    render(<RegisterPage />)
    const pw = screen.getByPlaceholderText('8 caractères minimum') as HTMLInputElement
    expect(pw.minLength).toBe(8)
    expect(pw.required).toBe(true)
  })

  test('shows a mismatch warning and blocks "Suivant" when passwords differ', () => {
    render(<RegisterPage />)
    fillStep1('password1', 'password2')
    expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Suivant/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  test('no mismatch warning while the confirmation is empty or matching', () => {
    render(<RegisterPage />)
    type('8 caractères minimum', 'password1')
    expect(screen.queryByText('Les mots de passe ne correspondent pas.')).toBeNull()
    type('••••••••', 'password1')
    expect(screen.queryByText('Les mots de passe ne correspondent pas.')).toBeNull()
    expect((screen.getByRole('button', { name: /Suivant/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  test('both password fields can be revealed independently', () => {
    render(<RegisterPage />)
    const pw = screen.getByPlaceholderText('8 caractères minimum') as HTMLInputElement
    const confirm = screen.getByPlaceholderText('••••••••') as HTMLInputElement
    fireEvent.click(pw.parentElement!.querySelector('button')!)
    expect(pw.type).toBe('text')
    expect(confirm.type).toBe('password')
    fireEvent.click(confirm.parentElement!.querySelector('button')!)
    expect(confirm.type).toBe('text')
  })

  test('"Suivant" moves to the profile step and "Retour" goes back keeping the values', () => {
    render(<RegisterPage />)
    fillStep1()
    submitForm('johndoe')
    expect(screen.getByPlaceholderText('25')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Retour/ }))
    expect((screen.getByPlaceholderText('johndoe') as HTMLInputElement).value).toBe('john')
    expect((screen.getByPlaceholderText('vous@exemple.com') as HTMLInputElement).value).toBe('john@x.fr')
  })
})

describe('Register page - athlete signup', () => {
  beforeEach(() => push.mockClear())

  function goToProfileStep() {
    render(<RegisterPage />)
    fillStep1()
    submitForm('johndoe')
  }

  test('sends the athlete payload with parsed age and trimmed tags, then redirects', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ token: 'tok' }))
      .mockResolvedValueOnce(jsonResponse({}))
    goToProfileStep()
    type('25', '30')
    type('Football, Running, Casual...', ' Foot , , Running ')
    type(/Améliorer mon endurance/, 'Courir un marathon')
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/profilsportif'))

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/users/auth/signup')
    expect(JSON.parse(init?.body as string)).toEqual({
      email: 'john@x.fr',
      username: 'john',
      password: 'password1',
      role: 'athlete',
      athleteProfile: { age: 30, goals: 'Courir un marathon', tagNames: ['Foot', 'Running'] },
    })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/set-token')
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({ token: 'tok' })
  })

  test('optional fields are omitted when left empty', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ token: 'tok' }))
      .mockResolvedValueOnce(jsonResponse({}))
    goToProfileStep()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    await waitFor(() => expect(push).toHaveBeenCalled())
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
    // JSON.stringify drops undefined values
    expect(body.athleteProfile).toEqual({ tagNames: [] })
  })

  test('shows the API error and stays on the page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({ message: 'Email déjà utilisé' }, false))
    goToProfileStep()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Email déjà utilisé')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })

  test('falls back to a generic error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({}, false))
    goToProfileStep()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Une erreur est survenue.')).toBeTruthy()
  })

  test('shows a network error when the server is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('network'))
    goToProfileStep()
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Impossible de contacter le serveur. Réessayez.')).toBeTruthy()
  })
})

describe('Register page - coach signup and diploma upload', () => {
  beforeEach(() => {
    push.mockClear()
    vi.useRealTimers()
  })

  async function signUpAsCoach(signupBody: unknown = { coach: { id: 'coach-1' } }) {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ token: 'tok', ...(signupBody as object) }))
      .mockResolvedValueOnce(jsonResponse({}))
    render(<RegisterPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }))
    fillStep1()
    submitForm('johndoe')
    type(/BPJEPS/, 'DEJEPS')
    type(/Powerlifting/, 'Yoga')
    type(/Décrivez votre approche/, 'Je suis coach')
    fireEvent.click(screen.getByRole('button', { name: /Suivant/ }))
    await screen.findByText(/Uploadez maintenant votre justificatif/)
    return fetchMock
  }

  test('coach profile fields are all required', () => {
    render(<RegisterPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Coach' }))
    fillStep1()
    submitForm('johndoe')
    for (const p of [/BPJEPS/, /Powerlifting/, /Décrivez votre approche/]) {
      expect((screen.getByPlaceholderText(p) as HTMLInputElement).required).toBe(true)
    }
  })

  test('sends the coach payload and moves to the diploma step', async () => {
    const fetchMock = await signUpAsCoach()
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      email: 'john@x.fr',
      username: 'john',
      password: 'password1',
      role: 'coach',
      coachProfile: { diploma: 'DEJEPS', specialty: 'Yoga', bio: 'Je suis coach' },
    })
    expect(push).not.toHaveBeenCalled()
  })

  test('"Envoyer le document" is disabled until a file is chosen', async () => {
    await signUpAsCoach()
    expect((screen.getByRole('button', { name: 'Envoyer le document' }) as HTMLButtonElement).disabled).toBe(true)
  })

  test('picking a file shows its name and size and enables the upload', async () => {
    await signUpAsCoach()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([new Uint8Array(2048)], 'diplome.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('diplome.pdf')).toBeTruthy()
    expect(screen.getByText(/2 Ko/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Envoyer le document' }) as HTMLButtonElement).disabled).toBe(false)
  })

  test('a dropped file is accepted', async () => {
    await signUpAsCoach()
    const zone = screen.getByText('Glissez votre fichier ici').closest('div[class*="border-dashed"]')!
    const file = new File(['x'], 'drop.png', { type: 'image/png' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(screen.getByText('drop.png')).toBeTruthy()
  })

  test('uploads the document to the coach endpoint then redirects to the coach profile', async () => {
    const fetchMock = await signUpAsCoach()
    fetchMock.mockResolvedValueOnce(jsonResponse({}))
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['x'], 'd.pdf', { type: 'application/pdf' })] },
    })

    vi.useFakeTimers({ toFake: ['setTimeout'] })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le document' }))
    await vi.waitFor(() => expect(screen.getByText('Document envoyé !')).toBeTruthy())

    const [url, init] = fetchMock.mock.calls[2]
    expect(url).toBe('http://api.test/coach-documents/upload/coach-1')
    expect(init?.method).toBe('POST')
    expect((init?.body as FormData).get('file')).toBeInstanceOf(File)

    expect(push).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2000)
    expect(push).toHaveBeenCalledWith('/profilcoach')
    vi.useRealTimers()
  })

  test('falls back to user.id when the signup response has no coach', async () => {
    const fetchMock = await signUpAsCoach({ user: { id: 'user-9' } })
    fetchMock.mockResolvedValueOnce(jsonResponse({}))
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['x'], 'd.pdf')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le document' }))
    await waitFor(() => expect(fetchMock.mock.calls[2][0]).toBe('http://api.test/coach-documents/upload/user-9'))
  })

  test('shows the upload error returned by the API', async () => {
    const fetchMock = await signUpAsCoach()
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Fichier trop gros' }, false))
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'd.pdf')] } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le document' }))
    expect(await screen.findByText('Fichier trop gros')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })

  test('shows a message when the upload request itself fails', async () => {
    const fetchMock = await signUpAsCoach()
    fetchMock.mockRejectedValueOnce(new TypeError('network'))
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'd.pdf')] } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le document' }))
    expect(await screen.findByText("Impossible d'envoyer le document.")).toBeTruthy()
  })

  test('"Passer pour l\'instant" skips the upload', async () => {
    await signUpAsCoach()
    fireEvent.click(screen.getByRole('button', { name: "Passer pour l'instant" }))
    expect(push).toHaveBeenCalledWith('/profilcoach')
  })
})
