import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from '../src/app/page'

describe('Home page', () => {
  test('renders the main heading', () => {
    render(<Home />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toContain('Le coaching en ligne')
    expect(h1.textContent).toContain("centré sur l'humain")
  })

  test('"Trouver un coach" links to the catalog', () => {
    render(<Home />)
    expect(screen.getByRole('link', { name: 'Trouver un coach' }).getAttribute('href')).toBe('/catalog')
  })

  test('"Créer mon programme" links to the programation page', () => {
    render(<Home />)
    expect(screen.getByRole('link', { name: 'Créer mon programme' }).getAttribute('href')).toBe('/programation')
  })

  test('shows the three "how it works" steps in order', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: 'Comment ça marche ?' })).toBeTruthy()
    for (const [num, title] of [
      ['01', 'Recherchez'],
      ['02', 'Connectez'],
      ['03', 'Progressez'],
    ]) {
      expect(screen.getByText(num)).toBeTruthy()
      expect(screen.getByText(title)).toBeTruthy()
    }
  })

  test('shows the four "why Coach\'In" pillars', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: "Pourquoi Coach'In ?" })).toBeTruthy()
    for (const title of ['Vérification stricte', 'Coachs certifiés', 'Approche humaine', 'Flexible']) {
      // "Coachs certifiés" is both a pillar title and a section heading
      expect(screen.getAllByText(title).length).toBeGreaterThan(0)
    }
  })

  test('has a placeholder for the certified coaches section', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: 'Coachs certifiés' })).toBeTruthy()
    expect(screen.getByText(/Les profils coachs s'afficheront ici/)).toBeTruthy()
  })

  test('exposes the anchor ids used for in-page navigation', () => {
    const { container } = render(<Home />)
    for (const id of ['Demo', 'coaches', 'why']) {
      expect(container.querySelector(`#${id}`)).not.toBeNull()
    }
  })
})
