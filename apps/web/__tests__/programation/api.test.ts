import { describe, expect, test, vi } from 'vitest'
import { api, ApiError, getSession } from '../../src/app/programation/lib/api'

const res = (body: unknown, init: { ok?: boolean; status?: number } = {}) =>
  ({ ok: init.ok ?? true, status: init.status ?? 200, json: async () => body }) as Response

describe('getSession', () => {
  test('returns token, role and username for a logged-in user', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(res({ authenticated: true, token: 'tok' }))
      .mockResolvedValueOnce(res({ role: 'athlete', username: 'john' }))
    expect(await getSession()).toEqual({ token: 'tok', role: 'athlete', username: 'john' })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/set-token')
    expect(fetchMock.mock.calls[1][0]).toBe('http://api.test/users/me')
    expect((fetchMock.mock.calls[1][1]?.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  test('returns null when not authenticated, without calling the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(res({ authenticated: false, token: null }))
    expect(await getSession()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('returns null when the cookie says authenticated but has no token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(res({ authenticated: true }))
    expect(await getSession()).toBeNull()
  })

  test('returns null when /users/me rejects the token', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(res({ authenticated: true, token: 't' }))
      .mockResolvedValueOnce(res({}, { ok: false, status: 401 }))
    expect(await getSession()).toBeNull()
  })

  test('returns null when a request throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('network'))
    expect(await getSession()).toBeNull()
  })
})

describe('api client', () => {
  const headersOf = (fetchMock: ReturnType<typeof vi.spyOn>, call = 0) =>
    (fetchMock.mock.calls[call][1] as RequestInit).headers as Record<string, string>

  test('GET requests carry the bearer token but no content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res([]))
    await api.listExercises('tok')
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/exercices')
    expect(headersOf(fetchMock)).toEqual({ Authorization: 'Bearer tok' })
  })

  test('JSON bodies get a content type and are serialised', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res({ id: '1' }))
    await api.createExercise('tok', { name: 'Squat', description: 'd' })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(headersOf(fetchMock)['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Squat', description: 'd' })
  })

  test('image upload sends multipart form data without forcing a content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res({ id: 'e1' }))
    await api.uploadExerciseImage('tok', 'e1', new Blob(['x'], { type: 'image/jpeg' }))
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://api.test/exercices/e1/image')
    expect(init.body).toBeInstanceOf(FormData)
    expect(headersOf(fetchMock)['Content-Type']).toBeUndefined()
    expect(((init.body as FormData).get('file') as File).name).toBe('image.jpg')
  })

  test('204 responses resolve to undefined without parsing a body', async () => {
    const json = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 204, json } as unknown as Response)
    expect(await api.deleteExercise('tok', 'e1')).toBeUndefined()
    expect(json).not.toHaveBeenCalled()
  })

  test('errors become ApiError with the status and the API message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(res({ message: 'Déjà existant' }, { ok: false, status: 409 }))
    const err = await api.createExercise('tok', { name: 'x' }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(409)
    expect(err.message).toBe('Déjà existant')
  })

  test('Nest validation message arrays are joined', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(res({ message: ['name too short', 'bad date'] }, { ok: false, status: 400 }))
    const err = await api.createProgramme('tok', { name: '', startDate: '', days: [] }).catch((e) => e)
    expect(err.message).toBe('name too short, bad date')
  })

  test('falls back to "Erreur <status>" when the body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('bad json')
      },
    } as unknown as Response)
    const err = await api.listProgrammes('tok').catch((e) => e)
    expect(err.message).toBe('Erreur 502')
    expect(err.status).toBe(502)
  })

  test('endpoints use the expected paths and methods', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res({}))
    await api.listProgrammes('t')
    await api.getProgramme('t', 'p1')
    await api.renameProgramme('t', 'p1', 'Nouveau')
    await api.deleteProgramme('t', 'p1')
    const calls = fetchMock.mock.calls.map(([u, i]) => [i?.method ?? 'GET', u])
    expect(calls).toEqual([
      ['GET', 'http://api.test/programmes'],
      ['GET', 'http://api.test/programmes/p1'],
      ['PATCH', 'http://api.test/programmes/p1'],
      ['DELETE', 'http://api.test/programmes/p1'],
    ])
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toEqual({ name: 'Nouveau' })
  })

  test('replaceProgrammeDays deletes every current day, then adds the new ones in order', async () => {
    const current = { id: 'p1', days: [{ id: 'd1' }, { id: 'd2' }] }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if ((init?.method ?? 'GET') === 'GET') return res(current)
      if (init?.method === 'DELETE') return res(undefined, { status: 204 })
      return res({ id: 'p1', days: [] })
    })
    const days = [
      { dayIndex: 1, exercises: [] },
      { dayIndex: 2, exercises: [] },
    ]
    await api.replaceProgrammeDays('t', 'p1', days)
    const calls = fetchMock.mock.calls.map(([u, i]) => `${i?.method ?? 'GET'} ${String(u).replace('http://api.test', '')}`)
    expect(calls).toEqual([
      'GET /programmes/p1',
      'DELETE /programmes/p1/days/d1',
      'DELETE /programmes/p1/days/d2',
      'POST /programmes/p1/days',
      'POST /programmes/p1/days',
    ])
    expect(JSON.parse(fetchMock.mock.calls[3][1]?.body as string)).toEqual(days[0])
  })

  test('replaceProgrammeDays returns the last updated programme', async () => {
    const final = { id: 'p1', name: 'final', days: [] }
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(res({ id: 'p1', days: [] }))
      .mockResolvedValueOnce(res(final))
    expect(await api.replaceProgrammeDays('t', 'p1', [{ dayIndex: 1, exercises: [] }])).toEqual(final)
  })

  test('replaceProgrammeDays with no new days only clears the existing ones', async () => {
    const current = { id: 'p1', days: [{ id: 'd1' }] }
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(res(current))
      .mockResolvedValueOnce(res(undefined, { status: 204 }))
    expect(await api.replaceProgrammeDays('t', 'p1', [])).toEqual(current)
  })
})
