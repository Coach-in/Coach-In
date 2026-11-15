import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ProgramationEditor } from '../../src/app/programation/_components/ProgramationEditor'
import { api, ApiError, type ApiExercise, type ApiProgramme } from '../../src/app/programation/lib/api'
import { compressImage, compressImageFile } from '../../src/app/programation/lib/image'
import { EXERCISE_MIME } from '../../src/app/programation/lib/types'

let searchParams = new URLSearchParams()
const router = { push: vi.fn(), replace: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}))

vi.mock('../../src/app/programation/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/app/programation/lib/api')>()
  return {
    ...actual,
    api: {
      listExercises: vi.fn(),
      createExercise: vi.fn(),
      deleteExercise: vi.fn(),
      uploadExerciseImage: vi.fn(),
      getProgramme: vi.fn(),
      createProgramme: vi.fn(),
      renameProgramme: vi.fn(),
      replaceProgrammeDays: vi.fn(),
    },
  }
})
vi.mock('../../src/app/programation/lib/image', () => ({
  compressImage: vi.fn(),
  compressImageFile: vi.fn(),
  dataUrlToBlob: vi.fn(async () => new Blob(['x'])),
}))
vi.mock('../../src/app/programation/lib/exportPdf', () => ({ exportProgramPdf: vi.fn() }))

const session = { token: 'tok', role: 'athlete' as const, username: 'john' }
const remote = (id: string, name: string, over: Partial<ApiExercise> = {}): ApiExercise => ({ id, name, imageUrl: null, ...over })

const programme = (over: Partial<ApiProgramme> = {}): ApiProgramme => ({
  id: 'p1',
  name: 'Mon bloc',
  startDate: '2026-01-01',
  createdAt: '',
  updatedAt: '',
  coach: null,
  athlete: null,
  days: [
    {
      id: 'd1',
      dayIndex: 1,
      exercises: [
        { id: 'pe1', order: 1, sets: 4, reps: 6, exercise: remote('own1', 'Mon exo') },
        { id: 'pe2', order: 2, sets: 3, reps: 12, exercise: remote('own2', 'Autre exo') },
      ],
    },
  ],
  ...over,
})

const setUrl = (query: string) => {
  searchParams = new URLSearchParams(query)
  window.history.replaceState({}, '', query ? `/?${query}` : '/')
}

async function renderEditor() {
  render(<ProgramationEditor session={session} />)
  await waitFor(() => expect(api.listExercises).toHaveBeenCalled())
}

// The modal's submit button shares its name with the library "+" buttons: scope to the modal form
const modalButton = (name: string) => within(document.querySelector('form.fixed') as HTMLElement).getByRole('button', { name })
const exerciseNameInput = () => document.getElementById('ex-title') as HTMLInputElement

// Adds an exercise from the library through its "+" button and confirms the sets / reps modal
async function addFromLibrary(title: string, confirmModal = true) {
  const row = screen.getByText(title, { selector: 'span' }).closest('li')!
  fireEvent.click(within(row).getAllByTitle('Ajouter au programme')[1])
  if (confirmModal) {
    await screen.findByText("Configurer l'exercice")
    fireEvent.click(modalButton('Ajouter au programme'))
  }
}
const programCards = () => Array.from(document.querySelectorAll('[data-card]'))
const saveButton = () => screen.getByRole('button', { name: /Enregistrer|Enregistrement…/ }) as HTMLButtonElement

