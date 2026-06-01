import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OwnerService } from 'src/app/core/services/owner.service';
import { Member } from 'src/app/core/models/member.model';
import { ToastController, AlertController, ActionSheetController, NavController } from '@ionic/angular';
import { SharedService } from 'src/app/core/services/shared.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { PersonalTraining } from 'src/app/core/models/personal-training.model';
import { Staff } from 'src/app/core/models/staff.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { NotificationService } from 'src/app/core/services/notification.service';
import { LoaderService } from '../../core/services/loader.service';
@Component({
  selector: 'app-member-details',
  templateUrl: './member-details.page.html',
  styleUrls: ['./member-details.page.scss'],
  standalone: false,
})
export class MemberDetailsPage implements OnInit {
  memberId!: number;
  member: any = null;
  memberships: any[] = [];
  transactions: any[] = [];
  loading = false;
  error: string | null = null;
  personalTrainingForm: FormGroup;
  showAddMembershipForm = false;
  showAddPersonalMembershipForm = false;
  addMembershipData = {
    plan_id: null,
    start_date: '',
    end_date: '',
    admission_fee: 0,
    paid_amount: 0,
    payment_method: 'cash',
    transaction_type: 'membership_payment',
    payment_status: 'due',
  };
  expiryWarning: string | null = null;
  remainingDays: number | null = null;
  addPersonalMembershipData = {
    start_date: '',
    end_date: '',
    duration: '',
    price: 0,
    payment_method: 'cash',
  };
  membershipPlans: any[] = [];
  isMembershipActive = false;
  personalTrainings: PersonalTraining[] = [];
  staffList: Staff[] = [];

  private apiBaseUrl = environment.apiBaseUrl;
  defaultAvatar = '../../../assets/avatar.png';

  // Pay Due Modal State
  showPayDueModal = false;
  payDueItem: any = null;
  payDueType: 'membership' | 'pt' = 'membership';
  payDueForm = {
    amount: 0,
    note: '',
    payment_method: 'cash'
  };
  payDueDueAmount = 0;

