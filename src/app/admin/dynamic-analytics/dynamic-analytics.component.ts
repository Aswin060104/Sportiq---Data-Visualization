import { ChangeDetectorRef, Component, ElementRef, inject } from '@angular/core';
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

@Component({
  selector: 'dynamic-analytics',
  templateUrl: './dynamic-analytics.component.html',
  styleUrl: './dynamic-analytics.component.css',
  standalone: false
})
export class AdminNavBarComponent {

  constructor(readonly http: HttpClient, readonly el: ElementRef, readonly cdRef: ChangeDetectorRef, readonly dbConnector: CouchDbService) { }

  orders: Order[] = [];
  allAddress: any = [];
  allProducts : Product[] = [];
  searchBarValue: string = "";
  labels = ['']// Labels for X-axis
  selectedChart = ''; // Default chart type
  colors = d3.scaleOrdinal(d3.schemeCategory10);

  productLabels: string[] = [];
  categoryLabels: string[] = [];
  cityLabels: string[] = [];

  rowLabels: Map<string, boolean> = new Map();
  columnLabels: Map<string, boolean> = new Map();
  additionalLabels: Map<string, boolean> = new Map();

  objects: { id: number, value: string, checked: boolean }[] = [
    { id: 1, value: 'Product', checked: false },
    { id: 2, value: 'Order', checked: false },
    { id: 3, value: 'Customer', checked: false },
    { id: 4, value: 'Category', checked: false }
  ];

  possibleColumnLabels: Map<string, boolean> = new Map();

  selectedObjects: string[] = [];
  selectedRowLabel: string = "";  //Default values
  selectedColumnLabel: string = "";
  additionalColumnLabel: string = "";

  productData: Map<string, { sales: number, profit: number, quantity: number, orderCount: number, discountedSellingPrice: number, originalPrice: number, stock: number, discount: number }> = new Map();
  categoryData: Map<string, { sales: number, profit: number, quantity: number, orderCount: number }> = new Map();
  subCategoryData: Map<string, { sales: number, orderCount: number, quantity: number }> = new Map();

  cityData: Map<string, { sales: number, quantity: number, orderCount: number, customerCount: number }> = new Map();
  cityCustomersCount: Map<string, number> = new Map();
  stateCustomersCount: Map<string, number> = new Map();
  customerData: Map<string, { sales: number, orderCount: number }> = new Map();
  stateSales: Map<string, { sales: number, orderCount: number }> = new Map();
  dateData: Map<string, { sales: number, orderCount: number }> = new Map();

  minDate : Date = new Date('9999-12-31');
  maxDate : Date = new Date();

  mappedRowColumn: Map<string, string[]> = new Map();
  mappedObjectLabels: Map<string, string[]> = new Map();
  additionalColumnsMap: Map<string, string[]> = new Map();
  tickedCount: number = 0;

  columnData: number[] = [];
  columnData2: number[] = [];
  temColumnData: any = [];

  comparisonField1: string = "";
  comparisonField2: string = "";
  comparisonDataField1: number[] = [];
  comparisonDataField2: number[] = [];

  ngOnInit(): void {
    this.fetchOrders();
    this.rowLabels.clear();
    //corresponding x and y-axis
    this.mappedRowColumn.set("Category", ["Orders Count", "Sales", "Profit", "Items Sold"]);
    this.mappedRowColumn.set("Products Name", ["Orders Count", "Sales", "Profit", "Items Sold", "Selling Price", "Original Price", "Stock", "Discount"]);
    this.mappedRowColumn.set("City", ["Orders Count", "Sales", "Customers","Items Sold"]);
    this.mappedRowColumn.set("State", ["Orders Count", "Sales"]);
    this.mappedRowColumn.set("Order Date", ["Orders Count", "Sales"]);
    this.mappedRowColumn.set("Customer", ["Orders Count", "Sales"]);

    // Object-wise labels
    this.mappedObjectLabels.set("Product", ["Products Name", "Selling Price", "Original Price", "Discount", "Stock"]);
    this.mappedObjectLabels.set("Order", ["Orders Count", "Order Date", "Sales", "Items Sold", "City", "State"]);
    this.mappedObjectLabels.set("Customer", ["Customer"]);
    this.mappedObjectLabels.set("Category", ["Category"]);

    this.additionalColumnsMap.set("Selling Price", ["Original Price"]);
    this.additionalColumnsMap.set("Original Price", ["Selling Price"]);
    this.additionalColumnsMap.set("Orders Count", ["Items Sold"]);
    this.additionalColumnsMap.set("Items Sold",["Orders Count"]);
    // use Array in the above
    console.log(this.maxDate);
    
  }

