import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OwnerService } from 'src/app/core/services/owner.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { LoaderService } from 'src/app/core/services/loader.service';
import { AlertController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-edit-membership-plan',
  templateUrl: './edit-membership-plan.page.html',
  styleUrls: ['./edit-membership-plan.page.scss'],
  standalone: false
})
export class EditMembershipPlanPage implements OnInit {
  editMembershipForm!: FormGroup;
  membershipId: number | null = null;
  memberId: number | null = null;
  originalMembership: any = null;
  loading = false;
  saving = false;
  errorMessage: string | null = null;

  // For display
  planPrice: number = 0;
  actualPaidAmount: number = 0;
  calculatedDue: number = 0;
  memberName: string = '';

  constructor(
    private fb: FormBuilder,
    private ownerService: OwnerService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private navController: NavController,
    private notificationService: NotificationService,
    private loader: LoaderService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.initForm();
    this.activatedRoute.paramMap.subscribe(params => {
      const memberId = params.get('member_id');
      const membershipId = params.get('membership_id');
      
      if (memberId && membershipId) {
        this.memberId = parseInt(memberId, 10);
        this.membershipId = parseInt(membershipId, 10);
        this.loadMembership();
      }
    });
  }

  initForm() {
    this.editMembershipForm = this.fb.group({
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      actual_price_paid: [0, [Validators.required, Validators.min(0)]],
      payment_status: ['due', Validators.required]
    });
  }

  loadMembership() {
    if (!this.membershipId || !this.memberId) return;
    
    this.loading = true;
    this.loader.show('Loading membership details...');
    
    this.ownerService.getMembershipById(this.membershipId).subscribe({
      next: (membership: any) => {
        this.originalMembership = membership;
        this.memberName = membership.Member?.first_name + ' ' + membership.Member?.last_name;
        this.planPrice = parseFloat(membership.MembershipPlan?.price || 0);
        this.actualPaidAmount = parseFloat(membership.actual_price_paid || 0);
        this.calculateDueAmount();

        this.editMembershipForm.patchValue({
          start_date: membership.start_date,
          end_date: membership.end_date,
          actual_price_paid: membership.actual_price_paid,
          payment_status: membership.payment_status
        });
        
        this.loading = false;
        this.loader.hide();
      },
      error: (err) => {
        this.errorMessage = this.notificationService.getFriendlyError(err);
        this.notificationService.showToast(this.errorMessage || 'Failed to load membership', 'error');
        this.loading = false;
        this.loader.hide();
        this.navController.back();
      }
    });
  }

  calculateDueAmount() {
    this.calculatedDue = Math.max(0, this.planPrice - this.actualPaidAmount);
  }

  onPaidAmountChange() {
    this.actualPaidAmount = parseFloat(this.editMembershipForm.get('actual_price_paid')?.value || 0);
    this.calculateDueAmount();
    
    // Auto-update payment status based on amount
    if (this.actualPaidAmount >= this.planPrice) {
      this.editMembershipForm.patchValue({ payment_status: 'paid' }, { emitEvent: false });
    } else if (this.actualPaidAmount > 0) {
      this.editMembershipForm.patchValue({ payment_status: 'partially_paid' }, { emitEvent: false });
    } else {
      this.editMembershipForm.patchValue({ payment_status: 'due' }, { emitEvent: false });
    }
  }

  async onSubmit() {
    if (this.editMembershipForm.invalid) {
      this.editMembershipForm.markAllAsTouched();
      this.notificationService.showToast('Please fill in all required fields correctly.', 'error');
      return;
    }

    const startDate = new Date(this.editMembershipForm.get('start_date')?.value);
    const endDate = new Date(this.editMembershipForm.get('end_date')?.value);

    if (startDate >= endDate) {
      this.notificationService.showToast('End date must be after start date.', 'error');
      return;
    }

    if (!this.membershipId) {
      this.notificationService.showToast('Membership ID is missing.', 'error');
      return;
    }

    this.saving = true;
    this.loader.show('Updating membership...');

    const formData = this.editMembershipForm.value;

    this.ownerService.updateMembership(this.membershipId, formData).subscribe({
      next: (response: any) => {
        this.notificationService.showToast('Membership updated successfully!', 'success');
        this.saving = false;
        this.loader.hide();
        this.navController.back();
      },
      error: (err) => {
        this.errorMessage = this.notificationService.getFriendlyError(err);
        this.notificationService.showToast(this.errorMessage || 'Failed to update membership', 'error');
        this.saving = false;
        this.loader.hide();
      }
    });
  }

  onCancel() {
    this.navController.back();
  }

  get hasChanges(): boolean {
    if (!this.originalMembership) return false;
    const formValue = this.editMembershipForm.value;
    return (
      formValue.start_date !== this.originalMembership.start_date ||
      formValue.end_date !== this.originalMembership.end_date ||
      parseFloat(formValue.actual_price_paid) !== parseFloat(String(this.originalMembership.actual_price_paid)) ||
      formValue.payment_status !== this.originalMembership.payment_status
    );
  }
}
