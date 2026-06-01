import { Component, OnInit } from '@angular/core';
import { OwnerService } from 'src/app/core/services/owner.service';
import { Member } from 'src/app/core/models/member.model';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedService } from 'src/app/core/services/shared.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { NotificationService } from 'src/app/core/services/notification.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActionSheetController } from '@ionic/angular';

@Component({
  selector: 'app-members',
  templateUrl: './members.page.html',
  styleUrls: ['./members.page.scss'],
  standalone: false,
})
export class MembersPage implements OnInit {
  members: any[] = [];
  loading = false;
  error: string | null = null;
  private apiBaseUrl = environment.apiBaseUrl;
  defaultAvatar = '../../../assets/avatar.png';

  searchTerm: string = '';
  selectedFilter: 'all' | 'expired' | 'expiring' | 'pt' | 'due' = 'all';

  currentPage = 1;
  itemsPerPage = 10; // Default limit, matches backend default
  totalMembers = 0;
  totalPages = 0;

  private searchTerms = new Subject<string>();
  private searchSubscription!: Subscription;


  constructor(
    private OwnerService: OwnerService,
    private router: Router,
    private sharedService: SharedService,
    private http: HttpClient,
    private activatedRoute: ActivatedRoute,
    private notificationService: NotificationService,
    private actionSheetCtrl: ActionSheetController
  ) { }

  // Cache for members list based on filters
  private membersCache: { [key: string]: { members: any[], totalMembers: number, totalPages: number } } = {};

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe(params => {
      if (params['filter']) {
        // Validate filter if necessary, or just cast
        const filter = params['filter'];
        if (['expired', 'expiring', 'pt', 'due'].includes(filter)) {
          this.selectedFilter = filter as any;
        } else {
          this.selectedFilter = 'all';
        }
      } else {
        this.selectedFilter = 'all';
      }
      this.currentPage = 1; // Reset to first page on filter/search change
      this.fetchMembers(true);
    });

    this.sharedService.refresh$.subscribe(async (type) => {
      if (type === 'members') {
        this.clearCache(); // Clear cache on update
        this.currentPage = 1;
        this.fetchMembers(true);
        this.notificationService.showToast('Members list updated.', 'info');
      }
    });

    this.searchSubscription = this.searchTerms.pipe(
      debounceTime(500), // Wait 500ms after the last keystroke
      distinctUntilChanged() // Only emit if value is different from previous value
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });

  }

  performSearch(searchTerm: string) {
    this.searchTerm = searchTerm;
    this.currentPage = 1;
    // Search invalidates cache essentially, or we just bypass cache for search
    this.fetchMembers(true, true); // force fetch for search
  }

  clearCache() {
    this.membersCache = {};
  }

  fetchMembers(reset: boolean = false, force: boolean = false) {
    const cacheKey = `${this.selectedFilter}_page${this.currentPage}_search${this.searchTerm}`;

    // If not forced, and not searching (or searching but we want to cache search results too?), check cache
    if (!force && this.membersCache[cacheKey]) {
      console.log('Serving members from cache:', cacheKey);
      const cached = this.membersCache[cacheKey];
      if (reset) {
        this.members = cached.members;
      } else {
        this.members = [...this.members, ...cached.members];
      }
      this.totalMembers = cached.totalMembers;
      this.totalPages = cached.totalPages;
      this.loading = false;
      return;
    }

    // If resetting (filter change) or no data, show loader
    if (reset) {
      this.members = []; // Clear array specifically to trigger skeleton in HTML
      this.loading = true;
    } else if (this.members.length === 0) {
      this.loading = true;
    }

    this.OwnerService.getMembers(this.searchTerm, this.selectedFilter, this.currentPage, this.itemsPerPage).subscribe({
      next: (response: any) => {
        const fetchedMembers = response?.members || [];

        // Update Cache
        this.membersCache[cacheKey] = {
          members: fetchedMembers,
          totalMembers: response.total_members,
          totalPages: response.total_pages
        };

        if (reset) {
          this.members = fetchedMembers;
        } else {
          this.members = [...this.members, ...fetchedMembers];
        }
        this.totalMembers = response.total_members;
        this.totalPages = response.total_pages;
        this.loading = false;
      },
      error: (err) => {
        this.error = this.notificationService.getFriendlyError(err);
        this.loading = false;
        this.notificationService.showToast(this.error, 'error');
      }
    });
  }

  loadMore() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.fetchMembers(false); // Fetch next page, append results
    }
  }

  // Refresh members list - reset pagination and reload
  refreshMembers() {
    this.currentPage = 1;
    this.selectedFilter = 'all';
    this.searchTerm = '';
    this.members = [];
    this.loading = true;
    this.fetchMembers(true);
    this.notificationService.showToast('Members list refreshed!', 'success');
  }

  onSearchChange(event: any) {
    const searchTerm = event.target.value; // For native input, use event.target.value
    this.searchTerms.next(searchTerm); // Push the new search term to the Subject
  }

  onFilterChange() {
    this.currentPage = 1; // Reset to first page on new filter
    this.fetchMembers(true);
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
          const response: any = await this.http.put(
            `${this.apiBaseUrl}/owner/members/${member.member_id}/photo`,
            formData
          ).toPromise();
          member.photo = response.photo;
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

  async uploadPhoto(member: any, event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    this.loading = true;
    try {
      const response: any = await this.http.put(
        `${this.apiBaseUrl}/owner/members/${member.member_id}/photo`,
        formData
      ).toPromise();
      member.photo = response.photo;
      this.notificationService.showToast('Photo updated successfully!', 'success');
    } catch (err) {
      this.notificationService.showToast('Photo upload failed. Please try again.', 'error');
    } finally {
      this.loading = false;
    }
  }

  goToMemberDetails(member: Member) {
    this.router.navigate([`/owner-tabs/members/${member.member_id}`]);
  }

  goToAddMember() {
    this.router.navigate(['owner-tabs/add-member']);
  }

  viewFullPhoto(member: any) {
    console.log('View full photo for:', member.first_name);
  }

  async openWhatsApp(member: any, event: Event) {
    event.stopPropagation(); // Prevent ensuring row click
    if (!member?.phone) {
      this.notificationService.showToast('Phone number not available', 'error');
      return;
    }

    let phone = member.phone.replace(/\D/g, ''); // Remove non-digits
    if (phone.length === 10) {
      phone = '91' + phone; // Prepend country code for India
    }

    try {
      this.loading = true;
      const templates = await this.OwnerService.getWhatsAppTemplates().toPromise();
      this.loading = false;

      if (!templates || templates.length === 0) {
        this.openWhatsAppWithBody(phone, member, "Hi {name},");
        return;
      }

      const buttons: any[] = templates.map((t: any) => ({
        text: t.name,
        handler: () => {
          this.openWhatsAppWithBody(phone, member, t.message);
        }
      }));

      buttons.push({
        text: 'Cancel',
        role: 'cancel',
        handler: () => {}
      });

      const actionSheet = await this.actionSheetCtrl.create({
        header: 'Select Message Template',
        buttons: buttons
      });

      await actionSheet.present();

    } catch (error) {
      this.loading = false;
      this.notificationService.showToast('Failed to load templates', 'error');
      this.openWhatsAppWithBody(phone, member, "Hi {name},");
    }
  }

  openWhatsAppWithBody(phone: string, member: any, messageTemplate: string) {
    const name = `${member.first_name} ${member.last_name}`;
    const message = messageTemplate.replace(/{name}/g, name);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(url, '_system');
  }
}