  get rowLabelsKeys(): string[] {
    return Array.from(this.rowLabels.keys())
  }

  get columnLabelsKeys(): string[] {
    return Array.from(this.columnLabels.keys())
  }

  get possibleColumnLabelsKeys(): string[] {
    return Array.from(this.possibleColumnLabels.keys());
  }

  get additionalLabelsKeys() : string[] {
    return Array.from(this.additionalLabels.keys());
  }

  fetchOrders() {
    this.dbConnector.getAllDocs().subscribe({
      next: (response: any) => {
        response = response.rows.slice(1, response.rows.length)

        let allDocs = response.map((row: any) => row.doc);
        console.log("Response received");
        const orders = allDocs.filter((doc: any) => doc?.data?.type === "order");
        const orderDetails = allDocs.filter((doc: any) => doc?.data?.type === "orderDetail");
        const cart = allDocs.filter((doc: any) => doc?.data?.type === "add-to-cart");
        const addresses = allDocs.filter((doc: any) => doc?.data?.type === "address");
        this.allAddress = addresses;
        const products = allDocs.filter((doc: any) => doc?.data?.type === "product");
        this.allProducts = products.map((e : {_id : string, data : Product}) => e.data)
        const categories = allDocs.filter((doc: any) => doc?.data?.type === "category");
        const subcategories = allDocs.filter((doc: any) => doc?.data?.type === "subcategory");
        const prices = allDocs.filter((doc: any) => doc?.data?.type === "price");
        const reviews = allDocs.filter((doc: any) => doc?.data?.type === "review");

        this.orders = orderDetails.map((orderDetail: any) => {

          const order = orders.find((od: any) => od._id === orderDetail?.data.orderId);
          const cartItem = cart.find((c: any) => c._id === orderDetail?.data.cartId);
          const customerAddress = addresses.find((c: any) => c._id === order?.data.customerAddressId);
          const address = addresses.find((a: any) => a._id === customerAddress?._id);
          const product = products.find((p: any) => p.data.productName === cartItem?.data.productName);
          const subcategory = subcategories.find((sub: any) => sub._id === product?.data.productSubCategoryId);
          const category = categories.find((cat: any) => cat._id === subcategory?.data.categoryId);
          const priceData = prices.find((price: any) => price.data.productName === product?.data.productName);
          const review = reviews.find((r: any) => r.data.productName === product?.data.productName);

      
            const orderDate = new Date(order.data.orderDate); // Convert to Date
            if (orderDate < this.minDate) {
              this.minDate = orderDate;
            }
          
          return {
            orderId: order?._id,
            email: address?.data.email || "N/A",
            city: address?.data.city.toLowerCase() || "N/A",
            state: address?.data.state.toLowerCase() || "N/A",
            productName: product?.data.productName || "N/A",
            quantity: cartItem?.data.quantity || 0,
            category: category?.data.categoryName || "N/A",
            discountedSellingPrice: product?.data.discountedSellingPrice || 0,
            originalPrice: product?.data.productOriginalPrice,
            profit: priceData ? product.data.discountedSellingPrice - product.data.productOriginalPrice : 0,
            ratings: review?.data.rating || 0,
            orderDate: order?.data.orderDate || "N/A",
            totalPrice: cartItem?.data.quantity * product?.data.discountedSellingPrice,
            discount: product?.data.productDiscount,
            stock: product?.data.productStock
          };
        });
        console.log(this.orders);
        console.log(this.minDate.toLocaleDateString('en-GB'));
        
        let currentDate = new Date(this.minDate); // Start from minDate

        while (currentDate <= this.maxDate) {
          const dateKey = currentDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          if (!this.dateData.has(dateKey)) {
            this.dateData.set(dateKey, { sales: 0, orderCount: 0 }); // Default values
          }
          currentDate.setDate(currentDate.getDate() + 1); // Move to next day
        }
        console.log(this.dateData);
        
        this.prepareData();
      },
      error: (error) => {
        console.error("Error fetching data from CouchDB:", error);
      }
    })
  }

