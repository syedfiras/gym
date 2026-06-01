import { Component, OnInit, ViewChild } from '@angular/core';
import { OwnerService } from 'src/app/core/services/owner.service';
import { ToastController, AlertController, IonModal } from '@ionic/angular';

@Component({
  selector: 'app-whatsapp-templates',
  templateUrl: './whatsapp-templates.page.html',
  styleUrls: ['./whatsapp-templates.page.scss'],
  standalone: false
})
export class WhatsappTemplatesPage implements OnInit {
  @ViewChild(IonModal) modal!: IonModal;

  templates: any[] = [];
  isLoading = false;
  isModalOpen = false;
  isEditing = false;
  
  // Form data
  currentTemplate: { id?: number, name: string, message: string } = {
    name: '',
    message: ''
  };

  constructor(
    private ownerService: OwnerService,
    private toastController: ToastController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates(event?: any) {
    this.isLoading = true;
    this.ownerService.getWhatsAppTemplates().subscribe({
      next: (data) => {
        this.templates = data;
        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: (error) => {
        console.error('Error loading templates', error);
        this.presentToast('Failed to load templates', 'danger');
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }

  openAddModal() {
    this.isEditing = false;
    this.currentTemplate = { name: '', message: '' };
    this.isModalOpen = true;
  }

  openEditModal(template: any) {
    this.isEditing = true;
    this.currentTemplate = { 
      id: template.template_id,
      name: template.name,
      message: template.message 
    };
    this.isModalOpen = true;
  }

  cancelModal() {
    this.isModalOpen = false;
  }

  saveTemplate() {
    if (!this.currentTemplate.name || !this.currentTemplate.message) {
      this.presentToast('Name and message are required', 'warning');
      return;
    }

    if (this.isEditing && this.currentTemplate.id) {
      this.ownerService.updateWhatsAppTemplate(this.currentTemplate.id, this.currentTemplate).subscribe({
        next: (data) => {
          this.presentToast('Template updated successfully', 'success');
          this.isModalOpen = false;
          this.loadTemplates();
        },
        error: (err) => {
          this.presentToast('Failed to update template', 'danger');
        }
      });
    } else {
      this.ownerService.createWhatsAppTemplate(this.currentTemplate).subscribe({
        next: (data) => {
          this.presentToast('Template created successfully', 'success');
          this.isModalOpen = false;
          this.loadTemplates();
        },
        error: (err) => {
          this.presentToast('Failed to create template', 'danger');
        }
      });
    }
  }

  async confirmDelete(id: number, event: Event) {
    event.stopPropagation(); // Prevent opening edit modal
    
    // Find template to check if distinct
    const template = this.templates.find(t => t.template_id === id);
    if(template && template.is_default) {
       this.presentToast('Cannot delete default template', 'warning');
       return;
    }

    const alert = await this.alertController.create({
      header: 'Delete Template',
      message: 'Are you sure you want to delete this template?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.deleteTemplate(id);
          }
        }
      ]
    });

    await alert.present();
  }

  deleteTemplate(id: number) {
    this.ownerService.deleteWhatsAppTemplate(id).subscribe({
      next: () => {
        this.presentToast('Template deleted', 'success');
        this.loadTemplates();
      },
      error: () => {
        this.presentToast('Failed to delete template', 'danger');
      }
    });
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    toast.present();
  }
}
