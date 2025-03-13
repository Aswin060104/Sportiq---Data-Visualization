import { Component, inject } from '@angular/core';
import { CouchDbService } from '../../Services/couchdb.service';
import { OrderDetailToDisplay } from '../../Model/orderDetailToDisplay.model';
import { Order } from '../../Model/order.model';
import { filter, forkJoin } from 'rxjs';

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
  stopInitialAnimation : boolean = true;

  searchBarValue : string = "";
  isValueFound : boolean = true;

  orderIdRevMap : Map<string,string> = new Map();
  orderData: OrderDetailToDisplay[] = [];
  orderDetails : { productName: string, quantity: number, discountedSellingPrice: number }[] = [];
  filteredOrderData : OrderDetailToDisplay[] = [];
  viewName : string = "all";
  clickedOrderDetail : OrderDetailToDisplay = {customerAddressId : "", city : "", state : "", type : "order",email : "", totalPrice : 0, orderAt : "", orderDate : new Date(), orderStatus : 'delivered', orderId : ""};
  particularOrderTotalPrice : number = 0;


  ngOnInit() {
    this.getOrders();
  }

  getOrders() {
    this.dbConnector.getAllOrders().subscribe({
      next: (response) => {
        this.orderData = [];
        this.allOrderIds = response.rows.map((e: any) => e.id);  // Store all order IDs
        this.orderIdRevMap = new Map(response.rows.map((e: any) => [e.id, e.doc._rev])); // Store orderId and _rev
  
        // Create an array of customer detail API calls
        const customerRequests = response.rows.map((e: any) =>
          this.dbConnector.getCustomerDetails(e.doc.data.customerAddressId)
        );
  
        // Execute all customer API calls in parallel
        forkJoin(customerRequests).subscribe({
          next: (customerResponses : any) => {
            response.rows.forEach((e: any, index: number) => {
              const customerResponse = customerResponses[index];
  
              this.orderData.push({
                orderId: e.id,
                customerAddressId: e.doc.data.customerAddressId,
                email: customerResponse.data.email,
                city: customerResponse.data.city,
                state: customerResponse.data.state,
                totalPrice: e.doc.data.totalPrice,
                orderDate: e.doc.data.orderDate,
                orderStatus: e.doc.data.orderStatus,
                type: "order",
                orderAt: e.doc.data.orderAt
              });
            });
            this.filteredOrderData = [];
            this.filteredOrderData = this.orderData;
            console.log(this.orderData);  // Ensure all data is populated
          },
          error: (err) => console.error("Error fetching customer details:", err)
        });
      },
      error: () => console.log("Error fetching orders")
    });
  }

  updateOrderStatus(orderDetail : OrderDetailToDisplay){
    console.log(orderDetail);
    let orderId : string = "";
    let revId : string = "";
    this.orderData.forEach((value) => {
      if(orderDetail === value){
        orderId = value.orderId;
        revId = this.orderIdRevMap.get(value.orderId) ?? "";
      }
    })
    orderDetail.orderStatus = 'delivered';
    let orderPayLoad : Order = {customerAddressId : orderDetail.customerAddressId, totalPrice : orderDetail.totalPrice, orderDate : orderDetail.orderDate, orderAt : orderDetail.orderAt, orderStatus : orderDetail.orderStatus, type : "order"}
    this.dbConnector.updateOrderStatus(orderId, revId, orderPayLoad).subscribe({
      next: (response) => { 
        this.getOrders();
      },
      error: () => {
        console.log("Error");
      }
    })
  }

  modifyOrderView(viewName : string){
    if(viewName == 'recent'){
      this.filteredOrderData = this.orderData.slice(0, 5);
      this.viewName = "recent"
    }
    else if(viewName == 'delivered'){
      this.filteredOrderData = this.orderData.filter((e) => e.orderStatus === 'delivered')
      this.viewName = "delivered"
    }
    else if(viewName == 'pending'){
      this.filteredOrderData = this.orderData.filter((e) => e.orderStatus === 'pending')
      this.viewName = 'pending';
    }
    else{
      this.filteredOrderData = this.orderData;
      this.viewName = 'all'
    }
  }

  getParticularOrderDetail(clickedOrder : OrderDetailToDisplay) { // This will have the detail of the particular OrderId
    let clickedOrderId : string = "";
    this.clickedOrderDetail = clickedOrder
    this.particularOrderTotalPrice = clickedOrder.totalPrice;
    this.orderData.forEach((value) => {
      if(clickedOrder === value)
        clickedOrderId = value.orderId
    });
    console.log(clickedOrderId);
    
    this.dbConnector.getParticularOrderDetails(clickedOrderId).subscribe({
      next: (response) => {
        console.log(response);
        
        this.cartIdOrderDetailsIdMap.clear();
        response.rows.forEach((response: any) => {
          this.cartIdOrderDetailsIdMap.set(response.value, response.id);
        })
        this.orderDetails = [];
        this.getCartDetail();
      },
      error: (error) => {
        console.log();
      }
    });
  }

  getCartDetail() { // fetching the cart details for the clicked order
    this.showOrderDetails = true;
    const cartObservables = Array.from(this.cartIdOrderDetailsIdMap.keys()).map(cartId =>
      this.dbConnector.getParticularCart(cartId)
    );
    forkJoin(cartObservables).subscribe({
      next: (responses) => {
        this.orderDetails = responses.map(response => ({
          productName: response.data.productName,
          quantity: response.data.quantity,
          discountedSellingPrice: response.data.discountedSellingPrice
        }));
        console.log(this.orderDetails);
      },
      error: () => {
        console.log("Error");
      }
    });
  }
  
  
  toggleOrderDetailView(){
    this.showOrderDetails = !this.showOrderDetails;
    this.stopInitialAnimation = false;
    if(!this.showOrderDetails)
      setTimeout(() => {
        this.orderDetails = [];        
      }, 1000);
  }

  checkSearchValueFound(){
    this.isValueFound = this.filteredOrderData.some((e : any) => {
      return e.email.includes(this.searchBarValue.toLowerCase());
    })
    return this.searchBarValue.length === 0 ? true : this.isValueFound;
  }
}