  prepareData() {
    console.log(this.orders);
    this.allAddress.forEach((address: any) => {
      let city = address.data.city.toLowerCase();
      this.cityCustomersCount.set(city, (this.cityCustomersCount.get(city) ?? 0) + 1);
      let state = address.data.state.toLowerCase();
      this.stateCustomersCount.set(state, (this.stateCustomersCount.get(state) ?? 0) + 1);
    })


    this.allProducts.forEach((e) => {
      this.productData.set(e.productName, {sales : 0, profit : e.discountedSellingPrice - e.productOriginalPrice, quantity : 0, orderCount : 0, discountedSellingPrice : e.discountedSellingPrice, stock : e.productStock, discount : e.productDiscount, originalPrice : e.productOriginalPrice})
    })
    this.orders.forEach((order: Order) => {
      let quantity: number = (this.productData.get(order.productName)?.quantity ?? 0) + order.quantity;
      let profit: number = (this.productData.get(order.productName)?.profit ?? 0) + order.profit * quantity;
      let sales: number = (this.productData.get(order.productName)?.sales ?? 0) + order.totalPrice;
      let orderCount: number = (this.productData.get(order.productName)?.orderCount ?? 0) + 1;
      this.productData.set(order.productName, { sales: sales, quantity: quantity, profit: profit, orderCount: orderCount, discountedSellingPrice: order.discountedSellingPrice, originalPrice: order.originalPrice, stock: order.stock, discount: order.discount });
      // console.log(order.city); no vnr

      quantity = (this.cityData.get(order.city)?.quantity ?? 0) + order.quantity;
      sales = (this.cityData.get(order.city)?.sales ?? 0) + order.totalPrice;
      orderCount = (this.cityData.get(order.city)?.orderCount ?? 0) + 1;
      let customerCount = this.cityCustomersCount.get(order.city) ?? 1;
      this.cityData.set(order.city, { sales: sales, orderCount: orderCount, quantity: quantity, customerCount: customerCount });

      sales = (this.stateSales.get(order.state)?.sales ?? 0) + order.totalPrice;
      orderCount = (this.stateSales.get(order.state)?.orderCount ?? 0) + 1;
      this.stateSales.set(order.state, { sales: sales, orderCount: orderCount });

      quantity = (this.categoryData.get(order.category)?.quantity ?? 0) + order.quantity;
      profit = (this.categoryData.get(order.category)?.profit ?? 0) + order.profit * quantity;
      sales = (this.categoryData.get(order.category)?.sales ?? 0) + order.totalPrice;
      orderCount = (this.categoryData.get(order.category)?.orderCount ?? 0) + 1;
      this.categoryData.set(order.category, { quantity: quantity, profit: profit, sales: sales, orderCount: orderCount })

      sales = (this.customerData.get(order.email)?.sales ?? 0) + order.totalPrice;
      orderCount = (this.customerData.get(order.email)?.orderCount ?? 0) + 1;
      this.customerData.set(order.email, { sales: sales, orderCount: orderCount });

      sales = (this.dateData.get(order.orderDate)?.sales ?? 0) + order.totalPrice;
      orderCount = (this.dateData.get(order.orderDate)?.orderCount ?? 0) + 1;
      this.dateData.set(order.orderDate, { sales: sales, orderCount: orderCount });
    })

    console.log(this.cityCustomersCount);
    console.log(this.stateCustomersCount);
    console.log(this.productData);
    console.log(this.categoryData);
    console.log(this.cityData);
    console.log(this.customerData);
    this.updateGraph();
  }

