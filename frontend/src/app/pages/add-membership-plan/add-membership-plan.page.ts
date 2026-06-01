import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OwnerService } from '../../core/services/owner.service';
import { ToastController, NavController, ModalController, AlertController } from '@ionic/angular';
import { NotificationService } from 'src/app/core/services/notification.service';
import { LoaderService } from '../../core/services/loader.service';

@Component({
  selector: 'app-add-membership-plan',
  templateUrl: './add-membership-plan.page.html',
  styleUrls: ['./add-membership-plan.page.scss'],
  standalone: false,
})
export class AddMembershipPlanPage implements OnInit {
  membershipPlanForm: FormGroup;
  planTypes: string[] = ['gym', 'cardio', 'premium', 'personal_training', 'other'];
  existingPlans: any;
  isModalOpen = false;
  editingPlanId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private ownerService: OwnerService,
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private notificationService: NotificationService,
    private loader: LoaderService,
    private alertController: AlertController
  ) {
    this.membershipPlanForm = this.fb.group({
      plan_name: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      duration_months: [null, [Validators.required, Validators.min(1), Validators.pattern(/^[0-9]*$/)]], // Only positive integers
      price: [null, [Validators.required, Validators.min(0), Validators.pattern(/^\d+(\.\d{1,2})?$/)]], // Non-negative, 2 decimal places
      plan_type: [this.planTypes[0], Validators.required],
      is_active: [true]
    });
  }

  ngOnInit() {
    this.loadExistingPlans();
  }

  async loadExistingPlans() {
    this.loader.show('Loading plans...');
    try {
      const response = await this.ownerService.getMembershipPlans().toPromise();
      this.existingPlans = response?.plans || [];
    } catch (error) {
      this.notificationService.showToast('Could not load existing plans. Please check your connection.', 'error');
    } finally {
      this.loader.hide();
    }
  }

  openModal() {
    this.isModalOpen = true;
    this.editingPlanId = null; // Reset editing state
    this.membershipPlanForm.reset({
      is_active: true,
      plan_type: this.planTypes[0]
    });
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingPlanId = null;
    this.membershipPlanForm.reset({
      is_active: true,
      plan_type: this.planTypes[0]
    });
  }

  editPlan(plan: any) {
    this.editingPlanId = plan.plan_id;
    this.membershipPlanForm.patchValue({
      plan_name: plan.plan_name,
      description: plan.description,
      duration_months: plan.duration_months,
      price: plan.price,
      plan_type: plan.plan_type,
      is_active: plan.is_active
    });
    this.isModalOpen = true;
  }

  async deletePlan(plan: any) {
    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: `Are you sure you want to delete/deactivate "${plan.plan_name}"?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            this.loader.show('Deleting plan...');
            try {
              await this.ownerService.deactivateMembershipPlan(plan.plan_id).toPromise();
              this.notificationService.showToast('Membership plan deactivated successfully.', 'success');
              this.loadExistingPlans();
            } catch (error) {
              this.notificationService.showToast('Failed to delete plan.', 'error');
            } finally {
              this.loader.hide();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async onSubmit() {
    if (this.membershipPlanForm.invalid) {
      this.notificationService.showToast('Please fill all required fields correctly.', 'error');
      this.membershipPlanForm.markAllAsTouched();
      return;
    }

    const action = this.editingPlanId ? 'Updating' : 'Adding';
    this.loader.show(`${action} membership plan...`);

    try {
      if (this.editingPlanId) {
        await this.ownerService.updateMembershipPlan(this.editingPlanId, this.membershipPlanForm.value).toPromise();
        this.notificationService.showToast('Membership plan updated successfully!', 'success');
      } else {
        await this.ownerService.createMembershipPlan(this.membershipPlanForm.value).toPromise();
        this.notificationService.showToast('Membership plan created successfully!', 'success');
      }

      this.membershipPlanForm.reset();
      this.membershipPlanForm.controls['is_active'].setValue(true);
      this.membershipPlanForm.controls['plan_type'].setValue(this.planTypes[0]);
      await this.loadExistingPlans();
      this.closeModal();
    } catch (error: any) {
      const errorMessage = this.notificationService.getFriendlyError(error);
      this.notificationService.showToast(errorMessage, 'error');
    } finally {
      this.loader.hide();
    }
  }
}