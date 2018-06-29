import { PrivacyPolicyComponent } from '#app/legal/privacy-policy/privacy-policy.component'
import { TermsAndConditionsComponent } from '#app/legal/terms-and-conditions/terms-and-conditions.component'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { AccountComponent } from './account/account.component'
import { AuthGuard } from './core/auth.guard'
import { DashboardComponent } from './dashboard/dashboard.component'

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    loadChildren: './dashboard/dashboard.module#DashboardModule',
    canActivate: [AuthGuard]
  },
  {
    path: 'designer',
    loadChildren: './designer/designer.module#DesignerModule'
  },
  { path: 'terms', component: TermsAndConditionsComponent },
  { path: 'privacy', component: PrivacyPolicyComponent },
  {
    path: 'account',
    component: AccountComponent,
    loadChildren: './account/account.module#AccountModule'
  },
  {
    path: 'profile',
    component: DashboardComponent,
    loadChildren: './dashboard/dashboard.module#DashboardModule',
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [AuthGuard]
})
export class AppRoutingModule {}