  toggleValue(index: number, type: 'object') { // Called whenever there is a change in the object

    if (type == 'object') {
      this.objects[index].checked = !this.objects[index].checked;
      this.selectedColumnLabel = "";  // To avoid showing the labels of deselected object
      this.selectedRowLabel = "";
      this.additionalColumnLabel = "";
      this.columnData = [];
      this.columnData2 = [];
      this.temColumnData = [];
      this.rowLabels.clear();
      this.possibleColumnLabels.clear();
      this.columnLabels.clear();
      this.additionalLabels.clear();
      this.cdRef.detectChanges();
    }
    this.filterLabels();
  }


  filterLabels() { // Called whenever there is a change in the object checkbox
    this.selectedObjects = [];
    this.objects.forEach((e) => {  // Filters the selected objects
      if (e.checked)
        this.selectedObjects.push(e.value);
    })
    console.log("selected objects : ",this.selectedObjects);
    
    this.selectedObjects.forEach((objectName) => {  // This acts as key for the mappedObjectLabels
      let availableLabels = this.mappedObjectLabels.get(objectName) ?? [] // All labels for the particular object

      this.mappedRowColumn.forEach((values, key) => { // separating row and column form the available labels
        if (availableLabels.includes(key) && !this.rowLabels.has(key)) { // Add the key (one) in the row if only exist in the available
          this.rowLabels.set(key, false)
        }
        values.forEach((value) => {
          if (availableLabels.includes(value) && !this.columnLabels.has(value)) // Add the value (multiple) in the column if only exist in the available
            this.columnLabels.set(value, false)
        })
      })
    })
  }

  toggleLabelValue(type: 'row' | 'column' | 'additional', labelName?: string) {
    
    if (type === 'row' && labelName) { 
      this.rowLabels.forEach((value, key) => this.rowLabels.set(key, false));
      this.rowLabels.set(labelName, true);
      this.selectedRowLabel = labelName; // assigning the selected row
      
      let allPossibleColumnLabels: string[] = this.mappedRowColumn.get(this.selectedRowLabel) ?? []; // all possible labels for the selected x-axis
      this.possibleColumnLabels.clear();

      this.columnLabels.forEach((value, key) => { // columnLabels contains all the possible values for the x -axis, we filtering for the selected row (x-axis)
        if (allPossibleColumnLabels.includes(key))
          this.possibleColumnLabels.set(key, false);  // possibleColumnLabels - only valid labels
      })
      this.additionalLabels.clear();
      console.log("Possible column ");
      console.log(this.possibleColumnLabels);
      console.log("Column Labels : ");
      console.log(this.columnLabels);
      this.columnData = [];
      this.columnData2 = [];
      this.selectedColumnLabel = "";
      this.cdRef.detectChanges();
    }

    else if (type === 'column' && labelName) {
      this.additionalLabels.clear();
      this.selectedColumnLabel = labelName
      this.possibleColumnLabels.forEach((value, key) => this.possibleColumnLabels.set(key, false));
      this.possibleColumnLabels.set(labelName, true);
      let additionalLabels : string[] = this.additionalColumnsMap.get(this.selectedColumnLabel) ?? [];
      additionalLabels.forEach((e) => {
        if(this.possibleColumnLabels.has(e))
          this.additionalLabels.set(e, false);        
    })
    this.cdRef.detectChanges();
    console.log("Column Labels : ");
      console.log(this.columnLabels);
      this.columnData2 = [];
      this.additionalColumnLabel = ""
    }
    else if(type === 'additional' && labelName && this.selectedChart != 'pie'){
      if(labelName === this.additionalColumnLabel && this.additionalLabels.get(this.additionalColumnLabel)){
        console.log("Deselecting");
        
        this.additionalLabels.set(labelName, false);
        this.additionalColumnLabel = "";
        this.columnData2 = [];
      }
      else{
        console.log("NEW additional");
        
        this.additionalLabels.forEach((value, key) => this.additionalLabels.set(key, false) )
        this.additionalLabels.set(labelName, true);
        this.additionalColumnLabel = labelName;
        }
    }
    this.cdRef.detectChanges();
    this.updateGraph();
  }

