import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManageProductsComponent } from './admin/manage-products/manage-products.component';
import { TrackingComponent } from './admin/tracking/tracking.component';
import { OrdersComponent } from './admin/orders/orders.component';
import { AnalyticsComponent } from './admin/analytics/analytics.component';
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { AdminNavBarComponent } from './admin/admin-nav-bar/admin-nav-bar.component';

const routes: Routes = [
  { path : '', component : ManageProductsComponent},
  { path : 'dashboard', component : DashboardComponent},
  { path : 'tracking', component : TrackingComponent},
  { path : 'orders', component : OrdersComponent},
  { path : 'analytics', component : AnalyticsComponent},
  { path : 'demo-analytics', component : AdminNavBarComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
