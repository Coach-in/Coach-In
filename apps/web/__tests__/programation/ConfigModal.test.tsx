import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfigModal } from '../../src/app/programation/_components/ConfigModal'
import type { Exercise } from '../../src/app/programation/lib/types'

const exercise: Exercise = { id: 'e1', title: 'Squat barre', description: '', videoUrl: '' }

function setup() {
  const onCancel = vi.fn()
  const onConfirm = vi.fn()
  const view = render(<ConfigModal exercise={exercise} onCancel={onCancel} onConfirm={onConfirm} />)
  return { onCancel, onConfirm, view }
}
const sets = () => screen.getByLabelText('Séries') as HTMLInputElement
const reps = () => screen.getByLabelText('Reps') as HTMLInputElement
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Ajouter au programme' }))
// Bypasses native constraint validation (jsdom, like browsers, blocks a click on submit when min/max are violated)
const submit = () => fireEvent.submit(screen.getByRole('button', { name: 'Ajouter au programme' }).closest('form')!)

describe('ConfigModal', () => {
  test('shows the exercise title and 3 x 10 defaults', () => {
    setup()
    expect(screen.getByText('Squat barre')).toBeTruthy()
    expect(sets().value).toBe('3')
    expect(reps().value).toBe('10')
  })

  test('confirms with the default values', () => {
    const { onConfirm } = setup()
    confirm()
    expect(onConfirm).toHaveBeenCalledWith(3, 10)
  })

  test('confirms with edited values', () => {
    const { onConfirm } = setup()
    fireEvent.change(sets(), { target: { value: '5' } })
    fireEvent.change(reps(), { target: { value: '8' } })
    confirm()
    expect(onConfirm).toHaveBeenCalledWith(5, 8)
  })

  test('caps sets at 20', () => {
    const { onConfirm } = setup()
    fireEvent.change(sets(), { target: { value: '99' } })
    confirm()
    expect(onConfirm).toHaveBeenCalledWith(20, 10)
  })

  test('values below 1 are raised to 1, zero falls back to the default', () => {
    const { onConfirm } = setup()
    fireEvent.change(sets(), { target: { value: '-4' } })
    fireEvent.change(reps(), { target: { value: '0' } })
    submit()
    // -4 is truthy -> clamped to 1; 0 is falsy -> default 10
    expect(onConfirm).toHaveBeenCalledWith(1, 10)
  })

  test('an empty sets field falls back to the default', () => {
    const { onConfirm } = setup()
    fireEvent.change(sets(), { target: { value: '' } })
    submit()
    expect(onConfirm).toHaveBeenCalledWith(3, 10)
  })

  test('native validation blocks a click on submit when sets is below the minimum', () => {
    const { onConfirm } = setup()
    fireEvent.change(sets(), { target: { value: '0' } })
    confirm()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('cancel button and backdrop both call onCancel', () => {
    const { onCancel, view } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    fireEvent.click(view.container.querySelector('.fixed.inset-0')!)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})
