import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { ItemCard } from '@/components/content-ui';

describe('portfolio content rendering', () => {
  it('renders an accessible card link and a safe missing-image fallback', () => {
    render(React.createElement(ItemCard, { item: { slug: 'example', title: 'Example project', category: 'Projects', summary: 'A test description.', body: [] }, href: '/projects/example' }));
    expect(screen.getByRole('link', { name: /Example project/ }).getAttribute('href')).toBe('/projects/example');
    expect(screen.getByRole('img', { name: 'Example project cover image' })).toBeTruthy();
  });
});
