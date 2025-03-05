import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AdminNavComponent } from './admin-nav/admin-nav.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ManageProductsComponent } from './manage-products/manage-products.component';
import { TrackingComponent } from './tracking/tracking.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { OrdersComponent } from './orders/orders.component';
import { AdminNavBarComponent } from './admin-nav-bar/admin-nav-bar.component';

@NgModule({
  declarations: [
    DashboardComponent,
    AdminNavComponent,
    ManageProductsComponent,
    TrackingComponent,
    AnalyticsComponent,
    OrdersComponent,
    AdminNavBarComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DatePipe
  ],
  exports :[]
})
export class AdminModule { }