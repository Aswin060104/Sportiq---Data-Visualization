import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AdminNavComponent } from './admin-nav/admin-nav.component';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ManageProductsComponent } from './manage-products/manage-products.component';
import { TrackingComponent } from './tracking/tracking.component';
import { AnalyticsComponent } from './static-analytics/static-analytics.component';
import { OrdersComponent } from './orders/orders.component';
import { AdminNavBarComponent } from './dynamic-analytics/dynamic-analytics.component';
import { CustomersComponent } from './customers/customers.component';

@NgModule({
  declarations: [
    DashboardComponent,
    AdminNavComponent,
    ManageProductsComponent,
    TrackingComponent,
    AnalyticsComponent,
    OrdersComponent,
    AdminNavBarComponent,
    CustomersComponent
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