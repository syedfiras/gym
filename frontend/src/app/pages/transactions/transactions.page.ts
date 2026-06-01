// transactions.page.ts
import { Component, OnInit } from '@angular/core';
import { OwnerService } from 'src/app/core/services/owner.service';
import { DatePipe } from '@angular/common';
import { OwnerDashboardData } from 'src/app/core/models/gym.model';
import { LoadingController } from '@ionic/angular';
import { NotificationService } from 'src/app/core/services/notification.service';
import { Router } from '@angular/router';
import { SharedService } from 'src/app/core/services/shared.service';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
  standalone: false,
  providers: [DatePipe]
})
export class TransactionsPage implements OnInit {
  transactions: any[] = [];
  filteredTransactions: any[] = [];
  isLoading = true;
  error: string | null = null;
  filters = {
    type: 'all',
    period: 'month',
    search: ''
  };

  // Summary stats
  filteredTotal = 0;
  totalDueAmount = 0;

  // Members with dues
  membersWithDues: any[] = [];
  showDuesSection = true;

  // Month filter options (from backend)
  monthOptions: { label: string; value: string }[] = [];

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
  payDueMemberName = '';

  dashboardData: OwnerDashboardData = {
    active_memberships: 0,
    total_revenue: 0,
    todays_revenue: 0,
    monthly_revenue: [],
    gym_info: {
      gym_name: '',
      unique_join_code: '',
      contact_email: '',
      contact_phone: ''
    },
    counts: {
      total_members: 0,
      active_members: 0,
      pending_members: 0,
      expired_memberships: 0,
      revenue_this_month: '0.00',
      total_staffs: 0
    }
  };

  constructor(
    private ownerService: OwnerService,
    private datePipe: DatePipe,
    private loadingController: LoadingController,
    private notificationService: NotificationService,
    private router: Router,
    private sharedService: SharedService
  ) {}

  ngOnInit() {
    this.loadData();
    
    // Subscribe to refresh events from other components
    this.sharedService.refresh$.subscribe(async (type) => {
      if (type === 'transactions' || type === 'dashboard') {
        console.log('Refresh event received for:', type);
        await this.loadData();
      }
    });
  }

  async loadData() {
    this.isLoading = true;
    try {
      await Promise.all([
        this.loadDashboardData(),
        this.loadTransactionMonths(),
        this.fetchTransactions(),
        this.fetchMembersWithDues()
      ]);
    } catch (err) {
      console.error('Data loading error', err);
    } finally {
      this.isLoading = false;
    }
  }

  loadTransactionMonths() {
    return new Promise<void>((resolve) => {
      this.ownerService.getTransactionMonths().subscribe({
        next: (months) => {
          this.monthOptions = months.map(m => {
            const [year, month] = m.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return {
              label: date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
              value: m
            };
          });
          // Set default to current month if it exists in options
          const currentMonthVal = new Date().toISOString().substring(0, 7);
          if (this.monthOptions.find(mo => mo.value === currentMonthVal)) {
            this.filters.period = currentMonthVal;
          } else if (this.monthOptions.length > 0) {
            this.filters.period = this.monthOptions[0].value;
          } else {
            this.filters.period = 'all';
          }
          resolve();
        },
        error: () => {
          this.monthOptions = [];
          this.filters.period = 'all';
          resolve();
        }
      });
    });
  }

  async loadDashboardData() {
    return new Promise<void>((resolve) => {
      this.ownerService.getOwnerDashboard().subscribe({
        next: (data) => {
          this.dashboardData = data;
          resolve();
        },
        error: (err) => {
          console.error('Dashboard load error', err);
          resolve();
        }
      });
    });
  }

  fetchTransactions() {
    return new Promise<void>((resolve) => {
      this.ownerService.getTransactions({ page: 1, limit: 500 }).subscribe({
        next: (data) => {
          this.transactions = data?.transactions || [];
          this.applyFilters();
          resolve();
        },
        error: (err) => {
          this.error = 'Failed to load transactions.';
          this.transactions = [];
          this.filteredTransactions = [];
          resolve();
        }
      });
    });
  }

  fetchMembersWithDues() {
    return new Promise<void>((resolve) => {
      this.ownerService.getMembers('', 'due', 1, 100).subscribe({
        next: (response: any) => {
          this.membersWithDues = response?.members || [];
          // Filter out members with no dues to avoid showing users with 0 due
          this.membersWithDues = this.membersWithDues.filter(m => this.getMemberDue(m) > 0);
          this.calculateTotalDue();
          resolve();
        },
        error: (err) => {
          console.error('Error fetching members with dues:', err);
          this.membersWithDues = [];
          this.totalDueAmount = 0;
          resolve();
        }
      });
    });
  }

