import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';

describe('terms route', () => {
  it('renders without signing in', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/terms');
    expect(TestBed.inject(Router).url).toBe('/terms');
    expect(harness.routeNativeElement?.textContent).toContain('Be a good neighbor');
  });
});