describe('ProgramationEditor', () => {
  beforeEach(() => {
    setUrl('')
    router.push.mockClear()
    router.replace.mockClear()
    vi.mocked(api.listExercises).mockResolvedValue([])
    vi.mocked(api.createExercise).mockImplementation(async (_t, b) => remote(`new-${b.name}`, b.name, { description: b.description }))
    vi.mocked(api.deleteExercise).mockResolvedValue(undefined)
    vi.mocked(api.uploadExerciseImage).mockImplementation(async (_t, id) => remote(id, 'x', { imageUrl: 'http://s3/img.jpg' }))
    vi.mocked(api.createProgramme).mockResolvedValue(programme({ id: 'created' }))
    vi.mocked(api.renameProgramme).mockResolvedValue(programme())
    vi.mocked(api.replaceProgrammeDays).mockResolvedValue(programme())
    vi.mocked(compressImage).mockResolvedValue('data:image/jpeg;base64,TPL')
    vi.mocked(compressImageFile).mockResolvedValue('data:image/jpeg;base64,FILE')
  })

  describe('library', () => {
    test('shows the default templates when the account has no exercise', async () => {
      await renderEditor()
      expect(screen.getByText('Squat barre')).toBeTruthy()
      expect(screen.getByText('Soulevé de terre')).toBeTruthy()
      expect(screen.getByText('Développé couché')).toBeTruthy()
      expect(screen.getAllByText('Modèle')).toHaveLength(3)
    })

    test('lists the account exercises after the templates', async () => {
      vi.mocked(api.listExercises).mockResolvedValue([remote('o1', 'Mon exo perso')])
      await renderEditor()
      expect(await screen.findByText('Mon exo perso')).toBeTruthy()
      expect(screen.getAllByText('Modèle')).toHaveLength(3)
    })

    test('hides a template once the athlete owns an exercise with the same name (case-insensitive)', async () => {
      vi.mocked(api.listExercises).mockResolvedValue([remote('o1', '  SQUAT barre ')])
      await renderEditor()
      await waitFor(() => expect(screen.getAllByText('Modèle')).toHaveLength(2))
      expect(screen.getAllByText(/squat barre/i)).toHaveLength(1)
    })

    test('shows an error notice when exercises cannot be loaded', async () => {
      vi.mocked(api.listExercises).mockRejectedValue(new Error('x'))
      await renderEditor()
      expect(await screen.findByRole('status')).toBeTruthy()
      expect(screen.getByText('Impossible de charger vos exercices.')).toBeTruthy()
    })

    test('creating an exercise adds it to the library', async () => {
      await renderEditor()
      fireEvent.change(exerciseNameInput(), { target: { value: 'Squat bulgare' } })
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Technique' } })
      fireEvent.click(screen.getByRole('button', { name: "Créer l'exercice" }))
      expect(await screen.findByText('Squat bulgare')).toBeTruthy()
      expect(api.createExercise).toHaveBeenCalledWith('tok', { name: 'Squat bulgare', description: 'Technique' })
    })

    test('creating an exercise with an image uploads it', async () => {
      await renderEditor()
      fireEvent.change(document.getElementById('ex-image')!, { target: { files: [new File(['x'], 'p.png', { type: 'image/png' })] } })
      await screen.findByAltText('Aperçu')
      fireEvent.change(exerciseNameInput(), { target: { value: 'Avec photo' } })
      fireEvent.click(screen.getByRole('button', { name: "Créer l'exercice" }))
      await waitFor(() => expect(api.uploadExerciseImage).toHaveBeenCalledWith('tok', 'new-Avec photo', expect.any(Blob)))
    })

    test('keeps the exercise and warns when only the image upload fails', async () => {
      vi.mocked(api.uploadExerciseImage).mockRejectedValue(new Error('x'))
      await renderEditor()
      fireEvent.change(document.getElementById('ex-image')!, { target: { files: [new File(['x'], 'p.png', { type: 'image/png' })] } })
      await screen.findByAltText('Aperçu')
      fireEvent.change(exerciseNameInput(), { target: { value: 'Sans photo' } })
      fireEvent.click(screen.getByRole('button', { name: "Créer l'exercice" }))
      expect(await screen.findByText("Exercice créé, mais l'image n'a pas pu être envoyée.")).toBeTruthy()
      expect(screen.getByText('Sans photo')).toBeTruthy()
    })

    test('a failed creation reports the API message in the form', async () => {
      vi.mocked(api.createExercise).mockRejectedValue(new ApiError(409, 'Exercice déjà existant'))
      await renderEditor()
      fireEvent.change(exerciseNameInput(), { target: { value: 'Doublon' } })
      fireEvent.click(screen.getByRole('button', { name: "Créer l'exercice" }))
      expect(await screen.findByText('Exercice déjà existant')).toBeTruthy()
    })

    test('deleting an exercise removes it from the library', async () => {
      vi.mocked(api.listExercises).mockResolvedValue([remote('o1', 'Jetable')])
      await renderEditor()
      await screen.findByText('Jetable')
      fireEvent.click(screen.getByTitle('Supprimer de mes exercices'))
      await waitFor(() => expect(screen.queryByText('Jetable')).toBeNull())
      expect(api.deleteExercise).toHaveBeenCalledWith('tok', 'o1')
    })

    test('refuses to delete an exercise still used in the program', async () => {
      vi.mocked(api.listExercises).mockResolvedValue([remote('o1', 'Utilisé')])
      await renderEditor()
      await screen.findByText('Utilisé')
      await addFromLibrary('Utilisé')
      fireEvent.click(screen.getByTitle('Supprimer de mes exercices'))
      expect(await screen.findByText('Retirez d\'abord cet exercice du programme.')).toBeTruthy()
      expect(api.deleteExercise).not.toHaveBeenCalled()
    })

    test('explains a 409 on delete (used in a saved programme)', async () => {
      vi.mocked(api.listExercises).mockResolvedValue([remote('o1', 'Archivé')])
      vi.mocked(api.deleteExercise).mockRejectedValue(new ApiError(409, 'conflict'))
      await renderEditor()
      await screen.findByText('Archivé')
      fireEvent.click(screen.getByTitle('Supprimer de mes exercices'))
      expect(await screen.findByText('Cet exercice est utilisé dans un programme enregistré.')).toBeTruthy()
      expect(screen.getByText('Archivé')).toBeTruthy()
    })

    test('shows the API message for other delete failures', async () => {
      vi.mocked(api.listExercises).mockResolvedValue([remote('o1', 'Bug')])
      vi.mocked(api.deleteExercise).mockRejectedValue(new ApiError(500, 'Erreur serveur'))
      await renderEditor()
      await screen.findByText('Bug')
      fireEvent.click(screen.getByTitle('Supprimer de mes exercices'))
      expect(await screen.findByText('Erreur serveur')).toBeTruthy()
    })
  })

  describe('building the program', () => {
    test('starts empty with save and PDF disabled', async () => {
      await renderEditor()
      expect(screen.getByLabelText('Nom du programme')).toHaveProperty('value', 'Mon programme')
      expect(programCards()).toHaveLength(0)
      expect(saveButton().disabled).toBe(true)
    })

    test('adding a new exercise asks for sets and reps first', async () => {
      await renderEditor()
      await addFromLibrary('Squat barre', false)
      expect(await screen.findByText("Configurer l'exercice")).toBeTruthy()
      expect(programCards()).toHaveLength(0)
      fireEvent.click(modalButton('Annuler'))
      expect(screen.queryByText("Configurer l'exercice")).toBeNull()
      expect(programCards()).toHaveLength(0)
    })

    test('confirming the modal adds the exercise with the chosen sets and reps', async () => {
      await renderEditor()
      await addFromLibrary('Squat barre', false)
      fireEvent.change(await screen.findByLabelText('Séries'), { target: { value: '5' } })
      fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '8' } })
      fireEvent.click(modalButton('Ajouter au programme'))
      expect(programCards()).toHaveLength(1)
      expect(screen.getByText('1 exercice · 5 séries')).toBeTruthy()
      expect((screen.getByTitle('Répétitions') as HTMLInputElement).value).toBe('8')
    })

    test('adding an exercise already in the program reuses its sets and reps without asking', async () => {
      await renderEditor()
      await addFromLibrary('Squat barre', false)
      fireEvent.change(await screen.findByLabelText('Séries'), { target: { value: '6' } })
      fireEvent.click(modalButton('Ajouter au programme'))
      await addFromLibrary('Squat barre', false)
      expect(screen.queryByText("Configurer l'exercice")).toBeNull()
      expect(programCards()).toHaveLength(2)
      expect(screen.getByText('2 exercices · 12 séries')).toBeTruthy()
      expect(screen.getByText('2× dans le programme')).toBeTruthy()
    })

    test('the library counts usage per exercise', async () => {
      await renderEditor()
      expect(screen.getAllByText('Non utilisé')).toHaveLength(3)
      await addFromLibrary('Soulevé de terre')
      expect(screen.getByText('1× dans le programme')).toBeTruthy()
    })

    test('items can be moved up and down', async () => {
      await renderEditor()
      await addFromLibrary('Squat barre')
      await addFromLibrary('Soulevé de terre')
      const titles = () => programCards().map((c) => c.querySelector('h3')!.textContent)
      expect(titles()).toEqual(['Squat barre', 'Soulevé de terre'])
      fireEvent.click(screen.getAllByTitle('Monter')[1])
      expect(titles()).toEqual(['Soulevé de terre', 'Squat barre'])
      fireEvent.click(screen.getAllByTitle('Descendre')[0])
      expect(titles()).toEqual(['Squat barre', 'Soulevé de terre'])
    })

    test('editing sets inline updates the total', async () => {
      await renderEditor()
      await addFromLibrary('Squat barre')
      fireEvent.change(screen.getByTitle('Séries'), { target: { value: '10' } })
      expect(screen.getByText('1 exercice · 10 séries')).toBeTruthy()
    })

    test('removing an item waits for the exit animation then deletes it', async () => {
      await renderEditor()
      await addFromLibrary('Squat barre')
      fireEvent.click(screen.getByTitle('Retirer du programme'))
      fireEvent.click(screen.getByTitle('Retirer du programme')) // second click on a leaving card is harmless
      fireEvent(programCards()[0], new Event('webkitAnimationEnd', { bubbles: true }))
      expect(programCards()).toHaveLength(0)
    })

    test('"Vider" empties the program', async () => {
      await renderEditor()
      await addFromLibrary('Squat barre')
      await addFromLibrary('Soulevé de terre')
      fireEvent.click(screen.getByTitle('Vider le programme'))
      expect(programCards()).toHaveLength(0)
    })

    test('dropping a library exercise on the list opens the configuration modal', async () => {
      await renderEditor()
      const list = document.querySelector('[class*="rounded-2xl p-2"]')!
      const data: Record<string, string> = { [EXERCISE_MIME]: 'ex-squat' }
      fireEvent.drop(list, { clientY: 10, dataTransfer: { types: [EXERCISE_MIME], getData: (k: string) => data[k] ?? '' } })
      expect(await screen.findByText("Configurer l'exercice")).toBeTruthy()
      expect(screen.getAllByText('Squat barre').length).toBeGreaterThan(1)
    })

    test('dropping an unknown exercise id does nothing', async () => {
      await renderEditor()
      const list = document.querySelector('[class*="rounded-2xl p-2"]')!
      fireEvent.drop(list, { clientY: 10, dataTransfer: { types: [], getData: (k: string) => (k === EXERCISE_MIME ? 'ghost' : '') } })
      expect(screen.queryByText("Configurer l'exercice")).toBeNull()
    })

    test('reordering by drag moves the item to the dropped slot', async () => {
      await renderEditor()
      await addFromLibrary('Squat barre')
      await addFromLibrary('Soulevé de terre')
      await addFromLibrary('Développé couché')
      const titles = () => programCards().map((c) => c.querySelector('h3')!.textContent)
      const list = programCards()[0].parentElement!.parentElement!
      // jsdom has no layout, so every drop lands on the last slot (3): item 0 moves to the end
      const data: Record<string, string> = { 'application/x-coachin-instance': '0' }
      fireEvent.drop(list, { clientY: 50, dataTransfer: { types: [], getData: (k: string) => data[k] ?? '' } })
      expect(titles()).toEqual(['Soulevé de terre', 'Développé couché', 'Squat barre'])
    })
  })

  describe('saving a new programme', () => {
    async function withOneExercise(name = 'Squat barre') {
      await renderEditor()
      await addFromLibrary(name)
    }

    test('copies a template exercise into the account, then creates the programme and updates the URL', async () => {
      await withOneExercise()
      fireEvent.change(screen.getByLabelText('Nom du programme'), { target: { value: '  Force  ' } })
      fireEvent.click(saveButton())

      await waitFor(() => expect(api.createProgramme).toHaveBeenCalled())
      expect(api.createExercise).toHaveBeenCalledWith('tok', expect.objectContaining({ name: 'Squat barre' }))
      const [, body] = vi.mocked(api.createProgramme).mock.calls[0]
      expect(body.name).toBe('Force')
      expect(body.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(body.days).toEqual([
        { dayIndex: 1, name: 'Séance', exercises: [{ exerciseId: 'new-Squat barre', order: 1, sets: 3, reps: 10 }] },
      ])
      expect(router.replace).toHaveBeenCalledWith('/programation?id=created', { scroll: false })
      expect(await screen.findByText('Programme enregistré dans votre profil.')).toBeTruthy()
      expect(screen.getByText('Enregistré')).toBeTruthy()
    })

    test('uploads the template image when copying it', async () => {
      await withOneExercise()
      fireEvent.click(saveButton())
      await waitFor(() => expect(api.createProgramme).toHaveBeenCalled())
      expect(compressImage).toHaveBeenCalledWith('/exercises/squat.jpg')
      expect(api.uploadExerciseImage).toHaveBeenCalledWith('tok', 'new-Squat barre', expect.any(Blob))
    })

    test('reuses the existing exercise when the copy already exists (409)', async () => {
      vi.mocked(api.createExercise).mockRejectedValue(new ApiError(409, 'exists'))
      vi.mocked(api.listExercises).mockResolvedValue([])
      await withOneExercise()
      vi.mocked(api.listExercises).mockResolvedValue([remote('already', 'SQUAT BARRE', { imageUrl: 'http://s3/x.jpg' })])
      fireEvent.click(saveButton())
      await waitFor(() => expect(api.createProgramme).toHaveBeenCalled())
      expect(vi.mocked(api.createProgramme).mock.calls[0][1].days[0].exercises[0].exerciseId).toBe('already')
      expect(api.uploadExerciseImage).not.toHaveBeenCalled()
    })

    test('shows the error and keeps the program when saving fails', async () => {
      vi.mocked(api.createProgramme).mockRejectedValue(new ApiError(400, 'Nom invalide'))
      await withOneExercise()
      fireEvent.click(saveButton())
      expect(await screen.findByText('Nom invalide')).toBeTruthy()
      expect(programCards()).toHaveLength(1)
      expect(saveButton().disabled).toBe(false)
      expect(router.replace).not.toHaveBeenCalled()
    })

    test('an empty name falls back to "Mon programme"', async () => {
      await withOneExercise()
      fireEvent.change(screen.getByLabelText('Nom du programme'), { target: { value: '   ' } })
      fireEvent.click(saveButton())
      await waitFor(() => expect(api.createProgramme).toHaveBeenCalled())
      expect(vi.mocked(api.createProgramme).mock.calls[0][1].name).toBe('Mon programme')
    })

    // Real timers on purpose: Testing Library's waitFor does not cooperate with Vitest fake timers (4.5s auto-dismiss)
    test('the success notice disappears after a few seconds', async () => {
      await withOneExercise()
      fireEvent.click(saveButton())
      await screen.findByText('Programme enregistré dans votre profil.')
      await waitFor(() => expect(screen.queryByRole('status')).toBeNull(), { timeout: 6000 })
    }, 10000)
  })

  describe('unsaved changes', () => {
    test('warns before leaving the page only when there are unsaved changes', async () => {
      await renderEditor()
      const event = () => {
        const e = new Event('beforeunload', { cancelable: true })
        window.dispatchEvent(e)
        return e.defaultPrevented
      }
      expect(event()).toBe(false)
      await addFromLibrary('Squat barre')
      expect(event()).toBe(true)
    })

    test('"+ Nouveau" asks for confirmation when there are unsaved changes', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
      await renderEditor()
      await addFromLibrary('Squat barre')
      fireEvent.click(screen.getByRole('button', { name: '+ Nouveau' }))
      expect(confirm).toHaveBeenCalled()
      expect(programCards()).toHaveLength(1)
      expect(router.push).not.toHaveBeenCalled()

      confirm.mockReturnValue(true)
      fireEvent.click(screen.getByRole('button', { name: '+ Nouveau' }))
      expect(programCards()).toHaveLength(0)
      expect(router.push).toHaveBeenCalledWith('/programation')
    })
  })

  describe('opening a saved programme', () => {
    beforeEach(() => {
      setUrl('id=p1')
      vi.mocked(api.getProgramme).mockResolvedValue(programme())
      vi.mocked(api.listExercises).mockResolvedValue([remote('own1', 'Mon exo'), remote('own2', 'Autre exo')])
    })

    test('loads its name and exercises with sets and reps', async () => {
      await renderEditor()
      await waitFor(() => expect(programCards()).toHaveLength(2))
      expect(api.getProgramme).toHaveBeenCalledWith('tok', 'p1')
      expect((screen.getByLabelText('Nom du programme') as HTMLInputElement).value).toBe('Mon bloc')
      expect(screen.getByText('2 exercices · 7 séries')).toBeTruthy()
      expect(screen.getByText('Enregistré')).toBeTruthy()
      expect(saveButton().disabled).toBe(true)
    })

    test('editing marks it as dirty and saving updates it in place', async () => {
      await renderEditor()
      await waitFor(() => expect(programCards()).toHaveLength(2))
      fireEvent.change(screen.getByLabelText('Nom du programme'), { target: { value: 'Renommé' } })
      expect(screen.getByText('Modifications non enregistrées')).toBeTruthy()
      fireEvent.click(saveButton())
      await waitFor(() => expect(api.replaceProgrammeDays).toHaveBeenCalled())
      expect(api.renameProgramme).toHaveBeenCalledWith('tok', 'p1', 'Renommé')
      expect(api.replaceProgrammeDays).toHaveBeenCalledWith('tok', 'p1', [
        {
          dayIndex: 1,
          name: 'Séance',
          exercises: [
            { exerciseId: 'own1', order: 1, sets: 4, reps: 6 },
            { exerciseId: 'own2', order: 2, sets: 3, reps: 12 },
          ],
        },
      ])
      expect(api.createProgramme).not.toHaveBeenCalled()
      expect(await screen.findByText('Enregistré')).toBeTruthy()
    })

    test('a coach programme is read-only', async () => {
      vi.mocked(api.getProgramme).mockResolvedValue(programme({ coach: { id: 'c', user: { id: 'cu', username: 'coachy' } } }))
      await renderEditor()
      await waitFor(() => expect(programCards()).toHaveLength(2))
      expect(screen.getByText(/créé par votre coach/)).toBeTruthy()
      expect(screen.queryByRole('button', { name: /Enregistrer/ })).toBeNull()
      // No "leave page" warning even after a local edit
      fireEvent.change(screen.getAllByTitle('Séries')[0], { target: { value: '9' } })
      const e = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(false)
    })

    test.each([404, 403, 400])('a %i answer sends the user back with "Programme introuvable."', async (status) => {
      vi.mocked(api.getProgramme).mockRejectedValue(new ApiError(status, 'nope'))
      await renderEditor()
      expect(await screen.findByText('Programme introuvable.')).toBeTruthy()
      expect(router.replace).toHaveBeenCalledWith('/programation')
    })

    test('other load errors show their message', async () => {
      vi.mocked(api.getProgramme).mockRejectedValue(new ApiError(500, 'Serveur en panne'))
      await renderEditor()
      expect(await screen.findByText('Serveur en panne')).toBeTruthy()
      expect(router.replace).toHaveBeenCalledWith('/programation')
    })

    test('shows a loading state while the programme loads', async () => {
      vi.mocked(api.getProgramme).mockReturnValue(new Promise(() => {}))
      await renderEditor()
      expect(screen.getByText('Chargement du programme…')).toBeTruthy()
    })

    test('ignores a response that arrives after the URL moved on', async () => {
      let resolve!: (p: ApiProgramme) => void
      vi.mocked(api.getProgramme).mockReturnValue(new Promise((r) => (resolve = r)))
      await renderEditor()
      window.history.replaceState({}, '', '/') // e.g. "+ Nouveau" clicked meanwhile
      resolve(programme())
      await new Promise((r) => setTimeout(r, 20))
      expect(programCards()).toHaveLength(0)
    })
  })
})
