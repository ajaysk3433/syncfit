import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SyncFit Pro initial authentication state', () => {
  render(<App />);
  const loadingElement = screen.getByText(/Verifying authentication credentials/i);
  expect(loadingElement).toBeInTheDocument();
});
