import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';

describe('SignInPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('shows the manual Apple revoke link once after a delete', async () => {
    const url = 'https://support.apple.com/en-us/102571';
    sessionStorage.setItem(
      'curbside.deleted',
      JSON.stringify({ deleted: true, apple_revoke: 'manual', manual_revoke_url: url }),
    );

    const harness = await RouterTestingHarness.create('/sign-in');

    expect(harness.routeNativeElement?.textContent).toContain('account is deleted');
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe(url);
    expect(sessionStorage.getItem('curbside.deleted')).toBeNull();
  });

  it('shows no notice on a normal visit', async () => {
    const harness = await RouterTestingHarness.create('/sign-in');

    expect(harness.routeNativeElement?.querySelector('[role=status]')).toBeNull();
  });
});
