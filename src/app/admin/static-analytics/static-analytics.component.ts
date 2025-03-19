import { ChangeDetectorRef, Component, ElementRef } from '@angular/core';
import { CouchDbService } from '../../Services/couchdb.service';
import * as d3 from 'd3';
import { HttpClient } from '@angular/common/http';
import { Product } from '../../Model/product.model';


interface Order {
  orderId: string;
  email: string;
  city: string;
  state: string;
  productName: string;
  quantity: number;
  stock: number;
  discount: number;
  category: string;
  discountedSellingPrice: number;
  originalPrice: number;
  profit: number;
  ratings: number;
  orderDate: string;
  totalPrice: number;
}
interface ProductDetail {sales: number; quantity: number; orderCount: number }

@Component({
  selector: 'app-analytics',
  templateUrl: './static-analytics.component.html',
  styleUrl: './static-analytics.component.css',
  standalone: false
})
export class AnalyticsComponent {
constructor(readonly http: HttpClient, readonly el: ElementRef, readonly cdRef: ChangeDetectorRef, readonly dbConnector: CouchDbService) { }

  orders: Order[] = [];
  allAddress: any = [];
  allProducts : Product[] = [];
  searchBarValue: string = "";
  labels = ['']// Labels for X-axis
  selectedChart = ''; // Default chart type
  colors = d3.scaleOrdinal(d3.schemeCategory10);

  dependentObjects : Map<string, string[]> = new Map();


  objects: { id: number, value: string, checked: boolean }[] = [
    { id: 1, value: 'product', checked: false },
    { id: 2, value: 'order', checked: false },
    { id: 3, value: 'customer', checked: false },
    { id: 4, value: 'category', checked: false }
  ];

  possibleColumnLabels: Map<string, boolean> = new Map();

  // allObjects : string[] = []
  selectedObjects: string[] = [];
  selectedRowLabel: string = "";  //Default values
  selectedColumnLabel: string = "";

  productData: Map<string, { sales: number, profit: number, quantity: number, orderCount: number, discountedSellingPrice: number, originalPrice: number, stock: number, discount: number }> = new Map();
  


  mappedRowColumn: Map<string, string[]> = new Map();
  mappedObjectLabels: Map<string, string[]> = new Map();
  additionalColumnsMap: Map<string, string[]> = new Map();


  ngOnInit(): void {
    this.mappedRowColumn.set("Category", ["Orders Count", "Sales", "Profit", "Items Sold"]);
    this.mappedRowColumn.set("Products Name", ["Orders Count", "Sales", "Profit", "Items Sold", "Selling Price", "Original Price", "Stock", "Discount"]);
    this.mappedRowColumn.set("City", ["Orders Count", "Sales", "Customers","Items Sold"]);
    this.mappedRowColumn.set("State", ["Orders Count", "Sales"]);
    this.mappedRowColumn.set("Order Date", ["Orders Count", "Sales"]);
    this.mappedRowColumn.set("Customer", ["Orders Count", "Sales"]);

    // Object-wise labels
    this.mappedObjectLabels.set("product", ["Products Name", "Selling Price", "Original Price", "Discount", "Stock"]);
    this.mappedObjectLabels.set("order", ["Orders Count", "Order Date", "Sales", "Items Sold", "City", "State"]);
    this.mappedObjectLabels.set("customer", ["Customer"]);
    this.mappedObjectLabels.set("category", ["Category"]);  
    this.dependentObjects.set("product",["add_to_cart"])
  }


  assignFieldValue(labelName : string){
      if( this.mappedRowColumn.has(labelName))
        this.selectedRowLabel = labelName
      this.mappedRowColumn.forEach((value, key) => {
        if(value.includes(labelName))
          this.selectedColumnLabel = labelName
      })
      console.log(labelName);
      this.dbConnector.getProductIndex(labelName).subscribe({
        next : (response) =>{
          console.log(response)
        },
        error : (error) =>{
          console.log(error)
        }
      })
  }
}