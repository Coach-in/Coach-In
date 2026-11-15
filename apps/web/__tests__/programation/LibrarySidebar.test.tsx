import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LibrarySidebar } from '../../src/app/programation/_components/LibrarySidebar'
import type { Exercise } from '../../src/app/programation/lib/types'
import { compressImageFile } from '../../src/app/programation/lib/image'

vi.mock('../../src/app/programation/lib/image', () => ({ compressImageFile: vi.fn() }))

const ex = (id: string, over: Partial<Exercise> = {}): Exercise => ({
  id,
  title: `Exo ${id}`,
  description: '',
  videoUrl: '',
  ...over,
})

function setup(exercises: Exercise[] = [ex('a'), ex('b', { isTemplate: true })], props: Partial<React.ComponentProps<typeof LibrarySidebar>> = {}) {
  const handlers = {
    onCreateExercise: vi.fn().mockResolvedValue(undefined),
    onAddToProgram: vi.fn(),
    onRemoveExercise: vi.fn(),
    onSetExerciseImage: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
  }
  render(<LibrarySidebar exercises={exercises} usedCount={() => 0} draggingId={null} {...handlers} {...props} />)
  return handlers
}

const nameInput = () => screen.getByLabelText(/Nom/) as HTMLInputElement
const submit = () => fireEvent.click(screen.getByRole('button', { name: /Créer l'exercice|Création…/ }))

describe('LibrarySidebar - list', () => {
  test('lists exercises and flags templates', () => {
    setup()
    expect(screen.getByText('Exo a')).toBeTruthy()
    expect(screen.getByText('Exo b')).toBeTruthy()
    expect(screen.getAllByText('Modèle')).toHaveLength(1)
  })

  test('shows an empty message with no exercise', () => {
    setup([])
    expect(screen.getByText('Aucun exercice. Créez-en un ci-dessus.')).toBeTruthy()
  })

  test('shows how many times each exercise is used', () => {
    setup([ex('a'), ex('b')], { usedCount: (id) => (id === 'a' ? 2 : 0) })
    expect(screen.getByText('2× dans le programme')).toBeTruthy()
    expect(screen.getByText('Non utilisé')).toBeTruthy()
  })

  test('only user-owned exercises can be deleted', () => {
    const h = setup()
    const buttons = screen.getAllByTitle('Supprimer de mes exercices')
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    expect(h.onRemoveExercise).toHaveBeenCalledWith('a')
  })

  test('the "+" button and a click on the row both add to the program', () => {
    const h = setup([ex('a')])
    const [row, plus] = screen.getAllByTitle('Ajouter au programme')
    fireEvent.click(row)
    fireEvent.click(plus)
    expect(h.onAddToProgram).toHaveBeenCalledTimes(2)
    expect(h.onAddToProgram).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  test('rows are draggable and report start / end', () => {
    const h = setup([ex('a')])
    const row = screen.getByText('Exo a').closest('li')!
    expect(row.getAttribute('draggable')).toBe('true')
    fireEvent.dragStart(row)
    expect(h.onDragStart).toHaveBeenCalledWith(expect.anything(), 'a')
    fireEvent.dragEnd(row)
    expect(h.onDragEnd).toHaveBeenCalled()
  })

  test('shows the thumbnail when an exercise has an image', () => {
    setup([ex('a', { imageUrl: '/a.jpg' })])
    expect(screen.getByAltText('Exo a').getAttribute('src')).toBe('/a.jpg')
  })

  test('picking an image for a row compresses it then reports it', async () => {
    vi.mocked(compressImageFile).mockResolvedValue('data:image/jpeg;base64,AAA')
    const h = setup([ex('a')])
    const input = screen.getByTitle('Ajouter une image').querySelector('input')!
    fireEvent.change(input, { target: { files: [new File(['x'], 'p.png', { type: 'image/png' })] } })
    await waitFor(() => expect(h.onSetExerciseImage).toHaveBeenCalledWith('a', 'data:image/jpeg;base64,AAA'))
  })
})

describe('LibrarySidebar - create form', () => {
  test('name is required', () => {
    setup()
    expect(nameInput().required).toBe(true)
  })

  test('submits trimmed values then clears the form', async () => {
    const h = setup()
    fireEvent.change(nameInput(), { target: { value: '  Squat bulgare ' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: ' Technique ' } })
    submit()
    await waitFor(() => expect(nameInput().value).toBe(''))
    expect(h.onCreateExercise).toHaveBeenCalledWith({
      title: 'Squat bulgare',
      description: 'Technique',
      videoUrl: '',
      imageUrl: undefined,
    })
    expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toBe('')
  })

  test('a whitespace-only name is ignored', () => {
    const h = setup()
    fireEvent.change(nameInput(), { target: { value: '   ' } })
    fireEvent.submit(nameInput().closest('form')!)
    expect(h.onCreateExercise).not.toHaveBeenCalled()
  })

  test('keeps what was typed and shows the message when creation fails', async () => {
    const h = setup()
    h.onCreateExercise.mockRejectedValue(new Error('Nom déjà pris'))
    fireEvent.change(nameInput(), { target: { value: 'Squat' } })
    submit()
    expect(await screen.findByText('Nom déjà pris')).toBeTruthy()
    expect(nameInput().value).toBe('Squat')
  })

  test('falls back to a generic message for non-Error rejections', async () => {
    const h = setup()
    h.onCreateExercise.mockRejectedValue('nope')
    fireEvent.change(nameInput(), { target: { value: 'Squat' } })
    submit()
    expect(await screen.findByText("Impossible de créer l'exercice.")).toBeTruthy()
  })

  test('disables the button while creating', async () => {
    let done!: () => void
    const h = setup()
    h.onCreateExercise.mockReturnValue(new Promise<void>((r) => (done = r)))
    fireEvent.change(nameInput(), { target: { value: 'Squat' } })
    submit()
    expect((await screen.findByRole('button', { name: 'Création…' }) as HTMLButtonElement).disabled).toBe(true)
    done()
    await waitFor(() => expect(screen.getByRole('button', { name: "Créer l'exercice" })).toBeTruthy())
  })

  test('a chosen image is previewed, sent with the exercise, and can be removed', async () => {
    vi.mocked(compressImageFile).mockResolvedValue('data:image/jpeg;base64,BBB')
    const h = setup()
    fireEvent.change(document.getElementById('ex-image')!, {
      target: { files: [new File(['x'], 'p.png', { type: 'image/png' })] },
    })
    expect(await screen.findByAltText('Aperçu')).toBeTruthy()
    expect(screen.getByText("Changer l'image")).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: "Retirer l'image" }))
    expect(screen.queryByAltText('Aperçu')).toBeNull()

    fireEvent.change(document.getElementById('ex-image')!, {
      target: { files: [new File(['x'], 'p.png', { type: 'image/png' })] },
    })
    await screen.findByAltText('Aperçu')
    fireEvent.change(nameInput(), { target: { value: 'Avec image' } })
    submit()
    await waitFor(() =>
      expect(h.onCreateExercise).toHaveBeenCalledWith(expect.objectContaining({ title: 'Avec image', imageUrl: 'data:image/jpeg;base64,BBB' })),
    )
  })

  test('shows an error when the image cannot be read', async () => {
    vi.mocked(compressImageFile).mockRejectedValue(new Error('not an image'))
    setup()
    fireEvent.change(document.getElementById('ex-image')!, { target: { files: [new File(['x'], 'p.txt')] } })
    expect(await screen.findByText('Impossible de lire cette image.')).toBeTruthy()
  })
})
