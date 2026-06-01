import { Component, OnInit } from '@angular/core';
import { OwnerService } from 'src/app/core/services/owner.service';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { NotificationService } from 'src/app/core/services/notification.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';


@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage implements OnInit {
  gymInfo: any = null;
  user: any = { name: 'Owner', email: 'owner@gymapp.com', avatar: '' };
  loading = false;
  // unused forms removed
  editForm!: FormGroup;
  isEditModalOpen = false;
  editingField: string | null = null;
  darkMode = false;
  currentPasswordValid: boolean | null = null;
  passwordsMatch: boolean = true;

  // New for password change
  isChangePasswordModalOpen = false;
  changePasswordForm!: FormGroup;

  // New for backup
  isBackupConfirmationOpen = false;
  isBackingUp = false;



  constructor(
    private ownerService: OwnerService,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.loadGymInfo();
    this.loadUserProfile();
    const stored = localStorage.getItem('darkMode');
    this.darkMode = stored === 'true';
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
    this.changePasswordForm.get('confirmPassword')?.valueChanges.subscribe(val => {
      this.passwordsMatch = val === this.changePasswordForm.get('newPassword')?.value;
    });
    this.changePasswordForm.get('newPassword')?.valueChanges.subscribe(val => {
      this.passwordsMatch = val === this.changePasswordForm.get('confirmPassword')?.value;
    });

    // WhatsApp integration removed
  }

  async loadGymInfo() {
    // Silent update if we already have data
    if (!this.gymInfo) {
      this.loading = true;
    }
    try {
      this.gymInfo = await this.ownerService.getGymInfo().toPromise();
    } catch (e) {
      this.notificationService.showToast('Could not load gym info', 'error');
    } finally {
      this.loading = false;
    }
  }

  async validateCurrentPassword() {
    const currentPassword = this.changePasswordForm.get('currentPassword')?.value;
    if (!currentPassword) {
      this.currentPasswordValid = null;
      return;
    }
    try {
      // Try to change password with a dummy new password to check validity
      await this.authService.changePassword(currentPassword, '___dummy___').toPromise();
      // If it succeeds, that's a problem (should not allow dummy password)
      this.currentPasswordValid = false;
    } catch (e: any) {
      // If error is "Current password is incorrect", set invalid
      if (e?.error?.error === 'Current password is incorrect.') {
        this.currentPasswordValid = false;
      } else if (e?.error?.error === 'New password must be at least 6 characters.') {
        // This means current password is correct, but new password is too short (dummy)
        this.currentPasswordValid = true;
      } else {
        this.currentPasswordValid = null;
      }
    }
  }

  async changePassword() {
    if (this.changePasswordForm.invalid || !this.passwordsMatch) return;
    const { currentPassword, newPassword } = this.changePasswordForm.value;
    this.loading = true;
    try {
      await this.authService.changePassword(currentPassword, newPassword).toPromise();
      this.notificationService.showToast('Password changed successfully!', 'success');
      this.isChangePasswordModalOpen = false;
      this.changePasswordForm.reset();
      this.currentPasswordValid = null;
      this.passwordsMatch = true;
    } catch (e: any) {
      this.notificationService.showToast(e?.error?.error || 'Password change failed', 'error');
    } finally {
      this.loading = false;
    }
  }

  async loadUserProfile() {
    try {
      const user = await this.authService.getProfile().toPromise();
      this.user = {
        name: user.first_name + ' ' + (user.last_name || ''),
        email: user.email,
        avatar: user.photo,
        role: user.role
      };
    } catch (e) {
      this.user = { name: 'Owner', email: 'owner@gymapp.com', avatar: '', role: 'owner' };
    }
  }

  openEditModal(field: string) {
    this.editingField = field;
    this.editForm = this.fb.group({
      value: [this.gymInfo[field], [Validators.required]]
    });
    this.isEditModalOpen = true;
  }

  async saveEdit() {
    if (!this.editingField) return;
    try {
      await this.ownerService.updateGymInfo({ [this.editingField]: this.editForm.value.value }).toPromise();
      this.notificationService.showToast('Updated successfully', 'success');
      this.isEditModalOpen = false;
      this.loadGymInfo();
    } catch (e) {
      this.notificationService.showToast('Update failed', 'error');
    }
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editingField = null;
  }

  copyJoinCode() {
    navigator.clipboard.writeText(this.gymInfo.unique_join_code);
    this.notificationService.showToast('Join code copied!', 'success');
  }

  toggleDarkMode(event: any) {
    this.darkMode = event.detail.checked;
    document.body.classList.toggle('dark', this.darkMode);
    localStorage.setItem('darkMode', this.darkMode ? 'true' : 'false');
  }

  // New: Edit avatar
  editAvatar() {
    this.notificationService.showToast('Avatar editing coming soon!', 'info');
  }

  // New: Password change modal
  openChangePasswordModal() {
    this.isChangePasswordModalOpen = true;
  }
  closeChangePasswordModal() {
    this.isChangePasswordModalOpen = false;
  }

  logout() {
    this.notificationService.showToast('Logged out!', 'success');
    this.authService.logout()
  }

  // Backup Data Methods
  openBackupConfirmation() {
    this.isBackupConfirmationOpen = true;
  }

  closeBackupConfirmation() {
    this.isBackupConfirmationOpen = false;
  }

  async performBackup() {
    this.isBackingUp = true;
    try {
      // Call backend endpoint to get backup data
      const backupData = await this.ownerService.getBackupData().toPromise();
      
      // Generate CSV content
      const csvContent = this.generateCSV(backupData);
      
      // Download CSV file
      this.downloadCSV(csvContent, `gym-backup-${new Date().toISOString().split('T')[0]}.csv`);
      
      this.notificationService.showToast('Backup downloaded successfully!', 'success');
      this.closeBackupConfirmation();
    } catch (error) {
      this.notificationService.showToast('Failed to generate backup', 'error');
      console.error('Backup error:', error);
    } finally {
      this.isBackingUp = false;
    }
  }

  private generateCSV(data: any): string {
    let csv = '';

    // Members Section
    csv += '==== MEMBERS DATA ====\n';
    csv += 'Member Name,Phone,Email,Latest Membership End Date,Due Amount\n';
    if (data.members && data.members.length > 0) {
      data.members.forEach((member: any) => {
        const name = `"${member.first_name} ${member.last_name}"`;
        const phone = member.phone || '';
        const email = member.email || '';
        const endDate = member.latest_membership_end_date || 'N/A';
        const due = member.due_amount || 0;
        csv += `${name},${phone},${email},${endDate},${due}\n`;
      });
    }

    csv += '\n\n';

    // Monthly Revenue Section
    csv += '==== MONTHLY REVENUE ====\n';
    csv += 'Month,Revenue\n';
    if (data.monthly_revenue && data.monthly_revenue.length > 0) {
      data.monthly_revenue.forEach((entry: any) => {
        csv += `${entry.month_name},${entry.revenue}\n`;
      });
    }

    csv += '\n';

    // Total Revenue
    csv += '==== SUMMARY ====\n';
    csv += `Total Revenue,${data.total_revenue || 0}\n`;
    csv += `Total Members,${data.members ? data.members.length : 0}\n`;
    csv += `Generated On,${new Date().toLocaleString()}\n`;

    return csv;
  }

  private async downloadCSV(csvContent: string, filename: string) {
    if (Capacitor.isNativePlatform()) {
      try {
        // For Mobile: Use Filesystem to save and then Share
        const result = await Filesystem.writeFile({
          path: filename,
          data: csvContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        await Share.share({
          title: 'Gym Backup Data',
          text: 'Here is your gym backup data CSV file.',
          url: result.uri,
          dialogTitle: 'Share or Save Backup'
        });
      } catch (error) {
        console.error('Mobile download error:', error);
        this.notificationService.showToast('Failed to save file on mobile', 'error');
      }
    } else {
      // For Web: Standard blob download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }



  // WhatsApp integration logic removed
}