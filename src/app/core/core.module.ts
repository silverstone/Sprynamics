import { CheckoutService } from '#app/checkout/checkout.service'
import { GoogleMapsService } from '#core/gmaps.service'
import { MlsService } from '#core/mls.service'
import { StateService } from '#core/state.service'
import { WebfontService } from '#core/webfont.service'
import { HttpClientModule } from '@angular/common/http'
import { NgModule } from '@angular/core'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { AngularFireModule } from 'angularfire2'
import { AngularFireAuthModule } from 'angularfire2/auth'
import { AngularFirestoreModule } from 'angularfire2/firestore'
import { AngularFireStorageModule } from 'angularfire2/storage'
import { ContextMenuModule } from 'ngx-contextmenu'
import { environment } from '../../environments/environment'
import { AuthService } from './auth.service'
import { FirestoreService } from './firestore.service'
import { NavigationService } from './navigation.service'
import { StorageService } from './storage.service'

@NgModule({
  imports: [
    // angularfire2
    AngularFireModule.initializeApp(environment.firebaseConfig),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    // misc packages
    NgbModule.forRoot(),
    // RecaptchaModule.forRoot(),
    HttpClientModule,
    ContextMenuModule.forRoot()
  ],
  providers: [
    AuthService,
    StorageService,
    FirestoreService,
    NavigationService,
    CheckoutService,
    MlsService,
    GoogleMapsService,
    WebfontService,
    StateService
  ]
})
export class CoreModule {}
