export interface Product{
    productName : string,
    productSubCategoryId : string,
    productDescription : string,
    productImageUrl : string,
    productStock : number,
    productOriginalPrice : number ,
    productSellingPrice : number,
    productDiscount : number,
    discountedSellingPrice : number,
    productStatus : boolean,
    addedAt : Date,
    timeStamp : number,
    type : string
}