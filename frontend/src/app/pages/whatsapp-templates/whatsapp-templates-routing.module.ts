import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { WhatsappTemplatesPage } from './whatsapp-templates.page';

const routes: Routes = [
  {
    path: '',
    component: WhatsappTemplatesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WhatsappTemplatesPageRoutingModule {}
