import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EditMembershipPlanPageRoutingModule } from './edit-membership-plan-routing.module';
import { EditMembershipPlanPage } from './edit-membership-plan.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    SharedModule,
    EditMembershipPlanPageRoutingModule
  ],
  declarations: [EditMembershipPlanPage]
})
export class EditMembershipPlanPageModule { }
