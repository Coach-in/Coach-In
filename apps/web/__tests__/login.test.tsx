import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginPage from '../src/app/login/page'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const jsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response

function fillAndSubmit(email = 'a@b.fr', password = 'secret123') {
  fireEvent.change(screen.getByPlaceholderText('vous@exemple.com'), { target: { value: email } })
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: password } })
  fireEvent.submit(screen.getByPlaceholderText('vous@exemple.com').closest('form')!)
}

describe('Login page', () => {
  beforeEach(() => {
    push.mockClear()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  test('defaults to the athlete role', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: 'Connexion sportif' })).toBeTruthy()
    expect(screen.getByText(/accéder à vos programmes/)).toBeTruthy()
  })

  test('switching to coach changes the hint and the submit label', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /^Coach$/ }))
    expect(screen.getByRole('button', { name: 'Connexion coach' })).toBeTruthy()
    expect(screen.getByText(/gérer vos athlètes/)).toBeTruthy()
  })

  test('links to register and forgot-password', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: "S'inscrire" }).getAttribute('href')).toBe('/register')
    expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' }).getAttribute('href')).toBe('/forgot-password')
  })

  test('email and password fields are required', () => {
    render(<LoginPage />)
    expect((screen.getByPlaceholderText('vous@exemple.com') as HTMLInputElement).required).toBe(true)
    expect((screen.getByPlaceholderText('••••••••') as HTMLInputElement).required).toBe(true)
  })

  test('password is hidden by default and can be toggled', () => {
    render(<LoginPage />)
    const input = screen.getByPlaceholderText('••••••••') as HTMLInputElement
    expect(input.type).toBe('password')
    // The eye button is the only button inside the password field wrapper
    const toggle = input.parentElement!.querySelector('button')!
    fireEvent.click(toggle)
    expect(input.type).toBe('text')
    fireEvent.click(toggle)
    expect(input.type).toBe('password')
  })

  test('successful login posts credentials, stores the token and redirects an athlete', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ token: 'jwt-123' }))
      .mockResolvedValueOnce(jsonResponse({}))
    render(<LoginPage />)
    fillAndSubmit('me@x.fr', 'pw-pw-pw')

    await waitFor(() => expect(push).toHaveBeenCalledWith('/profilsportif'))

    const [loginUrl, loginInit] = fetchMock.mock.calls[0]
    expect(loginUrl).toBe('http://api.test/users/auth/login')
    expect(loginInit?.method).toBe('POST')
    expect(JSON.parse(loginInit?.body as string)).toEqual({ email: 'me@x.fr', password: 'pw-pw-pw' })

    const [cookieUrl, cookieInit] = fetchMock.mock.calls[1]
    expect(cookieUrl).toBe('/api/auth/set-token')
    expect(JSON.parse(cookieInit?.body as string)).toEqual({ token: 'jwt-123' })
  })

  test('a coach is redirected to the coach profile', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ token: 't' }))
      .mockResolvedValueOnce(jsonResponse({}))
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /^Coach$/ }))
    fillAndSubmit()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/profilecoach'))
  })

  test('shows the API error message and does not redirect on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({ message: 'Mauvais mot de passe' }, false))
    render(<LoginPage />)
    fillAndSubmit()
    expect(await screen.findByText('Mauvais mot de passe')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })

  test('falls back to a default message when the API sends none', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({}, false))
    render(<LoginPage />)
    fillAndSubmit()
    expect(await screen.findByText('Identifiants invalides.')).toBeTruthy()
  })

  test('shows a network error message when the server is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('network'))
    render(<LoginPage />)
    fillAndSubmit()
    expect(await screen.findByText('Impossible de contacter le serveur. Réessayez.')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
  })

  test('disables the submit button while the request is pending', async () => {
    let resolve!: (r: Response) => void
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)))
    render(<LoginPage />)
    fillAndSubmit()
    const button = (await screen.findByRole('button', { name: 'Connexion...' })) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    resolve(jsonResponse({ message: 'nope' }, false))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Connexion sportif' }) as HTMLButtonElement).disabled).toBe(false))
  })

  test('switching role clears a displayed error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({ message: 'Erreur X' }, false))
    render(<LoginPage />)
    fillAndSubmit()
    await screen.findByText('Erreur X')
    fireEvent.click(screen.getByRole('button', { name: /^Coach$/ }))
    expect(screen.queryByText('Erreur X')).toBeNull()
  })
})
