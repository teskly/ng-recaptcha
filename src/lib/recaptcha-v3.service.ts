import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, InjectionToken, NgZone, Optional, PLATFORM_ID } from '@angular/core';
import {BehaviorSubject, Observable, Subject, Subscription} from 'rxjs';

import { loadScript, RECAPTCHA_BASE_URL, RECAPTCHA_NONCE } from './recaptcha-loader.service';

export const RECAPTCHA_V3_SITE_KEY = new InjectionToken<string>('recaptcha-v3-site-key');

export interface OnExecuteData {
  /**
   * The name of the action that has been executed.
   */
  action: string;
  /**
   * The token that reCAPTCHA v3 provided when executing the action.
   */
  token: string;
}

type ActionBacklogEntry = [string, Subject<string>];

/**
 * The main service for working with reCAPTCHA v3 APIs.
 *
 * Use the `execute` method for executing a single action, and
 * `onExecute` observable for listening to all actions at once.
 */
@Injectable()
export class ReCaptchaV3Service {
  /** @internal */
  private readonly isBrowser: boolean;
  /** @internal */
  private readonly zone: NgZone;
  /** @internal */
  private actionBacklog: ActionBacklogEntry[] | undefined;
  /** @internal */
  private nonce: string;
  /** @internal */
  private baseUrl: string;
  /** @internal */
  private grecaptcha: ReCaptchaV2.ReCaptcha;

  /** @internal */
  private onExecuteSubject: Subject<OnExecuteData>;
  /** @internal */
  private onExecuteObservable: Observable<OnExecuteData>;

    public siteKey: BehaviorSubject<string> = new BehaviorSubject(null);
    private siteKeyObservable: Observable<string> = this.siteKey.asObservable();
    private sitekeySubscription: Subscription;

  constructor(
    zone: NgZone,
    @Optional() @Inject(RECAPTCHA_V3_SITE_KEY) injectedSiteKey: string,
    // tslint:disable-next-line:no-any
    @Inject(PLATFORM_ID) platformId: any,
    @Optional() @Inject(RECAPTCHA_BASE_URL) baseUrl?: string,
    @Optional() @Inject(RECAPTCHA_NONCE) nonce?: string,
  ) {
      this.zone = zone;
      this.isBrowser = isPlatformBrowser(platformId);
      this.nonce = nonce;
      this.baseUrl = baseUrl;

      if (injectedSiteKey) {
          this.siteKey.next(injectedSiteKey);
          this.init();
      }

      this.sitekeySubscription = this.siteKeyObservable
          .subscribe((newSiteKey: string) => {
              if (newSiteKey) {
                  this.init();
              }
          });
  }

    ngOnDestroy(): void {
        this.sitekeySubscription.unsubscribe();
    }

    public get onExecute(): Observable<OnExecuteData> {
        if (!this.onExecuteSubject) {
            this.onExecuteSubject = new Subject<OnExecuteData>();
            this.onExecuteObservable = this.onExecuteSubject.asObservable();
        }

        return this.onExecuteObservable;
    }

    public execute(action: string): Observable<string> {
        const subject = new Subject<string>();
        if (this.isBrowser) {
            if (!this.grecaptcha) {
                if (!this.actionBacklog) {
                    this.actionBacklog = [];
                }

                this.actionBacklog.push([action, subject]);
            } else {
                this.executeActionWithSubject(action, subject);
            }
        }

        return subject.asObservable();
    }

    private executeActionWithSubject(action: string, subject: Subject<string>): void {
        this.zone.runOutsideAngular(() => {
            (this.grecaptcha.execute as any)(
                this.siteKey.getValue(),
                { action },
            ).then((token: string) => {
                this.zone.run(() => {
                    subject.next(token);
                    subject.complete();
                    if (this.onExecuteSubject) {
                        this.onExecuteSubject.next({ action, token });
                    }
                });
            });
        });
    }

    private init() {
        if (this.isBrowser) {
            if ('grecaptcha' in window) {
                this.grecaptcha = grecaptcha;
            } else {
                loadScript(this.siteKey.getValue(), this.onLoadComplete, '', this.baseUrl, this.nonce);
            }
        }
    }

    private onLoadComplete = (grecaptcha: ReCaptchaV2.ReCaptcha) => {
        this.grecaptcha = grecaptcha;
        if (this.actionBacklog && this.actionBacklog.length > 0) {
            this.actionBacklog.forEach(([action, subject]) => this.executeActionWithSubject(action, subject));
            this.actionBacklog = undefined;
        }
    }
}
