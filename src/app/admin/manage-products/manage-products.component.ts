import { Component, inject, ViewChild } from '@angular/core';
import { CouchDbService } from '../../Services/couchdb.service';
import { NgForm } from '@angular/forms';
import { Product } from '../../Model/product.model';
import { ProductStock } from '../../Model/productStock.model';
import { ProductPrice } from '../../Model/productPrice.model';

@Component({
  selector: 'app-manage-products',
  templateUrl: './manage-products.component.html',
  styleUrl: './manage-products.component.css',
  standalone : false
})
export class ManageProductsComponent {

  dbConnector: CouchDbService = inject(CouchDbService);

  @ViewChild('productForm')
  productForm!: NgForm

  productName: string = "";
  productOriginalPrice: number = 0;
  productSellingPrice: number = 0;
  productDiscount: number = 0;;
  discountedSellingPrice: number = 0;
  productProfit: number = 0;
  productStock: number = 0;;
  productImageUrl: string = "";
  productCategory: string = "";
  productSubCategory: string = "";
  categoryMainImage : string = "";
  categoryNavImage : string = "";
  productReviews: string[] = [];
  productRating: number[] = [];
  productStatus: boolean = true;
  productDescription: string = "";
  productSubCategoryId: string = "";

  productNameExist: boolean = false;

  products: Product[] = [];
  productIdName: Map<string, string> = new Map();
  productIdRev: Map<string, string> = new Map();

  isNewCategory : boolean = false;

  categoryIdName: Map<string, string> = new Map();  // categoryName , categoryId
  selectedCategory: string | undefined = "";  // In the Form

  subCategoryIdName: Map<string, string> = new Map();
  subCategories: string[] = [];

  showCategoryList: boolean = false;
  showSubCategoryList: boolean = false;

  showProductForm: boolean = false;
  editProductDetails: boolean = false;
  stopInitialAnimation: boolean = true;
  newProduct!: Product;
  editingProductDetails!: Product;

  searchBarValue : string = "";
  isSearchValueFound : boolean = true;

  ngOnInit() {
    this.getCategory();
    this.getAllProducts();
  }

  get categoryKeys(): string[] {
    return Array.from(this.categoryIdName.keys()); // Convert to an array
  }

  toggleProductForm() {
    this.showProductForm = !this.showProductForm;
    this.stopInitialAnimation = false;
    // To delete the field values which are previously edited
    if(this.editProductDetails === true){
      setTimeout(() => {
        this.resetProductForm();
        this.editProductDetails = false;
      }, 200);
    }
  }

  addProduct() {
    this.productNameExist = false;
    this.calculateProfit();
    this.productSubCategory = this.productSubCategory.charAt(0).toUpperCase() + this.productSubCategory.slice(1);
    this.productCategory = this.productCategory.charAt(0).toUpperCase() + this.productCategory.slice(1);

    this.newProduct  = {
      productName: this.productName,
      productSubCategoryId: this.subCategoryIdName.get(this.productSubCategory) ?? "",
      productOriginalPrice: this.productOriginalPrice,
      productSellingPrice: this.productSellingPrice,
      productDiscount: this.productDiscount,
      discountedSellingPrice: this.discountedSellingPrice,
      productStock: this.productStock,
      productImageUrl: this.productImageUrl,
      productStatus: this.productStatus,
      productDescription: this.productDescription,
      timeStamp: Date.now(),
      addedAt: new Date(),
      type: "product",
    }
    
    this.products.forEach((e: any, i : number) => {
      if (e.productName == this.productName && e.productStatus === true) {
        console.log("Existing in true");
        this.productNameExist = true;
      }
      else if(e.productName == this.productName && e.productStatus === false){
        console.log("Existing in delete");
        
        this.products[i] = this.newProduct;
        this.updateProduct(this.products[i]);
        this.productNameExist = true;
      }
    })
   
    let existingSubCategories: boolean = false;
    console.log(this.subCategories);
    
    for (let subcategory of this.subCategories) {
      if (this.productSubCategory == subcategory)
        existingSubCategories = true;
    }
    if (this.categoryIdName.get(this.productCategory) === undefined) {
      console.log("Creating Category while addProduct");
      this.addNewCategory();
    }
    else if (!existingSubCategories) {
      console.log(this.productCategory);
      console.log("Creating SubCategory while addProduct");
      this.addNewSubCategory(this.productSubCategory, this.categoryIdName.get(this.productCategory));
    }
    else if (this.productNameExist) {
      return;
    }
    else if (this.newProduct.productSubCategoryId === "") {
      console.log("Subcategory not fetched");
      return;
    }
    else if (this.productOriginalPrice > this.productSellingPrice) {
      alert("Product selling price greater than original price");
    }
    else if (this.productForm.valid) {
      console.log("Form Valid");
      this.addNewProduct();
    }
    else {
      // To show form validation instead of alert alert("Enter valid credentials");
      console.log("Invalid form value");
    }

  }

