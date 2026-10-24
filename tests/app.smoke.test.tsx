// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('app smoke', () => {
  it('mounts the editor, toolbar and panels', async () => {
    render(<App />);
    expect(await screen.findByText(/Writer Pro/)).toBeTruthy();
    expect(screen.getByText(/Verification \/ Affidavit/)).toBeTruthy();
    expect(screen.getAllByText(/Templates/).length).toBeGreaterThan(0);
    // editor surface present
    expect(document.querySelector('.ProseMirror')).toBeTruthy();
    // court sheet with stitching guides
    expect(document.querySelector('.sheet.guides')).toBeTruthy();
  });
});
