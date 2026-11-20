import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../api/api';
import { AuthSession } from '../../auth/auth-session';
import { rememberReturn } from '../../auth/return-to';
import { MapStore } from '../../map/map-store';
import { InvitePreview, Sharing } from '../../sharing/sharing';
import { Loading } from '../../ui/loading';
import { SignInButtons } from '../landing/sign-in-buttons';

/**
 * `/invite/:code`. Signed out: sign in first and come back here. Signed in: who invited you to which street,
 * then join. Nothing is joined without the click.
 */
@Component({
  selector: 'xom-invite',
  imports: [Loading, RouterLink, SignInButtons],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invite.html',
})
export class InvitePage implements OnInit {
  private readonly sharing = inject(Sharing);
  private readonly map = inject(MapStore);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthSession);

  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';
  protected readonly invite = signal<InvitePreview | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'gone' | 'failed'>('loading');
  protected readonly busy = signal(false);
  protected readonly joinFailed = signal(false);

  ngOnInit(): void {
    if (!this.auth.signedIn()) {
      rememberReturn(`/invite/${this.code}`);
      return;
    }
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.invite.set(await this.sharing.preview(this.code));
      this.state.set('ready');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'needs_onboarding') {
        rememberReturn(`/invite/${this.code}`);
        await this.router.navigateByUrl('/welcome');
        return;
      }
      if (error instanceof ApiError && error.code === 'invite_not_found') {
        this.state.set('gone');
        return;
      }
      console.error('Invite load failed', error);
      this.state.set('failed');
    }
  }

  protected async join(): Promise<void> {
    this.busy.set(true);
    this.joinFailed.set(false);
    try {
      const place = await this.sharing.accept(this.code);
      await this.map.open(place.id);
      await this.router.navigateByUrl('/', { replaceUrl: true });
    } catch (error) {
      console.error('Invite accept failed', error);
      this.joinFailed.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  protected async openStreet(id: string): Promise<void> {
    await this.map.open(id);
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