  addNewProduct() {
    console.log(this.newProduct);
    console.log("adding Product");

    this.dbConnector.addNewProduct(this.newProduct).subscribe({
      next: (response: any) => {
        this.getAllProducts();
        console.log("New product Successfully added");
        this.showProductForm = false;
        let stockPayload: ProductStock = { productName: this.productName, stock: this.newProduct.productStock, type: "stock" }
        this.trackStock(stockPayload);
        let pricePayload: ProductPrice = { productName: this.productName, originalPrice: this.newProduct.productOriginalPrice, sellingPrice: this.newProduct.productSellingPrice, discountedSellingPrice: this.newProduct.discountedSellingPrice, discount: this.newProduct.productDiscount, profit: this.productProfit, type: "price" };
        this.trackPrice(pricePayload);
        this.showProductForm = false;
        setTimeout(() => {  // This time delay allows to track price and stock
          this.resetProductForm();
        }, 100);
      },
      error: (error) => {
        console.log("SubCategory is empty");
      }
    });

  }

  editProduct(editingProduct: Product) {
    this.editingProductDetails = editingProduct;
    this.editProductDetails = true;
    this.showProductForm = true;
    this.productSubCategoryId = editingProduct.productSubCategoryId;
    this.productName = editingProduct.productName;
    this.productSellingPrice = editingProduct.productSellingPrice;
    this.productOriginalPrice = editingProduct.productOriginalPrice;
    this.productDiscount = editingProduct.productDiscount;
    this.productStock = editingProduct.productStock;
    this.productImageUrl = editingProduct.productImageUrl;
    this.productDescription = editingProduct.productDescription;
    this.dbConnector.getParticularSubCategory(editingProduct.productSubCategoryId).subscribe({
      next: (response: any) => {
        console.log("Subcategory");
        this.productSubCategory = response.data.subcategoryName;
        console.log(this.productSubCategory);
        this.dbConnector.getParticularCategory(response.data.categoryId).subscribe({
          next: (response: any) => {
            console.log("Category");
            this.productCategory = response.data.categoryName;
          },
          error: (error) => {
            console.log(error);
          }
        });
      },
      error: (error) => {
        console.log(error);
      }
    });

  }

  saveDetails() {
    this.calculateProfit();
    if (this.editingProductDetails.productStock != this.productStock) {
      let stockPayload: ProductStock = { productName: this.productName, stock: this.productStock, type: "stock" }
      this.trackStock(stockPayload);
      console.log("Stock tracked");
    }
    if (this.editingProductDetails.productOriginalPrice != this.productOriginalPrice || this.editingProductDetails.productSellingPrice != this.productSellingPrice || this.editingProductDetails.productDiscount != this.productDiscount) {
      let pricePayload: ProductPrice = { productName: this.productName, originalPrice: this.productOriginalPrice, sellingPrice: this.productSellingPrice, discount: this.productDiscount, discountedSellingPrice: this.discountedSellingPrice, profit: this.productProfit, type: "price" }
      this.trackPrice(pricePayload);
      console.log('Price tracked');
    }
    this.assignUpdatedValue();
    this.editProductDetails = false;
  }

  assignUpdatedValue(){
    let updatedProduct: Product = {
      productName: this.productName,
      productSubCategoryId: this.productSubCategoryId,
      productOriginalPrice: this.productOriginalPrice,
      productSellingPrice: this.productSellingPrice,
      productDiscount: this.productDiscount,
      discountedSellingPrice: this.discountedSellingPrice,
      productStock: this.productStock,
      productImageUrl: this.productImageUrl,
      productStatus: this.productStatus,
      productDescription: this.productDescription,
      timeStamp: this.editingProductDetails.timeStamp,
      addedAt: this.editingProductDetails.addedAt,
      type: "product",
    } 
    this.toggleProductForm();
    console.log(updatedProduct);
    this.updateProduct(updatedProduct);
  }

  updateProduct(updatedProduct : Product) {
    this.dbConnector.updateProduct(this.productIdName.get(updatedProduct.productName) ?? "", this.productIdRev.get(updatedProduct.productName) ?? "", updatedProduct).subscribe({
      next: (response: any) => {
        console.log("Updated successfully");
        this.getAllProducts();
        this.resetProductForm();
        this.showProductForm = false;
      },
      error: (error: any) => {
        console.log(error);
      }
    });
  }

