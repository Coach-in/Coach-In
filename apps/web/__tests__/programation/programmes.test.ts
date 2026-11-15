import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  apiToExercise,
  downloadProgramme,
  exerciseCount,
  itemsToDays,
  programmeToItems,
  todayIso,
} from '../../src/app/programation/lib/programmes'
import type { ApiExercise, ApiProgramme } from '../../src/app/programation/lib/api'
import type { ProgramItem } from '../../src/app/programation/lib/types'
import { exportProgramPdf } from '../../src/app/programation/lib/exportPdf'

vi.mock('../../src/app/programation/lib/exportPdf', () => ({ exportProgramPdf: vi.fn() }))

const exo = (id: string, over: Partial<ApiExercise> = {}): ApiExercise => ({ id, name: `Exo ${id}`, imageUrl: null, ...over })

const programme = (days: ApiProgramme['days'], name = 'Prog'): ApiProgramme => ({
  id: 'p',
  name,
  startDate: '2026-01-01',
  createdAt: '',
  updatedAt: '',
  coach: null,
  athlete: null,
  days,
})

describe('apiToExercise', () => {
  test('maps name to title', () => {
    expect(apiToExercise(exo('1', { description: 'd', videoUrl: 'v', imageUrl: 'i' }))).toEqual({
      id: '1',
      title: 'Exo 1',
      description: 'd',
      videoUrl: 'v',
      imageUrl: 'i',
    })
  })

  test('replaces null / missing optional fields by empty strings or undefined', () => {
    expect(apiToExercise(exo('1', { description: null, videoUrl: null, imageUrl: null }))).toEqual({
      id: '1',
      title: 'Exo 1',
      description: '',
      videoUrl: '',
      imageUrl: undefined,
    })
  })
})

describe('programmeToItems', () => {
  test('flattens days ordered by dayIndex and exercises ordered by order', () => {
    const p = programme([
      {
        id: 'd2',
        dayIndex: 2,
        exercises: [{ id: 'pe3', order: 1, sets: 5, reps: 5, exercise: exo('c') }],
      },
      {
        id: 'd1',
        dayIndex: 1,
        exercises: [
          { id: 'pe2', order: 2, sets: 4, reps: 8, exercise: exo('b') },
          { id: 'pe1', order: 1, sets: 3, reps: 10, exercise: exo('a') },
        ],
      },
    ])
    expect(programmeToItems(p).map((i) => i.exerciseId)).toEqual(['a', 'b', 'c'])
  })

  test('carries sets, reps and the programme entry id as instanceId', () => {
    const items = programmeToItems(
      programme([{ id: 'd', dayIndex: 1, exercises: [{ id: 'pe1', order: 1, sets: 4, reps: 12, exercise: exo('a') }] }]),
    )
    expect(items[0]).toMatchObject({ instanceId: 'pe1', exerciseId: 'a', title: 'Exo a', sets: 4, reps: 12 })
  })

  test('does not mutate the original programme', () => {
    const days = [
      { id: 'd2', dayIndex: 2, exercises: [] },
      { id: 'd1', dayIndex: 1, exercises: [] },
    ]
    programmeToItems(programme(days))
    expect(days.map((d) => d.id)).toEqual(['d2', 'd1'])
  })

  test('returns an empty list for a programme without exercises', () => {
    expect(programmeToItems(programme([]))).toEqual([])
  })
})

describe('itemsToDays', () => {
  const item = (exerciseId: string, sets: number, reps: number): ProgramItem => ({
    instanceId: `i-${exerciseId}`,
    exerciseId,
    title: exerciseId,
    description: '',
    videoUrl: '',
    sets,
    reps,
  })

  test('builds a single "Séance" day with 1-based order', () => {
    expect(itemsToDays([item('a', 3, 10), item('b', 4, 8)])).toEqual([
      {
        dayIndex: 1,
        name: 'Séance',
        exercises: [
          { exerciseId: 'a', order: 1, sets: 3, reps: 10 },
          { exerciseId: 'b', order: 2, sets: 4, reps: 8 },
        ],
      },
    ])
  })

  test('an empty program still yields one empty day', () => {
    expect(itemsToDays([])).toEqual([{ dayIndex: 1, name: 'Séance', exercises: [] }])
  })

  test('round-trips with programmeToItems', () => {
    const [day] = itemsToDays([item('a', 3, 10), item('b', 5, 5)])
    const back = programmeToItems(
      programme([
        {
          id: 'd',
          dayIndex: day.dayIndex,
          exercises: day.exercises.map((e, i) => ({ id: `pe${i}`, ...e, exercise: exo(e.exerciseId) })),
        },
      ]),
    )
    expect(back.map((i) => [i.exerciseId, i.sets, i.reps])).toEqual([
      ['a', 3, 10],
      ['b', 5, 5],
    ])
  })
})

describe('exerciseCount', () => {
  test('sums exercises across days', () => {
    const e = { id: 'x', order: 1, sets: 1, reps: 1, exercise: exo('a') }
    expect(
      exerciseCount(
        programme([
          { id: 'd1', dayIndex: 1, exercises: [e, e] },
          { id: 'd2', dayIndex: 2, exercises: [e] },
        ]),
      ),
    ).toBe(3)
  })

  test('tolerates missing days or exercises arrays', () => {
    expect(exerciseCount({ ...programme([]), days: undefined } as unknown as ApiProgramme)).toBe(0)
    expect(exerciseCount(programme([{ id: 'd', dayIndex: 1 } as never]))).toBe(0)
  })
})

describe('downloadProgramme', () => {
  test('exports the programme name and flattened items to PDF', () => {
    downloadProgramme(
      programme([{ id: 'd', dayIndex: 1, exercises: [{ id: 'pe', order: 1, sets: 3, reps: 10, exercise: exo('a') }] }], 'Mon plan'),
    )
    expect(exportProgramPdf).toHaveBeenCalledWith('Mon plan', [expect.objectContaining({ exerciseId: 'a' })])
  })
})

describe('todayIso', () => {
  afterEach(() => vi.useRealTimers())

  test('formats the local date as YYYY-MM-DD', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 12))
    expect(todayIso()).toBe('2026-01-05')
  })

  test('pads month and day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 9, 23, 59))
    expect(todayIso()).toBe('2026-09-09')
  })
})
