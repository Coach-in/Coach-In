import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProgramBuilder, type SaveState } from '../../src/app/programation/_components/ProgramBuilder'
import { EXERCISE_MIME, INSTANCE_MIME, type ProgramItem } from '../../src/app/programation/lib/types'
import { exportProgramPdf } from '../../src/app/programation/lib/exportPdf'

vi.mock('../../src/app/programation/lib/exportPdf', () => ({ exportProgramPdf: vi.fn() }))

const item = (n: number, over: Partial<ProgramItem> = {}): ProgramItem => ({
  instanceId: `i${n}`,
  exerciseId: `e${n}`,
  title: `Exercice ${n}`,
  description: `Desc ${n}`,
  videoUrl: '',
  sets: 3,
  reps: 10,
  ...over,
})

// jsdom's style object has no unprefixed `animation`, so React listens to the webkit-prefixed event name
const animationEnd = (el: Element) => fireEvent(el, new Event('webkitAnimationEnd', { bubbles: true }))

const idle: SaveState = { saving: false, dirty: false, readOnly: false, isSaved: false }

function setup(props: Partial<React.ComponentProps<typeof ProgramBuilder>> = {}) {
  const handlers = {
    setProgramName: vi.fn(),
    onSave: vi.fn(),
    onNew: vi.fn(),
    setDropIndex: vi.fn(),
    onDropAt: vi.fn(),
    onItemDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    updateItem: vi.fn(),
    moveItem: vi.fn(),
    removeItem: vi.fn(),
    clearProgram: vi.fn(),
  }
  const program = props.program ?? []
  render(
    <ProgramBuilder
      programName="Mon programme"
      program={program}
      totalSets={program.reduce((s, i) => s + i.sets, 0)}
      loading={false}
      saveState={idle}
      drag={null}
      dropIndex={null}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('ProgramBuilder - empty state', () => {
  test('shows the drop zone and hides counters, clear and "+ Nouveau"', () => {
    setup()
    expect(screen.getByText(/Déposez des exercices ici/)).toBeTruthy()
    expect(screen.queryByText(/séries$/)).toBeNull()
    expect(screen.queryByTitle('Vider le programme')).toBeNull()
    expect(screen.queryByRole('button', { name: '+ Nouveau' })).toBeNull()
  })

  test('save and PDF are disabled with no exercise', () => {
    setup()
    expect((screen.getByRole('button', { name: /Enregistrer/ }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /PDF/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  test('highlights the zone when a drag hovers slot 0', () => {
    setup({ dropIndex: 0 })
    expect(screen.getByText("Relâchez pour ajouter l'exercice")).toBeTruthy()
  })

  test('shows the loading state instead of the zone', () => {
    setup({ loading: true })
    expect(screen.getByText('Chargement du programme…')).toBeTruthy()
    expect(screen.queryByText(/Déposez des exercices ici/)).toBeNull()
  })
})

describe('ProgramBuilder - name and header', () => {
  test('shows and edits the programme name', () => {
    const { setProgramName } = setup()
    const input = screen.getByLabelText('Nom du programme') as HTMLInputElement
    expect(input.value).toBe('Mon programme')
    fireEvent.change(input, { target: { value: 'Force' } })
    expect(setProgramName).toHaveBeenCalledWith('Force')
  })

  test('counts a single exercise in the singular', () => {
    setup({ program: [item(1)] })
    expect(screen.getByText('1 exercice · 3 séries')).toBeTruthy()
  })

  test('pluralises exercises', () => {
    setup({ program: [item(1), item(2)] })
    expect(screen.getByText('2 exercices · 6 séries')).toBeTruthy()
  })

  test('"Vider" and "+ Nouveau" call their handlers', () => {
    const h = setup({ program: [item(1)] })
    fireEvent.click(screen.getByTitle('Vider le programme'))
    fireEvent.click(screen.getByRole('button', { name: '+ Nouveau' }))
    expect(h.clearProgram).toHaveBeenCalled()
    expect(h.onNew).toHaveBeenCalled()
  })
})

describe('ProgramBuilder - save status', () => {
  const save = (s: Partial<SaveState>) => ({ saveState: { ...idle, ...s } })

  test('no badge for a brand new programme', () => {
    setup({ program: [item(1)], ...save({}) })
    expect(screen.queryByText('Enregistré')).toBeNull()
  })

  test.each([
    [{ isSaved: true }, 'Enregistré'],
    [{ isSaved: true, dirty: true }, 'Modifications non enregistrées'],
    [{ isSaved: true, dirty: true, saving: true }, 'Enregistrement…'],
    [{ readOnly: true, isSaved: true }, 'Programme de votre coach'],
  ])('badge for %j is "%s"', (state, text) => {
    setup({ program: [item(1)], ...save(state) })
    expect(screen.getAllByText(text).length).toBeGreaterThan(0)
  })

  test('save is disabled when already saved and unchanged', () => {
    setup({ program: [item(1)], ...save({ isSaved: true }) })
    expect((screen.getByRole('button', { name: /Enregistrer/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  test('save is enabled for new or modified programmes and calls onSave', () => {
    const h = setup({ program: [item(1)], ...save({ isSaved: true, dirty: true }) })
    const button = screen.getByRole('button', { name: /Enregistrer/ }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    expect(h.onSave).toHaveBeenCalled()
  })

  test('save is disabled while saving', () => {
    setup({ program: [item(1)], ...save({ saving: true, dirty: true }) })
    expect((screen.getByRole('button', { name: 'Enregistrement…' }) as HTMLButtonElement).disabled).toBe(true)
  })

  test('read-only hides the save button and explains why', () => {
    setup({ program: [item(1)], ...save({ readOnly: true, isSaved: true }) })
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).toBeNull()
    expect(screen.getByText(/créé par votre coach/)).toBeTruthy()
  })
})

describe('ProgramBuilder - items', () => {
  test('renders each item with number, title, description, sets and reps', () => {
    setup({ program: [item(1, { sets: 4, reps: 12 }), item(2)] })
    expect(screen.getByText('Exercice 1')).toBeTruthy()
    expect(screen.getByText('Desc 2')).toBeTruthy()
    const [sets, reps] = screen.getAllByTitle('Séries')[0].parentElement!.querySelectorAll('input')
    expect((sets as HTMLInputElement).value).toBe('4')
    expect((reps as HTMLInputElement).value).toBe('12')
  })

  test('editing sets / reps calls updateItem and clamps to at least 1', () => {
    const h = setup({ program: [item(1)] })
    fireEvent.change(screen.getByTitle('Séries'), { target: { value: '5' } })
    expect(h.updateItem).toHaveBeenLastCalledWith('i1', { sets: 5 })
    fireEvent.change(screen.getByTitle('Répétitions'), { target: { value: '0' } })
    expect(h.updateItem).toHaveBeenLastCalledWith('i1', { reps: 1 })
    fireEvent.change(screen.getByTitle('Séries'), { target: { value: '-3' } })
    expect(h.updateItem).toHaveBeenLastCalledWith('i1', { sets: 1 })
  })

  test('first item cannot move up, last cannot move down', () => {
    setup({ program: [item(1), item(2)] })
    const up = screen.getAllByTitle('Monter') as HTMLButtonElement[]
    const down = screen.getAllByTitle('Descendre') as HTMLButtonElement[]
    expect(up[0].disabled).toBe(true)
    expect(up[1].disabled).toBe(false)
    expect(down[0].disabled).toBe(false)
    expect(down[1].disabled).toBe(true)
  })

  test('move buttons call moveItem with index and direction', () => {
    const h = setup({ program: [item(1), item(2)] })
    fireEvent.click(screen.getAllByTitle('Monter')[1])
    expect(h.moveItem).toHaveBeenLastCalledWith(1, -1)
    fireEvent.click(screen.getAllByTitle('Descendre')[0])
    expect(h.moveItem).toHaveBeenLastCalledWith(0, 1)
  })

  test('removal waits for the exit animation to finish', () => {
    const h = setup({ program: [item(1)] })
    fireEvent.click(screen.getByTitle('Retirer du programme'))
    expect(h.removeItem).not.toHaveBeenCalled()
    animationEnd(document.querySelector('[data-card]')!)
    expect(h.removeItem).toHaveBeenCalledWith('i1')
  })

  test('animation end on a card that is not being removed does nothing', () => {
    const h = setup({ program: [item(1)] })
    animationEnd(document.querySelector('[data-card]')!)
    expect(h.removeItem).not.toHaveBeenCalled()
  })

  test('shows an image when there is one, a placeholder otherwise', () => {
    setup({ program: [item(1, { imageUrl: '/a.jpg' }), item(2)] })
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('img').getAttribute('src')).toBe('/a.jpg')
  })

  test('video link only appears for items with a video', () => {
    setup({ program: [item(1, { videoUrl: 'https://v.fr/1' }), item(2)] })
    const links = screen.getAllByTitle('Voir la démonstration')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('https://v.fr/1')
    expect(links[0].getAttribute('rel')).toContain('noopener')
  })

  test('items start a drag through onItemDragStart', () => {
    const h = setup({ program: [item(1), item(2)] })
    fireEvent.dragStart(document.querySelectorAll('[data-card]')[1])
    expect(h.onItemDragStart).toHaveBeenCalledWith(expect.anything(), 1)
  })

  test('dropping on the list reports a slot at the end of the program', () => {
    const h = setup({ program: [item(1), item(2)] })
    // jsdom has no layout (all offsets are 0), so a drop below the top lands after the last card
    const list = document.querySelector('[data-card]')!.parentElement!.parentElement!
    fireEvent.drop(list, { clientY: 100 })
    expect(h.onDropAt).toHaveBeenCalledWith(expect.anything(), 2)
  })

  test('dragging over the list updates the drop slot, but not onto the dragged item itself', () => {
    const h = setup({ program: [item(1), item(2)], drag: { kind: 'item', from: 1 } })
    const list = document.querySelector('[data-card]')!.parentElement!.parentElement!
    // slot 2 === from + 1 -> no-op slot -> cleared
    fireEvent.dragOver(list, { clientY: 100, dataTransfer: { types: [INSTANCE_MIME] } })
    expect(h.setDropIndex).not.toHaveBeenCalled() // dropIndex is already null
  })

  test('dragging a library exercise over the list sets the slot', () => {
    const h = setup({ program: [item(1), item(2)], drag: { kind: 'library', exerciseId: 'x' } })
    const list = document.querySelector('[data-card]')!.parentElement!.parentElement!
    fireEvent.dragOver(list, { clientY: 100, dataTransfer: { types: [EXERCISE_MIME] } })
    expect(h.setDropIndex).toHaveBeenCalledWith(2)
  })
})

describe('ProgramBuilder - preview modal', () => {
  test('opens with the exercise details and closes with the X button', () => {
    setup({ program: [item(1, { sets: 1, reps: 15, videoUrl: 'https://v.fr' })] })
    fireEvent.click(screen.getByTitle('Aperçu complet'))
    expect(screen.getByText("Aperçu de l'exercice")).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Exercice 1' })).toBeTruthy()
    expect(screen.getByText('Voir la démonstration vidéo')).toBeTruthy()
    expect(screen.getByText((_, el) => el?.tagName === 'DIV' && el.textContent === '1 série × 15')).toBeTruthy()
    fireEvent.click(screen.getByTitle('Fermer'))
    expect(screen.queryByText("Aperçu de l'exercice")).toBeNull()
  })

  test('shows "Aucune description" when empty and pluralises sets', () => {
    setup({ program: [item(1, { description: '' })] })
    fireEvent.click(screen.getByTitle('Aperçu complet'))
    expect(screen.getByText('Aucune description')).toBeTruthy()
    expect(screen.getByText((_, el) => el?.tagName === 'DIV' && el.textContent === '3 séries × 10')).toBeTruthy()
  })
})

describe('ProgramBuilder - PDF export', () => {
  test('exports the current name and items', async () => {
    vi.mocked(exportProgramPdf).mockResolvedValue(undefined as never)
    setup({ program: [item(1)] })
    fireEvent.click(screen.getByRole('button', { name: /PDF/ }))
    expect(await screen.findByRole('button', { name: /PDF/ })).toBeTruthy()
    expect(exportProgramPdf).toHaveBeenCalledWith('Mon programme', [expect.objectContaining({ instanceId: 'i1' })])
  })

  test('shows an error when the export fails', async () => {
    vi.mocked(exportProgramPdf).mockRejectedValue(new Error('boom'))
    setup({ program: [item(1)] })
    fireEvent.click(screen.getByRole('button', { name: /PDF/ }))
    expect(await screen.findByText("L'export du PDF a échoué, réessayez.")).toBeTruthy()
  })
})
