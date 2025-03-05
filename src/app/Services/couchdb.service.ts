
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { v4 as uuidv4 } from 'uuid';
import { Product } from "../Model/product.model";
import { ProductStock } from "../Model/productStock.model";
import { ProductPrice } from "../Model/productPrice.model";
import { Order } from "../Model/order.model";

@Injectable({
  providedIn: 'root'
})
export class CouchDbService {
  readonly baseURL = 'https://192.168.57.185:5984/sportiq';
  readonly userName = 'd_couchdb';
  readonly password = 'Welcome#2';

  constructor(readonly http: HttpClient) { }

  readonly headers = new HttpHeaders({
    'Authorization': 'Basic ' + btoa(this.userName + ':' + this.password),
    'Content-Type': 'application/json'
  });

  getAllDocs(){
    const url = `${this.baseURL}/_all_docs?include_docs=true`;
    return this.http.get(url, { headers: this.headers })
  }

  searchDocs(query: string) {
    const url = `${this.baseURL}/_design/search_indices/_search/global_search?q=default:${encodeURIComponent(query)}`;
    console.log(url);
    return this.http.get(url, { headers: this.headers });
  }

  /*****           Product Page services                *****/
  getCategory() {
    const url = `${this.baseURL}/_design/Views/_view/category_by_id`;
    return this.http.get(url, { headers: this.headers })
  }

  getParticularCategory(categoryID: string) {
    const url = `${this.baseURL}/${categoryID}`;
    return this.http.get(url, { headers: this.headers })
  }

  getSubCategory(categoryID: string | undefined) {  // only need the particular categories subcategory 
    const url = `${this.baseURL}/_design/Views/_view/subcategory_by_categoryid?key="${categoryID}"`;
    return this.http.get(url, { headers: this.headers })
  }

  getParticularSubCategory(subCategoryId: string) {
    if (subCategoryId === "")
      throw new Error("Subcategory Id can't be empty")
    const url = `${this.baseURL}/${subCategoryId}`;
    return this.http.get(url, { headers: this.headers })
  }

  addNewCategory(categoryName: string, categoryMainImage: string, categoryNavImage: string) {
    const url = `${this.baseURL}`;
    const payload: any = { categoryName: categoryName, categoryMainImage: categoryMainImage, categoryNavImage: categoryNavImage, type: "category" };
    return this.http.post(url, { _id: `category_2_${uuidv4()}`, data: payload }, { headers: this.headers });
  }

  addNewSubCategory(subCategoryName: string, categoryId: string | undefined) {
    const url = `${this.baseURL}`;
    const payload: any = { subcategoryName: subCategoryName, categoryId: categoryId, type: "subcategory" };
    return this.http.post(url, { _id: `subcategory_2_${uuidv4()}`, data: payload }, { headers: this.headers });
  }

  addNewProduct(newProduct: Product) {
    if (newProduct.productSubCategoryId == "")
      throw new Error("Product SubCategory ID cannot be empty.");
    const url = `${this.baseURL}`;
    return this.http.post(url, { _id: `product_2_${uuidv4()}`, data: newProduct }, { headers: this.headers })
  }

  updateProduct(id: string, revId: string, updatedProductDetail: Product) {
    if (updatedProductDetail.productSubCategoryId == "")
      throw new Error("Product SubCategory ID cannot be empty.");
    const url = `${this.baseURL}/${id}`;
    return this.http.put(url, { _id: id, _rev: revId, data: updatedProductDetail }, { headers: this.headers })
  }

  getAllProducts() {
    const url = `${this.baseURL}/_design/Views/_view/products_by_productname?include_docs=true`;
    return this.http.get(url, { headers: this.headers })
  }

  getParticularProduct(productName: string) {
    const url = `${this.baseURL}/_design/Views/_view/products_by_productname?key="${productName}"&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers });
  }

  /*****    Tracking page services     *****/
  getProductsMap() {   // key : Name, value : imageUrl
    const url = `${this.baseURL}/_design/Views/_view/products_by_productname`;
    return this.http.get(url, { headers: this.headers });
  }

  getParticularProductMap(productName: string){
    const url = `${this.baseURL}/_design/Views/_view/products_by_productname?key="${productName}"`;
    return this.http.get<any>(url, { headers: this.headers });
  }

  trackStock(stockDetails: ProductStock) {
    const url = `${this.baseURL}`;
    const stockPayload = { ...stockDetails, updatedAt: new Date(), timeStamp: Date.now() }
    return this.http.post(url, { _id: `stocktracker_2_${uuidv4()}`, data: stockPayload }, { headers: this.headers });
  }

  trackProductPrice(priceDetails: ProductPrice) {
    const url = `${this.baseURL}`;
    const stockPayload = { ...priceDetails, updatedAt: new Date(), timeStamp: Date.now() }
    return this.http.post(url, { _id: `pricetracker_2_${uuidv4()}`, data: stockPayload }, { headers: this.headers });
  }

  getParticularProductStock(productName: string) {
    const url = `${this.baseURL}/_design/Views/_view/stocktracking_productname?key="${productName}"&include_docs=true`;
    console.log(url);
    return this.http.get<any>(url, { headers: this.headers });
  }

  getParticularProductPrice(productName: string) {
    const url = `${this.baseURL}/_design/Views/_view/pricetracking_by_productname?key="${productName}"&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers })
  }

  /*****      Order Page          ****/
  getAllOrders(limit? : number) {
    const url = `${this.baseURL}/_design/Views/_view/order_by_orderdate?include_docs=true&reduce=false&descending=true`;
    return this.http.get<any>(url, { headers: this.headers })
  }

  getAllOrdersMap() { // group totalPrice and count based on the last 7 days
    const url = `${this.baseURL}/_design/Views/_view/order_by_orderdate?reduce=true&group=true&limit=7&descending=true`;
    return this.http.get<any>(url, { headers: this.headers });
  }

  getOrderDetailsMap() {
    const url = `${this.baseURL}/_design/Views/_view/orderdetails_by_orderid`;
    return this.http.get<any>(url, { headers: this.headers });
  }

  getParticularOrderDetails(orderId: string) {
    const url = `${this.baseURL}/_design/Views/_view/orderdetails_by_orderid?key="${orderId}"&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers })
  }

  getParticularCart(cartId: string) {
    const url = `${this.baseURL}/${cartId}`;
    return this.http.get<any>(url, { headers: this.headers })
  }

  getCustomerDetails(customerId: string) {  // get particular user detail return whole doc
    const url = `${this.baseURL}/${customerId}`;
    return this.http.get<any>(url, { headers: this.headers })
  }

  getCartMap() {
    const url = `${this.baseURL}/_design/Views/_view/addtocart_by_productname?reduce=true&group=true&inclusive_end=true`;
    return this.http.get<any>(url, { headers: this.headers });
  }

  getDetailedCartMap(){
    const url = `${this.baseURL}/_design/Views/_view/addtocart_by_productname?reduce=false&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers });
  }

  getRecentOrders(){
    const url = `${this.baseURL}/_design/Views/_view/order_by_orderdate?reduce=false&limit=5&descending=true&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers });
  }

  updateOrderStatus(orderId : string, revId : string, orderDetail : Order){
    if(revId === ""){
      console.log("Rev id is empty");
      throw new Error("Rev is empty")
    }
    const url = `${this.baseURL}/${orderId}`;
    return this.http.put<any>(url,{ _rev : revId , data : orderDetail }, { headers: this.headers });
  }
}