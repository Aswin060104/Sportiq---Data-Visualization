export interface Order{
    customerAddressId : string, 
    totalPrice: number,
    orderDate : Date, 
    orderStatus: 'pending' | 'delivered',
    orderAt : string,
    type : "order"
}