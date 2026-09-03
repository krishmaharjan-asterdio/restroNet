import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Search from './Search';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));

// Leaflet marker asset imports resolve to real PNGs under Vite but not in the
// vitest asset pipeline — stub them so the module loads.
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: 'marker-icon.png' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: 'marker-shadow.png' }));

// react-leaflet renders a real Leaflet map into the DOM, which jsdom can't do.
// Swap the pieces for pass-through elements so we can assert on what Search
// hands the map — specifically which markers land inside the cluster group.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children, position }) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>{children}</div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ invalidateSize: vi.fn(), fitBounds: vi.fn() }),
}));

vi.mock('react-leaflet-cluster', () => ({
  default: ({ children }) => <div data-testid="cluster-group">{children}</div>,
}));

vi.mock('../components/RestaurantCard', () => ({
  default: ({ venue }) => <div data-testid="restaurant-card">{venue.name}</div>,
}));

const venues = [
  { _id: '1', name: 'Thamel Spot',  slug: 'thamel-spot',  cuisines: [], tags: [], priceRange: 2, averageRating: 0, location: { type: 'Point', coordinates: [85.3112, 27.7151] } },
  { _id: '2', name: 'Patan Spot',   slug: 'patan-spot',   cuisines: [], tags: [], priceRange: 3, averageRating: 0, location: { type: 'Point', coordinates: [85.3255, 27.6727] } },
  { _id: '3', name: 'Bhaktapur Spot',slug: 'bhaktapur-spot',cuisines: [], tags: [], priceRange: 1, averageRating: 0, location: { type: 'Point', coordinates: [85.4283, 27.6720] } },
];

const mockApi = (recommendations) => {
  api.get.mockImplementation((url) => {
    if (url.startsWith('/metadata/cuisines')) return Promise.resolve({ data: { cuisines: [] } });
    if (url.startsWith('/recommendations/smart')) return Promise.resolve({ data: { recommendations, suggestions: [] } });
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
};

const renderSearch = () =>
  render(<MemoryRouter><Search /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  global.navigator.geolocation = { getCurrentPosition: vi.fn() };
});

describe('Search map clustering', () => {
  test('every venue marker is rendered inside the cluster group', async () => {
    mockApi(venues);
    renderSearch();

    const cluster = await screen.findByTestId('cluster-group');
    await waitFor(() => {
      expect(within(cluster).getAllByTestId('marker')).toHaveLength(3);
    });
  });

  test('markers keep [lat, lng] order from the venue GeoJSON coordinates', async () => {
    mockApi(venues);
    renderSearch();

    const cluster = await screen.findByTestId('cluster-group');
    await waitFor(() => expect(within(cluster).getAllByTestId('marker')).toHaveLength(3));

    const positions = within(cluster)
      .getAllByTestId('marker')
      .map((m) => JSON.parse(m.getAttribute('data-position')));
    // GeoJSON stores [lng, lat]; the map needs [lat, lng].
    expect(positions).toContainEqual([27.7151, 85.3112]);
    expect(positions).toContainEqual([27.6720, 85.4283]);
  });

  test('cluster group renders with no markers when the search returns nothing', async () => {
    mockApi([]);
    renderSearch();

    const cluster = await screen.findByTestId('cluster-group');
    expect(within(cluster).queryAllByTestId('marker')).toHaveLength(0);
  });
});
