// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('app smoke', () => {
  it('mounts the editor, toolbar, panels and font library', async () => {
    render(<App />);
    expect(await screen.findByText(/Writer Pro/)).toBeTruthy();
    // grouped toolbar menus
    expect(screen.getByText(/File/)).toBeTruthy();
    expect(screen.getByText(/Insert/)).toBeTruthy();
    // sidebar with close button + font tab
    expect(document.querySelector('.sidebar .side-head .close')).toBeTruthy();
    expect(screen.getByText(/Fonts/)).toBeTruthy();
    expect(screen.getByText(/Issues/)).toBeTruthy();
    // language switch present
    expect(screen.getByText('हिं')).toBeTruthy();
    // editor surface + court sheet
    expect(document.querySelector('.ProseMirror')).toBeTruthy();
    expect(document.querySelector('.sheet.guides')).toBeTruthy();
  });
});
