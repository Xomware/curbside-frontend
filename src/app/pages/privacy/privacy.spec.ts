import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';

describe('privacy route', () => {
  it('renders without signing in', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/privacy');
    expect(TestBed.inject(Router).url).toBe('/privacy');
    expect(harness.routeNativeElement?.textContent).toContain('What Curbside stores');
  });
});