  updateGraph() {
    this.temColumnData = []
    this.columnData2 = [];
    switch (this.selectedRowLabel) {
      case "Products Name":
        this.labels = [];
        this.columnData = [];
        this.productData.forEach((value, key) => { 
          if(value.sales !== 0 ||  this.mappedObjectLabels.get("Product")?.includes(this.selectedColumnLabel)) {
            this.labels.push(key); 
            this.temColumnData.push(value);
          }
        });
        break;
      case "City":
        this.labels = [];
        this.columnData = [];
        this.cityData.forEach((value, key) => { this.labels.push(key); this.temColumnData.push(value); })
        break;
      case "Category":
        this.labels = [];
        this.columnData = [];
        this.categoryData.forEach((value, key) => { this.labels.push(key); this.temColumnData.push(value); });
        break;
      case "Customer":
        this.labels = [];
        this.columnData = [];
        this.customerData.forEach((value, key) => { this.labels.push(key); this.temColumnData.push(value); });
        break;
      case "Order Date":
        this.labels = [];
        this.columnData = [];
        this.dateData.forEach((value, key) => { this.labels.push(key); this.temColumnData.push(value); });
        break;
      case "State":
        this.labels = [];
        this.columnData = [];
        this.stateSales.forEach((value, key) => { this.labels.push(key.slice(0, 1).toUpperCase() + key.slice(1, key.length)); this.temColumnData.push(value); });
        break;
      default:
        this.resetAllData();
        console.log("Invalid row label");
    }
    switch (this.selectedColumnLabel) {
      case "Profit":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.profit);   });
        break;
      case "Sales":
        this.temColumnData.forEach((value: any) => { (this.columnData.push(value.sales)); });
        break;
      case "Items Sold":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.quantity); });
        break;
      case "Selling Price":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.discountedSellingPrice );  });
        break;
      case "Orders Count":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.orderCount);  });
        break;
      case "Customers":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.customerCount);  });
        break;
      case "Original Price":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.originalPrice) });
        break;
      case "Stock":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.stock); });
        break;
      case "Discount":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.discount); });
        break;
      default:
        this.resetAllData();
        console.log("Invalid column value");
    }
    switch (this.additionalColumnLabel) {
      case "Original Price":
        this.temColumnData.forEach((value: any) => { this.columnData2.push(value.originalPrice); });
        break;
      case "Selling Price":
        this.temColumnData.forEach((value: any) => { this.columnData2.push(value.discountedSellingPrice); });
        break;
      case "Items Sold":
        this.temColumnData.forEach((value: any) => { this.columnData2.push(value.quantity);});
        break;
      case "Orders Count":
        this.temColumnData.forEach((value: any) => { this.columnData2.push(value.orderCount); });
        break;

      default:
        console.log("Invalid additional Label");

    }

    console.log(this.possibleColumnLabels);

    this.labels = this.labels.map((e) => e.slice(0, 1).toUpperCase() + e.slice(1, e.length));
    this.drawChart();
  }

  resetAllData() {
    this.labels = [];
    this.columnData = [];
    this.columnData2 = [];
    this.additionalLabels.clear();
    this.additionalColumnLabel = "";
  }

  sortData(sortingType : 'ascending' | 'descending'){
    let combinedData = this.columnData.map((value, index) => ({data1 :value, label : this.labels[index], data2 : this.columnData2[index]}));
    if(sortingType === 'ascending')
      combinedData.sort((a,b) => a.data1 - b.data1)
    else
      combinedData.sort((a,b) => b.data1 - a.data1)
    this.columnData = combinedData.map((item) => item.data1)
    this.columnData2 = combinedData.map((item) => item.data2)
    this.labels = combinedData.map((item) => item.label)
    this.drawChart();
  }

  onChartTypeChange(event: any): void {
    this.selectedChart = event.target.value;
    this.drawChart();
  }

  drawChart(): void {
    const container = this.el.nativeElement.querySelector('.chart-container');
    const containerWidth = container.clientWidth || 500;
    const width = containerWidth;
    const height = 500;
    const margin = { top: 20, right: 30, bottom: 100, left: 60 };

    // Remove any existing chart before drawing
    d3.select(container).select('svg').remove();
    d3.select(container).select('.tooltip').remove();

    const svg = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'tooltip');
    // Common X and Y scales for bar and line charts
    const x = d3.scaleBand()
      .domain(this.labels)
      .range([0, width - margin.left - margin.right])
      .padding(0.7);

    const maxDataValue = d3.max([
      ...this.columnData ?? [],
      ...this.columnData2 ?? []
    ]) ?? 0;

    const y = d3.scaleLinear()
      .domain([0, maxDataValue])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    const combinedData = this.labels.map((label, i) => ({
      label,
      value1: this.columnData[i] ?? 0,  // First dataset
      value2: this.columnData2?.[i] ?? null, // Second dataset (optional)
    }));

    if (this.additionalColumnLabel != "" && this.selectedChart != 'pie' && this.selectedChart != "")
      this.drawLegend(svg, width, [this.selectedColumnLabel, this.additionalColumnLabel]);
    else if (this.selectedChart != 'pie' && this.selectedChart != "")
      this.drawLegend(svg, width, [this.selectedColumnLabel])

    if (this.selectedChart === 'bar') {
      const barGroups = svg.selectAll('.bar-group')
        .data(combinedData)
        .enter()
        .append('g')
        .attr('class', 'bar-group')
        .attr('transform', (d) => `translate(${x(d.label)!}, 0)`);

      // Define bar width
      const barWidth = x.bandwidth() / (this.columnData && this.columnData2 ? 2 : 1);

      // First Bar (Always Present if Data Exists)
      barGroups
        .filter((d) => d.value1 !== null) // Only create bars when data is available
        .append('rect')
        .attr('class', 'bar bar1')
        .attr('x', (this.columnData2 ? 0 : barWidth / 2)) // Center when only one bar
        .attr('y', height - margin.top - margin.bottom)
        .attr('width', barWidth)
        .attr('height', 0)
        .attr('fill', 'steelblue')
        .on('mouseover', (event, d) => {
          const [mouseX, mouseY] = d3.pointer(event);
          tooltip
            .style('visibility', 'visible')
            .text(`Label: ${d.label}, ${this.selectedColumnLabel}: ${d.value1}`)
            .style('top', `${mouseY - 20}px`)
            .style('left', `${mouseX + 10}px`);
        })
        .on('mousemove', (event) => {
          const [mouseX, mouseY] = d3.pointer(event);
          tooltip
            .style('top', `${mouseY - 20}px`)
            .style('left', `${mouseX + 10}px`);
        })
        .on('mouseout', () => {
          tooltip.style('visibility', 'hidden');
        })
        .transition()
        .duration(1000)
        .attr('y', (d) => y(d.value1))
        .attr('height', (d) => height - margin.top - margin.bottom - y(d.value1));

      // Second Bar (Only Present if `columnData2` Exists)
      barGroups
        .filter((d) => d.value2 !== null) // Only create bars when second dataset is available
        .append('rect')
        .attr('class', 'bar bar2')
        .attr('x', barWidth) // Shift second bar to the right
        .attr('y', height - margin.top - margin.bottom)
        .attr('width', barWidth)
        .attr('height', 0)
        .attr('fill', 'orange')
        .on('mouseover', (event, d) => {
          const [mouseX, mouseY] = d3.pointer(event);
          tooltip
            .style('visibility', 'visible')
            .text(`Label: ${d.label}, ${this.additionalColumnLabel}: ${d.value2}`)
            .style('top', `${mouseY - 20}px`)
            .style('left', `${mouseX + 10}px`);
        })
        .on('mousemove', (event) => {
          const [mouseX, mouseY] = d3.pointer(event);
          tooltip
            .style('top', `${mouseY - 20}px`)
            .style('left', `${mouseX + 10}px`);
        })
        .on('mouseout', () => {
          tooltip.style('visibility', 'hidden');
        })
        .transition()
        .duration(1000)
        .attr('y', (d) => y(d.value2))
        .attr('height', (d) => height - margin.top - margin.bottom - y(d.value2));

      // X-axis
      svg.append('g')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "14px")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-30)");

      // Y-axis
      svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "14px");
    }

    else if (this.selectedChart === 'line') {
      console.log(this.labels.length);
      
      const line = d3.line<number>()
        .x((_: any, i: any) => x(this.labels[i])! + x.bandwidth() / 2)
        .y((d: any) => y(d))
      // .curve(d3.curveMonotoneX);

      svg.append('path')
        .datum(this.columnData)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', line);

      if (this.columnData2 && this.columnData2.length > 0) {
        svg.append("path")
          .datum(this.columnData2)
          .attr("fill", "none")
          .attr("stroke", 'tomato')
          .attr("stroke-width", 2)
          .attr("d", line);
      }

      const datasets = [
        { data: this.columnData, class: 'circle1', color: 'steelblue', label: this.selectedColumnLabel },
        { data: this.columnData2, class: 'circle2', color: 'tomato', label: this.additionalColumnLabel }
      ];

      datasets.forEach(({ data, class: className, color, label }) => {
        if (!data || data.length === 0) return; // Skip if dataset is missing or empty

        svg.selectAll(`.${className}`)
          .data(data)
          .enter()
          .append('circle')
          .attr('class', className)
          .attr('cx', (_: any, i: any) => x(this.labels[i])! + x.bandwidth() / 2)
          .attr('cy', height - margin.top - margin.bottom)
          .attr('r', 5)
          .attr('fill', color)
          .on('mouseover', (event, d) => {
            tooltip
              .style('visibility', 'visible')
              .text(`Label: ${this.labels[data.indexOf(d)]}, ${label}: ${d}`)
              .style('top', `${event.pageY - 30}px`)
              .style('left', `${event.pageX + 10}px`);
          })
          .on('mousemove', (event) => {
            tooltip
              .style('top', `${event.pageY - 30}px`)
              .style('left', `${event.pageX + 10}px`);
          })
          .on('mouseout', () => tooltip.style('visibility', 'hidden'))
          .transition()
          .duration(1000)
          .attr('cy', d => y(d))
          .ease(d3.easeQuad);
      });

      svg.append('g')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`) // Fix Y-positioning
        .call(d3.axisBottom(x))
        .selectAll('text')  // Select the labels
        .attr('transform', 'translate(0,20)')
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-30)");
      ; // Rotate labels for better visibility

      svg.append('g').call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "14px");

    } else if (this.selectedChart === 'pie') {
      this.additionalColumnLabel = "";
      this.columnData2 = [];
      const radius = Math.min(width, height) / 2.15;
      const pie = d3.pie<number>().value(d => d);
      const arc = d3.arc<d3.PieArcDatum<number>>()
        .innerRadius(0)
        .outerRadius(radius - 10);

      const dataReady = pie(this.columnData);

      const g = svg.append('g')
        .attr('transform', `translate(${width / 2.5},${height / 2})`);  // place the pie in center

      g.selectAll('path')
        .data(dataReady)
        .enter()
        .append('path')
        .attr('d', arc as any)
        .attr('fill', (_: any, i: any) => this.colors(i.toString()))
        .attr('opacity', 0)

        // Bind event listeners **before** transition
        .on('mouseover', (event, d) => {
          tooltip
            .style('visibility', 'visible')
            .text(`Label: ${this.labels[d.index]}, ${this.selectedColumnLabel}: ${d.value}`)
            .style('top', `${event.pageY - 20}px`)
            .style('left', `${event.pageX + 10}px`);
        })
        .on('mousemove', (event) => {
          tooltip
            .style('top', `${event.pageY - 20}px`)
            .style('left', `${event.pageX + 10}px`);
        })
        .on('mouseout', () => {
          tooltip.style('visibility', 'hidden');
        })

        // Apply transition after event binding
        .transition()
        .duration(1000)
        .attr('opacity', 1);

      this.drawLegend(svg, width, this.labels);
    }
  }

  drawLegend(svg: any, width: number, labels: string[]) {
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 350}, 20)`);

    labels.forEach((label, i) => {
      legend.append('rect')
        .attr('x', 0)
        .attr('y', i * 20)
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', this.colors(i.toString()));

      legend.append('text')
        .attr('x', 15)
        .attr('y', i * 20 + 9)
        .text(label);
    });
  }
}
// from 783