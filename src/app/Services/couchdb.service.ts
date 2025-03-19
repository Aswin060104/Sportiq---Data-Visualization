
import { HttpClient, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { v4 as uuidv4 } from 'uuid';
import { Product } from "../Model/product.model";
import { ProductStock } from "../Model/productStock.model";
import { ProductPrice } from "../Model/productPrice.model";
import { Order } from "../Model/order.model";
import { catchError, throwError, timeout } from "rxjs";

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

  getProductIndex(selectedLabel : string){
    let url = `${this.baseURL}/_design/search_indices/_search/by${selectedLabel}?q=type:${selectedLabel}`;
    if(selectedLabel === 'order')
        url = `${this.baseURL}/_design/search_indices/_search/by${selectedLabel}?q=type:${selectedLabel} OR type:add-to-cart OR type:orderDetail`;  
    return this.http.get(url, { headers: this.headers })
  }

  searchDocs(query: string) {
    const url = `${this.baseURL}/_design/search_indices/_search/global_search?q=product:${encodeURIComponent(query)}`;
    // const url = `${this.baseURL}/_design/search_indices/_search/global_search?q=price:[0 TO ${encodeURIComponent(query)}]`;
    // const url =`${this.baseURL}/_design/search_indices/_search/global_search?q=product:${encodeURIComponent(query)}*&wildcard=true`;
    console.log(url);
    return this.http.get(url, { headers: this.headers }).pipe(
      timeout(5000), // Set a 5-second timeout
      catchError(this.handleError)
    );
  }

  getParticularDoc(docId: string){
    const url = `${this.baseURL}/${docId}`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError))
  }
  /*****           Product Page services                *****/
  getCategory() {
    const url = `${this.baseURL}/_design/Views/_view/category_by_id`;
    return this.http.get(url, { headers: this.headers }).pipe(
      timeout(5000), // Set a 5-second timeout
      catchError(this.handleError)
    )
  }

  getParticularCategory(categoryID: string) {
    const url = `${this.baseURL}/${categoryID}`;
    return this.http.get(url, { headers: this.headers }).pipe(
      timeout(5000), // Set a 5-second timeout
      catchError(this.handleError)
    )
  }

  getSubCategory(categoryID: string | undefined) {  // only need the particular categories subcategory 
    const url = `${this.baseURL}/_design/Views/_view/subcategory_by_categoryid?key="${categoryID}"`;
    return this.http.get(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  getParticularSubCategory(subCategoryId: string) {
    if (subCategoryId === "")
      throw new Error("Subcategory Id can't be empty")
    const url = `${this.baseURL}/${subCategoryId}`;
    return this.http.get(url, { headers: this.headers }).pipe(
      timeout(5000), // Set a 5-second timeout
      catchError(this.handleError)
    )
  }

  addNewCategory(categoryName: string, categoryMainImage: string, categoryNavImage: string) {
    const url = `${this.baseURL}`;
    const payload: any = { categoryName: categoryName, categoryMainImage: categoryMainImage, categoryNavImage: categoryNavImage, type: "category" };
    return this.http.post(url, { _id: `category_2_${uuidv4()}`, data: payload }, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  addNewSubCategory(subCategoryName: string, categoryId: string | undefined) {
    const url = `${this.baseURL}`;
    const payload: any = { subcategoryName: subCategoryName, categoryId: categoryId, type: "subcategory" };
    return this.http.post(url, { _id: `subcategory_2_${uuidv4()}`, data: payload }, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  addNewProduct(newProduct: Product) {
    if (newProduct.productSubCategoryId == "")
      throw new Error("Product SubCategory ID cannot be empty.");
    const url = `${this.baseURL}`;
    return this.http.post(url, { _id: `product_2_${uuidv4()}`, data: newProduct }, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError))
  }

  updateProduct(id: string, revId: string, updatedProductDetail: Product) {
    if (updatedProductDetail.productSubCategoryId == "")
      throw new Error("Product SubCategory ID cannot be empty.");
    const url = `${this.baseURL}/${id}`;
    return this.http.put(url, { _id: id, _rev: revId, data: updatedProductDetail }, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError))
  }

  getAllProducts() {
    const url = `${this.baseURL}/_design/Views/_view/products_by_productname?include_docs=true`;
    return this.http.get(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError))
  }

  getParticularProduct(productName: string) {
    const url = `${this.baseURL}/_design/Views/_view/products_by_productname?key="${productName}"&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  /*****    Tracking page services     *****/
  getProductsMap() {   // key : Name, value : imageUrl
    const url = `${this.baseURL}/_design/Views/_view/products_by_productname`;
    return this.http.get(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  getParticularProductMap(productName: string){
    const url = `${this.baseURL}/_design/Views/_view/products_by_productname?key="${productName}"`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  trackStock(stockDetails: ProductStock) {
    const url = `${this.baseURL}`;
    const stockPayload = { ...stockDetails, updatedAt: new Date(), timeStamp: Date.now() }
    return this.http.post(url, { _id: `stocktracker_2_${uuidv4()}`, data: stockPayload }, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  trackProductPrice(priceDetails: ProductPrice) {
    const url = `${this.baseURL}`;
    const stockPayload = { ...priceDetails, updatedAt: new Date(), timeStamp: Date.now() }
    return this.http.post(url, { _id: `pricetracker_2_${uuidv4()}`, data: stockPayload }, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  getParticularProductStock(productName: string) {
    const url = `${this.baseURL}/_design/Views/_view/stocktracking_productname?key="${productName}"&include_docs=true`;
    console.log(url);
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  getParticularProductPrice(productName: string) {
    const url = `${this.baseURL}/_design/Views/_view/pricetracking_by_productname?key="${productName}"&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError))
  }

  /*****      Order Page          ****/
  getAllOrders() {
    const url = `${this.baseURL}/_design/Views/_view/order_by_orderdate?include_docs=true&reduce=false&descending=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError))
  }

  getAllOrdersMap() { // group totalPrice and count based on the last 7 days
    const url = `${this.baseURL}/_design/Views/_view/order_by_orderdate?reduce=true&group=true&limit=7&descending=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  getOrderDetailsMap() {
    const url = `${this.baseURL}/_design/Views/_view/orderdetails_by_orderid`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  getParticularOrderDetails(orderId: string) {
    const url = `${this.baseURL}/_design/Views/_view/orderdetails_by_orderid?key="${orderId}"&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError))
  }

  getParticularCart(cartId: string) {
    const url = `${this.baseURL}/${cartId}`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError))
  }

  getCartMap() {
    const url = `${this.baseURL}/_design/Views/_view/addtocart_by_productname?reduce=true&group=true&inclusive_end=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  getDetailedCartMap(){
    const url = `${this.baseURL}/_design/Views/_view/addtocart_by_productname?reduce=false&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  getRecentOrders(){
    const url = `${this.baseURL}/_design/Views/_view/order_by_orderdate?reduce=false&limit=5&descending=true&include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  updateOrderStatus(orderId : string, revId : string, orderDetail : Order){
    if(revId === ""){
      console.log("Rev id is empty");
      throw new Error("Rev is empty")
    }
    const url = `${this.baseURL}/${orderId}`;
    return this.http.put<any>(url,{ _rev : revId , data : orderDetail }, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }

  getCustomerDetails(customerId: string) {  // get particular user detail return whole doc
    const url = `${this.baseURL}/${customerId}`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError))
  }

  getAllCustomers(){
    const url = `${this.baseURL}/_design/Views/_view/customer_by_email?include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));   
  }

  // getAllCustomersMap(){
  //   const url = `${this.baseURL}/_design/Views/_view/customer_by_email?`;
  //   return this.http.get<any>(url, { headers: this.headers });   
  // }
  getAllCustomerAddress(){
    const url = `${this.baseURL}/_design/Views/_view/customeraddress_by_email?include_docs=true`;
    return this.http.get<any>(url, { headers: this.headers }).pipe( timeout(5000), catchError(this.handleError));
  }


  private handleError(error: HttpErrorResponse | any) {
    let errorMessage = 'An unknown error occurred!';
    
    if (error.name === 'TimeoutError') {
      errorMessage = 'Request timed out. Please check your internet connection and try again.';
    } else if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Backend error (response error)
      switch (error.status) {
        case 400: errorMessage = 'Bad Request: Please check your input and try again.'; break;
        case 401: errorMessage = 'Unauthorized: Please log in again.'; break;
        case 403: errorMessage = 'Forbidden: You do not have access to this resource.'; break;
        case 404: errorMessage = 'Not Found: The requested resource does not exist.'; break;
        case 409: errorMessage = 'Conflict: The data already exists.'; break;
        case 500: errorMessage = 'Internal Server Error: Please try again later.'; break;
        case 503: errorMessage = 'Service Unavailable: The server is currently down.'; break;
        default: errorMessage = `Server Error (${error.status}): ${error.message}`;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}