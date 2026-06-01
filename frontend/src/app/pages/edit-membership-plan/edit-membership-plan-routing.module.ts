import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EditMembershipPlanPage } from './edit-membership-plan.page';

const routes: Routes = [
  {
    path: '',
    component: EditMembershipPlanPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EditMembershipPlanPageRoutingModule { }
