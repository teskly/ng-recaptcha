import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, InjectionToken, NgZone, OnDestroy, Optional, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';

import { loadScript, RECAPTCHA_BASE_URL, RECAPTCHA_NONCE } from './recaptcha-loader.service';

export const RECAPTCHA_V3_SITE_KEY = new InjectionToken<string>('recaptcha-v3-site-key');

export interface OnExecuteData {
  action: string;
  token: string;
}

type ActionBacklogEntry = [string, Subject<string>];


@Injectable()
export class ReCaptchaV3Service implements OnDestroy {

    private readonly isBrowser: boolean;
    private actionBacklog: ActionBacklogEntry[] | undefined;
    private nonce: string;
    private baseUrl: string;
    private grecaptcha: ReCaptchaV2.ReCaptcha;

    private onExecuteSubject: Subject<OnExecuteData>;
    private onExecuteObservable: Observable<OnExecuteData>;

    public siteKey: BehaviorSubject<string> = new BehaviorSubject(null);
    private siteKeyObservable: Observable<string> = this.siteKey.asObservable();
    private sitekeySubscription: Subscription;

    constructor(
        private zone: NgZone,
        @Optional() @Inject(RECAPTCHA_V3_SITE_KEY) injectedSiteKey: string,
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
