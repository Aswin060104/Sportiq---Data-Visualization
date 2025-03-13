import { Component } from '@angular/core';
import { CustomerAddress } from '../../Model/customerAddress.model';
import { CouchDbService } from '../../Services/couchdb.service';
import { Customer } from '../../Model/customer.model';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css',
  standalone : false
})
export class CustomersComponent {

  constructor(readonly dbConnector : CouchDbService){}

  customerDetails : Customer[] = []
  customerAddresses : CustomerAddress[] = [];

  ngOnInit(){
    this.getAllCustomerAddress();
  }

  getAllCustomers(){
    this.dbConnector.getAllCustomers().subscribe({
      next : (response : any) =>{
        response.rows.forEach((e : any) => {
          let addressDetail = this.customerAddresses.find((address) => address.email === e.doc.data.email && address.isActive)
          this.customerDetails.push({email : e.doc.data?.email ?? "", customerName : e.doc.data?.customerName, address : addressDetail?.address ?? "", city : addressDetail?.city ?? "", state : addressDetail?.state ?? "", phoneNumber : addressDetail?.phoneNo ?? ""});
        })
        console.log(this.customerDetails);
      },
      error : (error) =>{
        console.log(error)
      }
    })
  }

  getAllCustomerAddress(){
    this.dbConnector.getAllCustomerAddress().subscribe({
      next : (response) => {
        console.log(response);
        this.customerAddresses = response.rows.map((e: { doc: { data: CustomerAddress }, id: string }) => ({...e.doc.data, customerAddressId :  e.id}))
        console.log(this.customerAddresses);
        this.getAllCustomers()
      },
      error : (error) => {
        console.log(error);
      }
    })
  }
}