import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Credits } from './Credits'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Credits', () => {
  it('gives the ODbL notice with a link to the licence', () => {
    render(<Credits onBack={vi.fn()} />)
    expect(screen.getByText(/contains information from/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open Database License/ })).toHaveAttribute(
      'href',
      'https://opendatacommons.org/licenses/odbl/1-0/',
    )
  })

  it('opens every link outside the app', () => {
    render(<Credits onBack={vi.fn()} />)
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank')
    }
  })

  it('includes both symbol fonts’ licences, with their copyright lines', () => {
    render(<Credits onBack={vi.fn()} />)
    expect(screen.getByText(/The Roboto Mono Project Authors/)).toBeInTheDocument()
    expect(screen.getByText(/The JetBrains Mono Project Authors/)).toBeInTheDocument()
  })

  it('opens scrolled to the top, whatever Settings was scrolled to', () => {
    const root = document.createElement('div')
    root.id = 'root'
    root.scrollTo = vi.fn()
    document.body.append(root)
    render(<Credits onBack={vi.fn()} />, { container: root })
    expect(root.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('returns to Settings', async () => {
    const onBack = vi.fn()
    render(<Credits onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: '← Settings' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('shows the libraries’ licences from the file written by the build', async () => {
    vi.stubEnv('DEV', false)
    const fetchLicences = vi.fn(async () => new Response('## maplibre-gl - BSD-3-Clause'))
    vi.stubGlobal('fetch', fetchLicences)
    render(<Credits onBack={vi.fn()} />)
    expect(await screen.findByText('## maplibre-gl - BSD-3-Clause')).toBeInTheDocument()
    expect(fetchLicences).toHaveBeenCalledWith('/third-party-licences.md')
  })

  it('says so if the libraries’ licences cannot be loaded', async () => {
    vi.stubEnv('DEV', false)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    render(<Credits onBack={vi.fn()} />)
    expect(await screen.findByText('The licences could not be loaded.')).toBeInTheDocument()
  })
})