  calculateTotalDue() {
    // Calculate total due from members' current memberships
    this.totalDueAmount = this.membersWithDues.reduce((sum, m) => {
      const membership = m.current_membership;
      if (!membership) return sum;
      
      // Get plan price - try multiple possible field names
      const planPrice = membership.plan_price ?? membership.MembershipPlan?.price ?? 0;
      
      // Get paid amount - default to 0 if not set
      const paid = membership.actual_price_paid ?? 0;
      
      const due = Math.max(0, planPrice - paid);
      return sum + due;
    }, 0);
  }

  applyFilters() {
    let result = [...this.transactions];
    // Type filter
    if (this.filters.type !== 'all') {
      result = result.filter(t => t.transaction_type === this.filters.type);
    }
    // Period filter - supports "today", "all", or "YYYY-MM"
    const now = new Date();
    if (this.filters.period === 'today') {
      const today = now.toISOString().split('T')[0];
      result = result.filter(t => t.transaction_date?.includes(today));
    } else if (this.filters.period === 'all') {
      // No filtering
    } else {
      // Specific month filter like "2024-12"
      result = result.filter(t => {
        const txDate = t.transaction_date?.substring(0, 7); // Get "YYYY-MM"
        return txDate === this.filters.period;
      });
    }
    // Search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase();
      result = result.filter(t =>
        (t.description && t.description.toLowerCase().includes(searchTerm)) ||
        (t.Member?.first_name && t.Member.first_name.toLowerCase().includes(searchTerm)) ||
        (t.Member?.last_name && t.Member.last_name.toLowerCase().includes(searchTerm))
      );
    }
    this.filteredTransactions = result;
    this.filteredTotal = result.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }

  getMemberDue(member: any): number {
    const membership = member.current_membership;
    if (!membership) return 0;
    
    // Get plan price - try multiple possible field names
    const planPrice = membership.plan_price ?? membership.MembershipPlan?.price ?? 0;
    
    // Get paid amount - default to 0 if not set
    const paid = membership.actual_price_paid ?? 0;
    
    return Math.max(0, planPrice - paid);
  }

  // Pay Due Modal Methods
  openPayDueModal(member: any) {
    const membership = member.current_membership;
    if (!membership) {
      this.notificationService.showToast('No active membership found.', 'error');
      return;
    }
    
    // Get plan price - try multiple possible field names
    const planPrice = membership.plan_price ?? membership.MembershipPlan?.price ?? 0;
    
    // Get paid amount - default to 0 if not set
    const paid = membership.actual_price_paid ?? 0;
    
    const due = Math.max(0, planPrice - paid);

    if (due <= 0) {
      this.notificationService.showToast('No due amount for this member.', 'error');
      return;
    }

    this.payDueItem = membership;
    this.payDueType = 'membership';
    this.payDueDueAmount = due;
    this.payDueMemberName = `${member.first_name} ${member.last_name || ''}`;
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
      this.notificationService.showToast(`Amount cannot exceed ₹${this.payDueDueAmount.toFixed(2)}.`, 'error');
      return;
    }

    this.isLoading = true;
    try {
      const result = await this.ownerService.updateMembershipPayment(this.payDueItem.membership_id, {
        amount,
        payment_method: this.payDueForm.payment_method,
        note: this.payDueForm.note
      }).toPromise();
      
      this.notificationService.showToast('Payment recorded successfully!', 'success');
      this.closePayDueModal();
      
      // Refresh all data to reflect the payment
      this.sharedService.triggerRefresh('transactions');
      this.sharedService.triggerRefresh('dashboard');
      
      // Force reload of all data with slight delay to ensure backend update is processed
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.loadData();
    } catch (err: any) {
      const errorMsg = err?.error?.error || 'Failed to record payment.';
      console.error('Payment error:', err);
      this.notificationService.showToast(errorMsg, 'error');
    } finally {
      this.isLoading = false;
    }
  }

  goToMember(memberId: number) {
    this.router.navigate(['/owner-tabs/members', memberId, 'details']);
  }

  toggleDuesSection() {
    this.showDuesSection = !this.showDuesSection;
  }

  doRefresh(event: any) {
    this.loadData().then(() => {
      event.target.complete();
    });
  }
}
