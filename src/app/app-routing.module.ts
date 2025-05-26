import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatbotContainerComponent } from './components/chatbot/chatbot-container/chatbot-container.component';
import { LoginComponent } from './components/user/login/login.component';
import { RegisterComponent } from './components/user/register/register.component';
import { AuthGuard } from './gurads/auth.guard';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { ReportGeneratorComponent } from './components/report-generator/report-generator.component';
import { DashboardsComponent } from './components/dashboards/dashboards.component';
import { GeolocationComponent } from './components/geolocation/geolocation.component';
import { SettingsComponent } from './components/header/settings/settings.component';

const routes: Routes = [
  {
    path: 'chatbot',
    component: ChatbotContainerComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'reports',
    component: ReportGeneratorComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'dashboards',
    component: DashboardsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'geolocation',
    component: GeolocationComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  { path: '**', pathMatch: 'full', component: PageNotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [AuthGuard],
})
export class AppRoutingModule {}