  getAllProducts() {
    this.products = [];
    this.dbConnector.getAllProducts().subscribe({
      next: (response: any) => {
        console.log("All products");
        response.rows.forEach((e: any) => {
          this.products.push(e.doc.data);
          this.productIdName.set(e.doc.data.productName, e.doc._id);
          this.productIdRev.set(e.doc.data.productName, e.doc._rev);
        })
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  deleteProduct(productToDelete : Product){
    productToDelete.productStatus = false;
    this.updateProduct(productToDelete);
  }

  calculateProfit() {
    if (this.productDiscount != 0) {
      this.productProfit = (this.productSellingPrice - (this.productSellingPrice * (this.productDiscount) / 100)) - this.productOriginalPrice;
      this.discountedSellingPrice = Math.round(this.productSellingPrice - (this.productSellingPrice * (this.productDiscount) / 100));
    }
    else{
      this.productProfit = this.productSellingPrice - this.productOriginalPrice;
      this.discountedSellingPrice = this.productSellingPrice;
    }
    this.productProfit = Math.round(this.productProfit)
    console.log(this.productProfit);
  }

  trackStock(stockDetails: ProductStock) {
    this.dbConnector.trackStock(stockDetails).subscribe({
      next: (response: any) => {
        console.log("Stock Tracked");
      },
      error: (error: any) => {
        console.log(error);
      }
    });
  }

  trackPrice(priceDetails: ProductPrice) {
    this.dbConnector.trackProductPrice(priceDetails).subscribe({
      next: (response: any) => {
        console.log("Price Tracked");
      },
      error: (error: any) => {
        console.log(error);
      }
    });
  }

  showCategory() {
    this.showCategoryList = true; // Showing the list of Category
    this.subCategories = []; // Empty the subcategory list
    this.productSubCategory = "";
    this.productCategory =  this.productCategory?.charAt(0).toUpperCase() + this.productCategory.slice(1);
    if(this.categoryIdName.get(this.productCategory) == undefined)
      this.isNewCategory = true;
    else
      this.isNewCategory = false;
  }

  assignCategory(selectedCategory: string) { // click event will assign the category
    this.showCategoryList = true;
    this.productCategory =  selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
    this.showCategory();
  }

  assignSubCategory(selectedSubCategory: string) { // click event will assign the subcategory assets\\all-products\\football\\balls\\ashtang football.jpg
    this.showSubCategoryList = false;
    this.productCategory =  this.productCategory.charAt(0).toUpperCase() + this.productCategory.slice(1);
    this.productSubCategory = selectedSubCategory.charAt(0).toUpperCase() + selectedSubCategory.slice(1);
  }

  addNewCategory() {
    this.productCategory =  this.productCategory.charAt(0).toUpperCase() + this.productCategory.slice(1);
    
    this.dbConnector.addNewCategory(this.productCategory, this.categoryMainImage, this.categoryNavImage).subscribe({
      next: (response: any) => {
        let newCategoryId = response.id;  // assigning the newCategoryId
        console.log("Category created");
        this.categoryIdName.set(this.productCategory, newCategoryId);
        this.addNewSubCategory(this.productSubCategory.charAt(0).toUpperCase() + this.productSubCategory.slice(1), newCategoryId); // calling subcategory
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  addNewSubCategory(subCategoryName: string, categoryId: string | undefined) {
    if (categoryId == undefined) {
      console.log("CategoryId undefined during subcategory addition");
      return;
    }
    this.dbConnector.addNewSubCategory(subCategoryName, categoryId).subscribe({
      next: (response : any) => {
        console.log("subcategory created ");
        this.productSubCategoryId = response.id;
        this.subCategories.push(this.productSubCategory);
        this.subCategoryIdName.set(this.productSubCategory, this.productSubCategoryId);        
        this.addProduct();
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  getCategory() {
    this.dbConnector.getCategory().subscribe({ // getAllCategory
      next: (response: any) => {
        console.log("Category Fetched");
        response.rows.forEach((e: any) => {
          this.categoryIdName.set(e.value, e.key);
        })
        this.getSubCategory(); // Because categoryIdName [ Name , Id ] is used in the calling function
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  // To list the subcategory according to the selectedSubcategory
  // ONLY VALID IF THE CATEGORY IS SELECTED
  getSubCategory() {
    this.productCategory = this.productCategory.charAt(0).toUpperCase() + this.productCategory.slice(1);
    this.showSubCategoryList = true;
    this.subCategories = [];
    this.subCategoryIdName = new Map();
    // Fetching using the categoryId
    this.dbConnector.getSubCategory(this.categoryIdName.get(this.productCategory)).subscribe({  // Name -> categoryID
      next: (response: any) => {
        console.log("Subcategory fetched");
        response.rows.forEach((e: any) => {
          this.subCategories.push(e.value)
          this.subCategoryIdName.set(e.value, e.id);
        });
        console.log(this.subCategories);
        
        // if (this.showProductForm === true)
        //   this.addProduct();
      },
      error: (error) => {
        console.log(error);
      }
    });
  }

  resetProductForm() {
    this.productForm.resetForm();
    
    this.showCategoryList = false;
    this.showSubCategoryList = false;
  }

  checkSearchValueFound(){
    this.isSearchValueFound = this.products.filter( (e) => e.productStatus).some((productDetail) => 
      productDetail.productName.toLowerCase().includes(this.searchBarValue.toLowerCase()))
    return this.searchBarValue.length === 0 ? true :this.isSearchValueFound;
  }
}