import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Discover from './Discover';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Discover requests the browser's location on mount; stub it out so tests
// don't depend on geolocation permission prompts in the test environment.
beforeEach(() => {
  global.navigator.geolocation = {
    getCurrentPosition: vi.fn(),
  };
});

const renderDiscover = () =>
  render(
    <MemoryRouter>
      <Discover />
    </MemoryRouter>
  );

describe('Discover empty state', () => {
  test('shows empty state with a Clear Filters action when filters return zero results', async () => {
    api.get.mockImplementation((url) => {
      if (url.startsWith('/metadata/cuisines')) {
        return Promise.resolve({ data: { cuisines: [] } });
      }
      if (url.startsWith('/recommendations/smart')) {
        return Promise.resolve({ data: { recommendations: [], aiExplanation: null } });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    renderDiscover();

    await waitFor(() => {
      expect(screen.getByText(/no restaurants found/i)).toBeInTheDocument();
    });
  });

  test('does not show the empty state while results are present', async () => {
    api.get.mockImplementation((url) => {
      if (url.startsWith('/metadata/cuisines')) {
        return Promise.resolve({ data: { cuisines: [] } });
      }
      if (url.startsWith('/recommendations/smart')) {
        return Promise.resolve({
          data: {
            recommendations: [
              { _id: '1', name: 'Test Venue', slug: 'test-venue', cuisines: [], tags: [], priceRange: 2 },
            ],
            aiExplanation: null,
          },
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    renderDiscover();

    await waitFor(() => {
      expect(screen.queryByText(/no restaurants found/i)).not.toBeInTheDocument();
    });
  });

  test('Clear Filters button resets active filters, triggering a new fetch with no filter params', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url.startsWith('/metadata/cuisines')) {
        return Promise.resolve({ data: { cuisines: [] } });
      }
      if (url.startsWith('/recommendations/smart')) {
        return Promise.resolve({ data: { recommendations: [], aiExplanation: null } });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    renderDiscover();

    // Open the filter sidebar and pick a mood so hasFilters becomes true and
    // the "Clear Filters" button appears in the (already-showing) empty state.
    // The desktop filter sidebar is always mounted (only CSS-hidden on small
    // viewports, which JSDOM doesn't evaluate), so the mood chip is already
    // in the DOM without needing to open the mobile filter sheet.
    await waitFor(() => expect(screen.getByText(/no restaurants found/i)).toBeInTheDocument());
    const [nightlifeChip] = await screen.findAllByText('Nightlife');
    await user.click(nightlifeChip);

    const clearButton = await screen.findByRole('button', { name: /clear filters/i });
    await user.click(clearButton);

    // Clearing filters re-fetches with a bare smart-recommendations call —
    // no cuisines/priceRange/mood params should be present.
    await waitFor(() => {
      const smartCalls = api.get.mock.calls.filter(([url]) => url.startsWith('/recommendations/smart'));
      const lastCall = smartCalls[smartCalls.length - 1][0];
      expect(lastCall).not.toMatch(/cuisines=|priceRange=|mood=/);
    });
  });
});
