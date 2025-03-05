import { Component, inject } from '@angular/core';
import { CouchDbService } from '../../Services/couchdb.service';
import { OrderDetailToDisplay } from '../../Model/orderDetailToDisplay.model';
import { Order } from '../../Model/order.model';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
  standalone : false
})
export class OrdersComponent {

  dbConnector: CouchDbService = inject(CouchDbService);

  allOrderIds: string[] = [];
  cartIdOrderDetailsIdMap: Map<string, string> = new Map();
  customerCart: any = [];

  showOrderDetails : boolean = false;

  searchBarValue : string = "";
  isValueFound : boolean = true;

  orderIdRevMap : Map<string,string> = new Map();
  orderDataToDisplay: Map< string, OrderDetailToDisplay> = new Map();
  orderDetails : { productName: string, quantity: number, discountedSellingPrice: number }[] = [];
  particularOrderTotalPrice : number = 0;

  ngOnInit() {
    this.getOrders();
  }

  getOrders() {  //orderId, orderStatus and totalPrice are available in this function
    this.dbConnector.getAllOrders().subscribe({
      next: (response) => {
        response.rows.forEach((e: any) => {
          this.allOrderIds.push(e.id);
          this.orderIdRevMap.set(e.id, e.doc._rev);
          this.getCustomerDetail(e.doc.data.customerAddressId, e.id, e.doc.data.totalPrice, e.doc.data.orderStatus, e.doc.data.orderDate, e.doc.data.orderAt); //  passing values to assign all the values in the calling function
        })
        console.log(this.allOrderIds);   // All the orders will be stored 
      },
      error: () => {
        console.log("Error");
      }
    });
  }

  getCustomerDetail(customerDetailId: string, orderId : string, totalPrice : number, orderStatus : 'pending' | 'delivered', orderDate : Date, orderAt : string) { // Assigning values 
    this.dbConnector.getCustomerDetails(customerDetailId).subscribe({
      next: (response) => {
      this.orderDataToDisplay.set( orderId, {customerAddressId : customerDetailId, email : response.data.email, city : response.data.city, state : response.data.state, totalPrice : totalPrice, orderDate : orderDate, orderStatus : orderStatus, type: "order", orderAt : orderAt })
      },
      error: () => {
        console.log("Error");
      }
    });
  }

  updateOrderStatus(orderDetail : OrderDetailToDisplay){
    console.log(orderDetail);
    let orderId : string = "";
    let revId : string = "";
    this.orderDataToDisplay.forEach((value, key) => {
      if(orderDetail === value){
        orderId = key;
        revId = this.orderIdRevMap.get(key) ?? "";
      }
    })
    orderDetail.orderStatus = 'delivered';
    let orderPayLoad : Order = {customerAddressId : orderDetail.customerAddressId, totalPrice : orderDetail.totalPrice, orderDate : orderDetail.orderDate, orderAt : orderDetail.orderAt, orderStatus : orderDetail.orderStatus, type : "order"}
    this.dbConnector.updateOrderStatus(orderId, revId, orderPayLoad).subscribe({
      next: (response) => {
        console.log(response); 
        this.getOrders();
      },
      error: () => {
        console.log("Error");
      }
    })
  }

  getParticularOrderDetail(orderTotalPrice : number) { // This will have the detail of the particular OrderId
    this.particularOrderTotalPrice = orderTotalPrice;
    this.dbConnector.getParticularOrderDetails('1').subscribe({
      next: (response) => {
        this.cartIdOrderDetailsIdMap.clear();
        response.rows.forEach((response: any) => {
          this.cartIdOrderDetailsIdMap.set(response.value, response.id);
        })
        this.orderDetails = [];
        this.cartIdOrderDetailsIdMap.forEach((value, key, i) => {
          this.getCartDetail(key);
        })
        console.log(this.orderDetails);
      },
      error: (error) => {
        console.log();
      }
    });
  }

  getCartDetail(cartId: string) { // fetching the cart details for the clicked order
    this.showOrderDetails = true;
    this.dbConnector.getParticularCart(cartId).subscribe({
      next: (response) => {
        this.orderDetails.push({productName : response.data.productName, quantity : response.data.quantity, discountedSellingPrice : response.data.discountedSellingPrice })
      },
      error: () => {
        console.log("Error");
      }
    });
  }
  
  get orderDataValue() {
    return Array.from(this.orderDataToDisplay.values());
  }
  toggleOrderDetailView(){
    this.showOrderDetails = !this.showOrderDetails;
  }

  checkSearchValueFound(){
    // this.isValueFound = this.orderDataToDisplay.some((e : any) => {
    //   return e.email.includes(this.searchBarValue.toLowerCase());
    // })
    // console.log(this.isValueFound);
    // console.log(this.orderDataToDisplay);
    
    return this.searchBarValue.length === 0 ? true : this.isValueFound;
  }
}