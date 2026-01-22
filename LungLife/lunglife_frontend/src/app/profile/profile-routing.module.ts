import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfileDashboardComponent } from './components/profile-dashboard/profile-dashboard.component';
import { ProfileFormComponent } from './components/profile-form/profile-form.component';
import { ProfileInfoComponent } from './components/profile-info/profile-info.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'info',
    pathMatch: 'full'
  },
  {
    path: 'info',
    component: ProfileInfoComponent
  },
  {
    path: 'dashboard',
    component: ProfileDashboardComponent
  },
  {
    path: 'form',
    component: ProfileFormComponent
  },
  {
    path: 'edit/:id',
    component: ProfileFormComponent
  }
  // Additional routes will be added as components are created
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }