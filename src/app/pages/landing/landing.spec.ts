import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';

describe('LandingPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('is what a signed-out visitor gets at /', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Never blank');
    const buttons = [...harness.routeNativeElement!.querySelectorAll('button.provider')];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      'Continue with Apple',
      'Continue with Google',
      'Continue with Apple',
      'Continue with Google',
    ]);
  });

  it('sends unknown paths to it too', async () => {
    const harness = await RouterTestingHarness.create('/nowhere');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Never blank');
  });
});
