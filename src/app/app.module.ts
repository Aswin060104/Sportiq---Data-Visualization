import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { Router, RouterModule } from '@angular/router';
import { AppRoutingModule } from './app-routing.module';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AdminNavBarComponent } from './admin/admin-nav-bar/admin-nav-bar.component';
import { DatePipe } from '@angular/common';
import { AdminModule } from './admin/admin.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    RouterModule,
    AppRoutingModule,
    BrowserModule,
    HttpClientModule,
    AdminModule
  ],
  providers: [HttpClient, Router, DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
