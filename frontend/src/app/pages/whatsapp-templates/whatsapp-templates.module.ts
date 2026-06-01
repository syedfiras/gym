import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Added ReactiveFormsModule
import { IonicModule } from '@ionic/angular';

import { WhatsappTemplatesPageRoutingModule } from './whatsapp-templates-routing.module';
import { WhatsappTemplatesPage } from './whatsapp-templates.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    WhatsappTemplatesPageRoutingModule,
    SharedModule
  ],
  declarations: [WhatsappTemplatesPage]
})
export class WhatsappTemplatesPageModule {}