  constructor(
    private route: ActivatedRoute,
    private OwnerService: OwnerService,
    private toastController: ToastController,
    private sharedService: SharedService,
    private http: HttpClient, // Injected HttpClient for photo upload
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private loader: LoaderService,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private navController: NavController
  ) {
    this.personalTrainingForm = this.fb.group({
      start_date: [new Date().toISOString().split('T')[0], Validators.required],
      end_date: ['', Validators.required],
      duration_months: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(1)]],
      staff_id: [null],
      payment_method: ['cash', Validators.required],
      paid_amount: [0], // Optional initial payment
      notes: ['']
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.memberId = +id;
        this.fetchMemberDetails();
        this.loadMembershipPlans();
        this.loadStaffList();
      }
    });
  }

  loadStaffList() {
    this.OwnerService.getStaffList(1, 1000).subscribe({
      next: (response: any) => this.staffList = response.staff,
      error: () => this.staffList = []
    });
  }

  fetchMemberDetails(forceRefresh = false) {
    // Only show loader if we don't have member data or if we are loading a different member
    const isDifferentMember = !this.member || (this.memberId && this.member.member_id !== this.memberId);

    // Always show loading initially if we don't have data or explicit refresh
    if (this.member === null || isDifferentMember || forceRefresh) {
      this.loading = true; // Use component level loading flag for the spinner in HTML
      // this.loader.show('Loading member details...'); // Optional: use global loader if preferred
    }

    this.OwnerService.getMemberDetails(this.memberId, forceRefresh).subscribe({
      next: (data) => {
        this.member = data.member;
        this.memberships = data.memberships;
        this.transactions = data.transactions;
        this.personalTrainings = data.personal_trainings || [];
        this.member.current_membership = this.memberships.find(m => m.status === 'active')
          || this.memberships[0]
          || null;
        this.isMembershipActive = this.checkActiveMembership();
        this.checkExpiry();
        this.calculateRemainingDays();
        this.loading = false;
        this.loader.hide();
      },
      error: (err) => {
        this.error = 'Failed to load member details.';
        this.loading = false;
        this.loader.hide();
      }
    });
  }

  async onAddPersonalTraining() {
    if (this.personalTrainingForm.invalid) return;
    const data = this.personalTrainingForm.value;
    try {
      await this.OwnerService.addPersonalTrainingToMember(this.member.member_id, data).toPromise();
      this.OwnerService.clearMemberDetailsCache(this.memberId);
      this.OwnerService.clearMemberDetailsCache(this.memberId);
      this.personalTrainingForm.reset({
        payment_method: 'cash',
        duration_months: 1,
        price: 0,
        start_date: new Date().toISOString().split('T')[0],
        paid_amount: 0
      });
      this.fetchMemberDetails(true);
      this.notificationService.showToast('Personal training added successfully!', 'success');
    } catch (err: any) {
      this.notificationService.showToast(this.notificationService.getFriendlyError(err), 'error');
    }
  }

  loadMembershipPlans() {
    this.OwnerService.getMembershipPlans(1, 1000).subscribe({
      next: (response: any) => this.membershipPlans = response.plans,
      error: () => this.membershipPlans = []
    });
  }

  checkActiveMembership(): boolean {
    const now = new Date();
    return this.memberships.some(m => {
      if (!m.end_date) return false;
      const end = new Date(m.end_date);
      return end >= now && (m.status === 'active' || m.status === 'paid');
    });
  }

  get isPersonalTrainingActive(): boolean {
    return this.personalTrainings.some(pt => pt.status === 'active');
  }

  getPhotoUrl(photo: string | null): string {
    if (!photo) return this.defaultAvatar;
    // If photo is already a full URL, use it directly
    if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
    // Otherwise, prepend apiBaseUrl
    return this.apiBaseUrl + photo;
  }

  async showMembershipActiveToast() {
    this.notificationService.showToast('This member already has an active membership.', 'info');
  }

  toggleAddMembershipForm() {
    if (this.isMembershipActive) {
      this.showMembershipActiveToast();
      return;
    }
    this.showAddMembershipForm = !this.showAddMembershipForm;
    if (!this.showAddMembershipForm) {
      this.resetAddMembershipForm();
    }
  }
  async showPersonalMembershipActiveToast() {
    this.notificationService.showToast('This member already has an active Personal membership.', 'info');
  }
  toggleAddPersonalMembershipForm() {
    if (this.isPersonalTrainingActive) {
      this.showPersonalMembershipActiveToast();
      return;
    }
    this.showAddPersonalMembershipForm = !this.showAddPersonalMembershipForm;
    if (!this.showAddPersonalMembershipForm) {
      this.resetAddPersonalMembershipForm();
    }
  }

  onPlanChange() {
    // Ensure membershipPlans is an array before trying to find a plan
    if (!Array.isArray(this.membershipPlans)) {
      console.warn('membershipPlans is not an array.');
      return;
    }
    const plan = this.membershipPlans.find((p: any) => p.plan_id === this.addMembershipData.plan_id);
    if (plan) {
      const startDate = this.addMembershipData.start_date ? new Date(this.addMembershipData.start_date) : new Date();
      // Update start date in model if it was empty, to ensure consistency
      this.addMembershipData.start_date = startDate.toISOString().slice(0, 10);

      const endDate = new Date(startDate);
      endDate.setMonth(startDate.getMonth() + plan.duration_months);
      this.addMembershipData.end_date = endDate.toISOString().slice(0, 10);

      this.addMembershipData.paid_amount = plan.price;
      this.addMembershipData.payment_status = 'paid';
    } else {
      this.addMembershipData.paid_amount = 0;
      this.addMembershipData.payment_status = 'due';
      // Keep existing dates if manually set, or default start to today
      if (!this.addMembershipData.start_date) {
        this.addMembershipData.start_date = new Date().toISOString().slice(0, 10);
      }
    }
  }

  onStartDateChange() {
    if (this.addMembershipData.start_date && this.addMembershipData.plan_id) {
      const plan = this.membershipPlans.find(p => p.plan_id === this.addMembershipData.plan_id);
      if (plan) {
        const start = new Date(this.addMembershipData.start_date);
        const end = new Date(start);
        end.setMonth(start.getMonth() + plan.duration_months);
        this.addMembershipData.end_date = end.toISOString().slice(0, 10);
      }
    }
  }

  onPTDurationChange() {
    const duration = this.personalTrainingForm.get('duration_months')?.value;
    const startVal = this.personalTrainingForm.get('start_date')?.value;
    if (duration && startVal) {
      const start = new Date(startVal);
      const end = new Date(start);
      end.setMonth(start.getMonth() + parseInt(duration));
      this.personalTrainingForm.patchValue({ end_date: end.toISOString().slice(0, 10) });
    }
  }

  onPTStartDateChange() {
    this.onPTDurationChange();
  }

  calculateRemainingDays() {
    if (!this.member?.current_membership) {
      this.remainingDays = null;
      return;
    }
    const end = new Date(this.member.current_membership.end_date);
    const now = new Date();
    // Reset time part to ensure we count full days
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diff = end.getTime() - now.getTime();
    this.remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  checkExpiry() {
    this.expiryWarning = null;
    if (!this.member?.current_membership) return;

    const m = this.member.current_membership;
    const endDate = new Date(m.end_date);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Show warning for expired membership regardless of status field
    if (diffDays < 0) {
      this.expiryWarning = `Membership expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago.`;
    } else if (diffDays <= 7 && diffDays >= 0) {
      this.expiryWarning = `Membership expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}.`;
    }
  }

  // Get warning type: 'expired' or 'expiring'
  getExpiryWarningType(): 'expired' | 'expiring' {
    if (!this.member?.current_membership || !this.expiryWarning) return 'expiring';
    
    const m = this.member.current_membership;
    const endDate = new Date(m.end_date);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays < 0 ? 'expired' : 'expiring';
  }

  // Calculate due amount for a membership smartly (without DB changes)
  // Due = Current Plan Price - Actual Price Paid
  calculateMembershipDue(membership: any): number {
    if (!membership || !membership.MembershipPlan) return 0;
    
    const planPrice = parseFloat(membership.MembershipPlan.price || 0);
    const actualPaid = parseFloat(membership.actual_price_paid || 0);
    const due = planPrice - actualPaid;
    
    return due > 0 ? due : 0;
  }

  // Check if member has any due
  hasMembershipDue(): boolean {
    if (!this.memberships || this.memberships.length === 0) return false;
    return this.memberships.some(m => this.calculateMembershipDue(m) > 0);
  }

  // Get total due amount
  getTotalMembershipDue(): number {
    if (!this.memberships || this.memberships.length === 0) return 0;
    return this.memberships.reduce((total, m) => total + this.calculateMembershipDue(m), 0);
  }

  // Open the Pay Due Modal
  payDue(item: any, type: 'membership' | 'pt') {
    let due: number;
    
    if (type === 'membership') {
      due = this.calculateMembershipDue(item);
    } else {
      const total = item.price || 0;
      const currentPaid = parseFloat(item.actual_price_paid || 0);
      due = total - currentPaid;
    }

    this.payDueItem = item;
    this.payDueType = type;
    this.payDueDueAmount = due;
    this.payDueForm = {
      amount: due,
      note: '',
      payment_method: 'cash'
    };
    this.showPayDueModal = true;
  }

  closePayDueModal() {
    this.showPayDueModal = false;
    this.payDueItem = null;
  }

  async submitPayDue() {
    const amount = parseFloat(String(this.payDueForm.amount));
    if (isNaN(amount) || amount <= 0) {
      this.notificationService.showToast('Please enter a valid amount.', 'error');
      return;
    }
    if (amount > this.payDueDueAmount) {
      this.notificationService.showToast(`Amount cannot exceed the due balance of ₹${this.payDueDueAmount.toFixed(2)}.`, 'error');
      return;
    }

    this.loading = true;
    try {
      if (this.payDueType === 'membership') {
        await this.OwnerService.updateMembershipPayment(this.payDueItem.membership_id, {
          amount,
          payment_method: this.payDueForm.payment_method,
          note: this.payDueForm.note
        }).toPromise();
      } else {
        await this.OwnerService.updatePersonalTrainingPayment(this.payDueItem.pt_id || this.payDueItem.id, {
          amount,
          payment_method: this.payDueForm.payment_method,
          note: this.payDueForm.note
        }).toPromise();
      }
      this.notificationService.showToast('Payment recorded successfully!', 'success');
      this.closePayDueModal();
      this.fetchMemberDetails(true);
      this.sharedService.triggerRefresh('transactions');
      this.sharedService.triggerRefresh('dashboard');
    } catch (err: any) {
      const errorMsg = err?.error?.error || 'Failed to record payment.';
      this.notificationService.showToast(errorMsg, 'error');
    } finally {
      this.loading = false;
    }
  }

  onPaidAmountChange() {
    // Ensure membershipPlans is an array before trying to find a plan
    if (!Array.isArray(this.membershipPlans)) {
      console.warn('membershipPlans is not an array.');
      return;
    }
    const plan = this.membershipPlans.find((p: any) => p.plan_id === this.addMembershipData.plan_id);
    if (plan) {
      const paid = Number(this.addMembershipData.paid_amount);
      if (paid >= plan.price) {
        this.addMembershipData.payment_status = 'paid';
        this.addMembershipData.paid_amount = plan.price;
      } else if (paid > 0) {
        this.addMembershipData.payment_status = 'partially_paid';
      } else {
        this.addMembershipData.payment_status = 'due';
      }
    }
  }

  onPaymentStatusChange() {
    if (!this.addMembershipData.plan_id) return;
    const plan = this.membershipPlans.find((p: any) => p.plan_id === this.addMembershipData.plan_id);
    if (!plan) return;

    switch (this.addMembershipData.payment_status) {
      case 'paid':
        this.addMembershipData.paid_amount = plan.price;
        break;
      case 'due':
        this.addMembershipData.paid_amount = 0;
        break;
      case 'partially_paid':
        // If switching to partial, and amount is full price or 0, maybe set to half? Or just leave it?
        // Better to check if it's 0 or full, then reset.
        if (this.addMembershipData.paid_amount === 0 || this.addMembershipData.paid_amount === plan.price) {
           // Providing a hint or just leaving it editable (user must input)
           this.addMembershipData.paid_amount = 0; // Let them type
        }
        break;
    }
  }

  async addMembership() {
    if (!this.addMembershipData.plan_id || !this.addMembershipData.start_date || !this.addMembershipData.end_date) {
      this.error = 'Please fill all required fields for membership.';
      return;
    }
    this.loading = true;
    try {
      const payments: any[] = [];
      // Only add membership payment if amount > 0
      if (parseFloat(String(this.addMembershipData.paid_amount)) > 0) {
        payments.push({
          amount: this.addMembershipData.paid_amount,
          method: this.addMembershipData.payment_method,
          type: this.addMembershipData.transaction_type,
          description: 'Membership payment',
          transaction_date: new Date().toISOString()
        });
      }
      // Only add admission fee if > 0
      if (parseFloat(String(this.addMembershipData.admission_fee)) > 0) {
        payments.push({
          amount: this.addMembershipData.admission_fee,
          method: this.addMembershipData.payment_method,
          type: 'admission_fee',
          description: 'Admission fee',
          transaction_date: new Date().toISOString()
        });
      }

      const payload = {
        plan_id: this.addMembershipData.plan_id,
        gym_id: this.member?.gym_id,
        start_date: this.addMembershipData.start_date,
        end_date: this.addMembershipData.end_date,
        payment_status: this.addMembershipData.payment_status,
        payments,
        admission_fee: this.addMembershipData.admission_fee
      };
      await this.OwnerService.addMembershipToMember(this.memberId, payload).toPromise();
      this.OwnerService.clearMemberDetailsCache(this.memberId);
      this.showAddMembershipForm = false;
      this.resetAddMembershipForm();
      this.fetchMemberDetails(true);
      this.sharedService.triggerRefresh('members');
      this.sharedService.triggerRefresh('transactions');
      this.sharedService.triggerRefresh('dashboard');
      await this.notificationService.showToast('Membership added successfully.', 'success');
    } catch (error) {
      this.error = 'Failed to add membership.';
      await this.notificationService.showToast('Failed to add membership.', 'error');
    }
    this.loading = false;
  }

  async takePhoto(member: any) {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (image && image.dataUrl) {
        const blob = await (await fetch(image.dataUrl)).blob();
        const formData = new FormData();
        formData.append('photo', blob, 'photo.jpg');
        this.loading = true;
        try {
          const response = await this.http.put<any>(
            `${this.apiBaseUrl}/owner/members/${member.member_id}/photo`,
            formData
          ).toPromise();
          member.photo = response.photo;
          this.OwnerService.clearMemberDetailsCache(this.memberId);
          this.notificationService.showToast('Photo updated successfully!', 'success');
        } catch (err) {
          this.notificationService.showToast('Photo upload failed. Please try again.', 'error');
        } finally {
          this.loading = false;
        }
      }
    } catch (err) {
      this.notificationService.showToast('Camera cancelled or failed.', 'info');
    }
  }

  async uploadPhoto(member: Member, event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    this.loading = true;
    try {
      const response = await this.http.put<any>(
        `${this.apiBaseUrl}/owner/members/${member.member_id}/photo`,
        formData
      ).toPromise();
      member.photo = response.photo;
      this.OwnerService.clearMemberDetailsCache(this.memberId);
      this.notificationService.showToast('Photo updated successfully!', 'success');
    } catch (err) {
      this.notificationService.showToast('Photo upload failed. Please try again.', 'error');
    } finally {
      this.loading = false;
    }
  }

  resetAddMembershipForm() {
    this.addMembershipData = {
      plan_id: null,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      admission_fee: 0,
      paid_amount: 0,
      payment_method: 'cash',
      transaction_type: 'membership_payment',
      payment_status: 'due',
    };
  }
  resetAddPersonalMembershipForm() {
    this.addPersonalMembershipData = {
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      duration: '',
      price: 0,
      payment_method: 'cash',
    };
  }

  get selectedPlan() {
    return this.membershipPlans?.find((p: any) => p.plan_id === this.addMembershipData.plan_id) || null;
  }

  get selectedPlanPrice() {
    return this.selectedPlan ? this.selectedPlan.price : null;
  }

  async openWhatsApp() {
    if (!this.member?.phone) {
      this.notificationService.showToast('Phone number not available', 'error');
      return;
    }

    let phone = this.member.phone.replace(/\D/g, ''); // Remove non-digits
    if (phone.length === 10) {
      phone = '91' + phone; // Prepend country code for India
    }

    try {
      this.loading = true;
      const templates = await this.OwnerService.getWhatsAppTemplates().toPromise();
      this.loading = false;

      if (!templates || templates.length === 0) {
        this.openWhatsAppWithBody(phone, this.member, "Hi {name},");
        return;
      }

      const buttons: any[] = templates.map((t: any) => ({
        text: t.name,
        handler: () => {
          this.openWhatsAppWithBody(phone, this.member, t.message);
        }
      }));

      buttons.push({
        text: 'Cancel',
        role: 'cancel',
        handler: () => {}
      } as any);

      const actionSheet = await this.actionSheetController.create({
        header: 'Select Message Template',
        buttons: buttons
      });

      await actionSheet.present();

    } catch (error) {
      this.loading = false;
      this.notificationService.showToast('Failed to load templates', 'error');
      this.openWhatsAppWithBody(phone, this.member, "Hi {name},");
    }
  }

  openWhatsAppWithBody(phone: string, member: any, messageTemplate: string) {
    const name = `${member.first_name} ${member.last_name}`;
    const message = messageTemplate.replace(/{name}/g, name);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(url, '_system');
  }

  // Navigate to edit membership record
  editMembershipPlan(membershipId: number) {
    if (membershipId && this.memberId) {
      this.navController.navigateForward(`/owner-tabs/edit-membership/${this.memberId}/${membershipId}`);
    } else {
      this.notificationService.showToast('Membership ID not found', 'error');
    }
  }
}
