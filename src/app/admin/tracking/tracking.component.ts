import { Component, inject } from '@angular/core';
import { CouchDbService } from '../../Services/couchdb.service';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.css',
  standalone : false
})
export class TrackingComponent {
  dbConnector: CouchDbService = inject(CouchDbService);

  productNameId : Map<string, [string, string]> = new Map();
  productStockDate : {stock : string, date : Date}[] = [];
  productPriceDate :     {productName : string, originalPrice : number, sellingPrice : number, discountedSellingPrice :number, discount : number, profit : number, type : string, date : Date}[] = [];
  trackingProductName : string = "";
  trackingProductImageUrl :string = "";
  
  isStockView : boolean = false;
  isPriceView : boolean = false;

  searchBarValue : string = "";
  isValueFound : boolean = true;

  ngOnInit(){
    this.getProductsNameAndImg();
  }

  getProductsNameAndImg(){
    this.dbConnector.getProductsMap().subscribe({
      next : (response : any) => {  
        response.rows.forEach((e : any) => {
          this.productNameId.set(e.key, [e.id, e.value.productImageUrl]);
          console.log(this.productNameId.get(e.key)?.[1]);
        });
      },
       error : () => {
       }
    })
  }
  get productName() : string[]{
    return Array.from(this.productNameId.keys());
  }

  getStockTrack(productName : string, productImageUrl : string){
    this.isStockView = true;
    this.isPriceView = false;
    this.dbConnector.getParticularProductStock(productName).subscribe({
      next :(response) => {
        console.log(response);
        this.productStockDate = [];
        this.trackingProductName = productName;
        this.trackingProductImageUrl = productImageUrl;
        response.rows.forEach( (e : any) => {
          this.productStockDate.push({stock : e.value.stock, date : e.value.updatedAt });
        })
      },
      error(error : any){
        console.log(error);
      }
    });
  }

  getPriceTrack(productName : string, productImageUrl : string){
    this.isPriceView = true;
    this.isStockView = false;
    this.dbConnector.getParticularProductPrice(productName).subscribe({
      next :(response) => {
        console.log(response);
        this.productPriceDate = [];
        this.trackingProductName = productName;
        this.trackingProductImageUrl = productImageUrl;
        response.rows.forEach( (e : any) => {
          this.productPriceDate.push({productName : e.doc.data.productName, originalPrice : e.doc.data.originalPrice, sellingPrice : e.doc.data.sellingPrice, profit : e.doc.data.profit, discountedSellingPrice : e.doc.data.discountedSellingPrice, discount : e.doc.data.discount, type : e.doc.data.type, date : e.doc.data.updatedAt });
        })
        console.log(this.productPriceDate);
        
      },
      error(error : any){
        console.log(error);
      }
    });
  }

  checkSearchValueFound(){
    this.isValueFound = this.productName.some((e : any) => {
      return e.toLowerCase().includes(this.searchBarValue?.toLowerCase() ?? '');
    })
    console.log(this.isValueFound);
    console.log(this.productName);
    return this.searchBarValue.length === 0 ? true : this.isValueFound;
  }
  
}