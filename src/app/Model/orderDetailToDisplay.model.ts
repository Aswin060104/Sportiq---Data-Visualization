export interface OrderDetailToDisplay{
    orderId : string,
    customerAddressId : string,
    email: string, 
    city: string, 
    state: string, 
    totalPrice: number,
    orderDate : Date, 
    orderStatus: 'pending' | 'delivered' ,
    type : "order",
    orderAt : string
}