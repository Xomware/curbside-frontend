import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AccountStore } from '../../account/account-store';
import { failureMessage } from '../../account/messages';
import { AuthSession } from '../../auth/auth-session';
import { Provider } from '../../auth/cognito';
import { takeReturn } from '../../auth/return-to';
import { HomeStep } from '../../onboarding/home-step';
import { onboarding } from '../../onboarding/onboarding';
import { PeopleStep } from '../../onboarding/people-step';
import { Tour } from '../../onboarding/tour';
import { ProviderButton } from '../../ui/provider-button';

type Step = 'name' | 'home' | 'people' | 'tour';

const STEPS: { id: Step; title: string }[] = [
  { id: 'name', title: 'New here' },
  { id: 'home', title: 'Your home' },
  { id: 'people', title: 'Your household' },
  { id: 'tour', title: 'How it works' },
];

/**
 * First run: name, home, household, tour. The step is in the URL (`?step=home&household=…`) so the back button
 * and a reload stay on it. Step one also links this sign-in to an account you already have.
 */
@Component({
  selector: 'xom-welcome',
  imports: [HomeStep, PeopleStep, ReactiveFormsModule, ProviderButton, Tour],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class WelcomePage {
  private readonly auth = inject(AuthSession);
  private readonly account = inject(AccountStore);
  private readonly router = inject(Router);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);

  protected readonly steps = STEPS;
  protected readonly household = computed(() => this.query()?.get('household') ?? null);
  protected readonly step = computed<Step>(() => {
    const step = STEPS.find((s) => s.id === this.query()?.get('step'))?.id ?? 'name';
    // People are added to the house the previous step made; skipping it skips them.
    return step === 'people' && !this.household() ? 'tour' : step;
  });
  protected readonly index = computed(() => STEPS.findIndex((s) => s.id === this.step()));

  protected readonly providers: Provider[] = ['SignInWithApple', 'Google'];
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  // The API takes 1-80 characters after trimming.
  protected readonly name = inject(NonNullableFormBuilder).control('', [
    Validators.required,
    Validators.maxLength(80),
    Validators.pattern(/\S/),
  ]);

  protected async create(): Promise<void> {
    if (this.name.invalid) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.account.create(this.name.value.trim());
      onboarding.start();
      // An invite opened while signed out goes first; joining it brings you back to the home step.
      const back = takeReturn();
      if (back) await this.router.navigateByUrl(back);
      else await this.go('home');
    } catch (error) {
      this.error.set(failureMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async link(provider: Provider): Promise<void> {
    this.busy.set(true);
    await this.auth.begin(provider, 'sign-in', this.auth.idToken() ?? undefined);
  }

  protected useAnother(): void {
    this.auth.logOut();
  }

  protected homeDone(household: string | null): void {
    if (household) void this.go('people', household);
    else this.afterPeople();
  }

  protected afterPeople(): void {
    if (onboarding.toured()) void this.finish();
    else void this.go('tour');
  }

  protected async finish(): Promise<void> {
    onboarding.finish();
    onboarding.markToured();
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }

  private go(step: Step, household?: string): Promise<boolean> {
    return this.router.navigate(['/welcome'], { queryParams: { step, household } });
  }
}
