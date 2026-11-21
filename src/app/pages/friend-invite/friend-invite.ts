import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiError } from '../../api/api';
import { AuthSession } from '../../auth/auth-session';
import { rememberReturn } from '../../auth/return-to';
import { FriendInvitePreview, Friends } from '../../friends/friends';
import { Loading } from '../../ui/loading';
import { SignInButtons } from '../landing/sign-in-buttons';

/** `/friend/:code`, the friend-link twin of `/invite/:code`: sign in if needed, see who sent it, then accept. */
@Component({
  selector: 'xom-friend-invite',
  imports: [Loading, RouterLink, SignInButtons],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friend-invite.html',
})
export class FriendInvitePage implements OnInit {
  private readonly friends = inject(Friends);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthSession);

  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';
  protected readonly invite = signal<FriendInvitePreview | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'own' | 'gone' | 'failed'>('loading');
  protected readonly busy = signal(false);
  protected readonly acceptFailed = signal(false);

  ngOnInit(): void {
    if (!this.auth.signedIn()) {
      rememberReturn(`/friend/${this.code}`);
      return;
    }
    void this.load();
  }

  protected async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.invite.set(await this.friends.preview(this.code));
      this.state.set('ready');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'needs_onboarding') {
        rememberReturn(`/friend/${this.code}`);
        await this.router.navigateByUrl('/welcome');
        return;
      }
      if (error instanceof ApiError && error.code === 'invite_not_found') {
        this.state.set('gone');
        return;
      }
      console.error('Friend invite load failed', error);
      this.state.set('failed');
    }
  }

  protected async accept(): Promise<void> {
    this.busy.set(true);
    this.acceptFailed.set(false);
    try {
      await this.friends.accept(this.code);
      await this.router.navigateByUrl('/friends', { replaceUrl: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'own_invite') {
        this.state.set('own');
        return;
      }
      console.error('Friend invite accept failed', error);
      this.acceptFailed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
