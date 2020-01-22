# Angular site-key providing free service for Google reCAPTCHA (Based on [ng-recaptcha by @DethAriel](https://github.com/DethAriel/ng-recaptcha))

## ng-skpf-recaptcha [![npm version](https://badge.fury.io/js/ng-skpf-recaptcha.svg)](https://badge.fury.io/js/ng-skpf-recaptcha)

[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/dethariel/ng-recaptcha/master/LICENSE)
[![Build Status](https://travis-ci.org/DethAriel/ng-recaptcha.svg?branch=master)](https://travis-ci.org/DethAriel/ng-recaptcha)

A simple, configurable, easy-to-start service for handling reCAPTCHA v3.

## Table of contents
1. [Installation](#installation)
2. [Basic Usage](example-basic-v3)

## <a name="installation"></a>Installation

The easiest way is to install through [npm](https://www.npmjs.com/package/ng-recaptcha):

```sh
npm i ng-skpf-recaptcha --save
```

### <a name="example-basic-v3"></a>reCAPTCHA v3 Usage

```ts
import { BrowserModule } from '@angular/platform-browser';
import { ReCaptchaV3Service } from 'ng-recaptcha';

import { MyApp } from './app.component.ts';

@NgModule({
  bootstrap: [MyApp],
  declarations: [MyApp],
  imports: [
    BrowserModule
  ],
  providers: [
    ReCaptchaV3Service
  ]
})
export class MyAppModule { }

```

In order to execute a reCAPTCHA v3 action, import the `ReCaptchaV3Service` into your desired component:

```ts
import { ReCaptchaV3Service } from 'ng-recaptcha';

@Component({
  selector: 'recaptcha-demo',
  template: `
    <button (click)="executeImportantAction()">Important action</button>
  `,
})
export class RecaptchaV3DemoComponent {
  constructor(
    private recaptchaV3Service: ReCaptchaV3Service,
  ) {
    // set site-key
    this.recaptchaV3Service.siteKey.next('<RECAPTCHA_V3_SITE_KEY>');
  }

  public executeImportantAction(): void {
    this.recaptchaV3Service.execute('importantAction')
      .subscribe((token) => this.handleToken(token));
  }
```

As always with subscriptions, please don't forget to **unsubscribe**.
