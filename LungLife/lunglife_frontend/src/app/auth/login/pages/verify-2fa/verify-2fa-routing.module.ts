import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Verify2faPage } from './verify-2fa.page';

const routes: Routes = [
  {
    path: '',
    component: Verify2faPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Verify2faPageRoutingModule {}
