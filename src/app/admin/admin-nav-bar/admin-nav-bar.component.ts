import { Component, ElementRef, inject } from '@angular/core';
import { CouchDbService } from '../../Services/couchdb.service';
import * as d3 from 'd3';
import { HttpClient } from '@angular/common/http';

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
  selector: 'app-admin-nav-bar',
  templateUrl: './admin-nav-bar.component.html',
  styleUrl: './admin-nav-bar.component.css',
  standalone: false
})
export class AdminNavBarComponent {
  dbConnector: CouchDbService = inject(CouchDbService);

  orders: Order[] = [];
  allAddress: any = [];
  searchBarValue: string = "";
  labels = ['']// Labels for X-axis
  selectedChart = 'bar'; // Default chart type
  colors = d3.scaleOrdinal(d3.schemeCategory10);

  productLabels: string[] = [];
  categoryLabels: string[] = [];
  cityLabels: string[] = [];

  rowLabels: Map<string, boolean> = new Map();
  columnLabels: Map<string, boolean> = new Map();

  objects: { id: number, value: string, checked: boolean }[] = [
    { id: 1, value: 'Product', checked: false },
    { id: 2, value: 'Order', checked: false },
    { id: 3, value: 'Customer', checked: false },
    { id: 4, value: 'Category', checked: false }
  ];

  columnLabels222: Map<string, boolean> = new Map();

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


  mappedRowColumn: Map<string, string[]> = new Map();
  filteredRowColumn: Map<string, string[]> = new Map();
  additionalColumnMap: Map<string, string> = new Map();
  tickedCount: number = 0;

  columnData: number[] = [];
  columnData2: number[] = [];
  temColumnData: any = [];

  comparisonField1: string = "";
  comparisonField2: string = "";
  comparisonDataField1: number[] = [];
  comparisonDataField2: number[] = [];

  constructor(readonly http: HttpClient, readonly el: ElementRef) { }

  ngOnInit(): void {
    this.fetchOrders();
    this.rowLabels.clear();
    //corresponding x and y-axis
    this.mappedRowColumn.set("Category", ["Orders", "Sales", "Profit", "Quantity"]);
    this.mappedRowColumn.set("Products Name", ["Orders", "Sales", "Profit", "Quantity", "Selling Price", "Original Price", "Stock", "Discount"]);
    this.mappedRowColumn.set("City", ["Orders", "Sales", "Customers"]);
    this.mappedRowColumn.set("State", ["Orders", "Sales"]);
    this.mappedRowColumn.set("Order Date", ["Orders", "Sales"]);
    this.mappedRowColumn.set("Customer", ["Orders", "Sales"]);

    // Object-wise labels
    this.filteredRowColumn.set("Product", ["Products Name", "Selling Price", "Original Price", "Discount", "Stock"]);
    this.filteredRowColumn.set("Order", ["Orders", "Order Date", "Sales", "Quantity", "City", "State"]);
    this.filteredRowColumn.set("Customer", ["Customer"]);
    this.filteredRowColumn.set("Category", ["Category"]);

    this.additionalColumnMap.set("Selling Price", "Original Price");
    this.additionalColumnMap.set("Original Price", "Selling Price");
    this.additionalColumnMap.set("Orders", "Quantity");
    this.additionalColumnMap.set("Quantity", "Orders");
  }

  get onlyRowLabels(): string[] {
    return Array.from(this.rowLabels.keys())
  }

  get onlyColumnLabels(): string[] {
    return Array.from(this.columnLabels.keys())
  }

  get finalColumnLabels(): string[] {
    return Array.from(this.columnLabels222.keys());
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
        const categories = allDocs.filter((doc: any) => doc?.data?.type === "category");
        const subcategories = allDocs.filter((doc: any) => doc?.data?.type === "subcategory");
        const prices = allDocs.filter((doc: any) => doc?.data?.type === "price");
        const reviews = allDocs.filter((doc: any) => doc?.data?.type === "review");

        this.orders = orderDetails.map((orderDetail: any) => {

          const order = orders.find((od: any) => od._id === orderDetail?.data.orderId);
          const cartItem = cart.find((c: any) => c._id === orderDetail?.data.cartId);
          const customerAddress = addresses.find((c: any) => c._id === order?.data.customerAddressId);
          console.log("Customer Address : ");
          // console.log(order.data.customerAddressId);

          // console.log(customerAddress._id);

          // const address = addresses.find((a: any) => a.data.email === customerAddress?.data.email);
          const address = addresses.find((a: any) => a._id === customerAddress?._id);
          // console.log(address);

          const product = products.find((p: any) => p.data.productName === cartItem?.data.productName);
          const subcategory = subcategories.find((sub: any) => sub._id === product?.data.productSubCategoryId);
          const category = categories.find((cat: any) => cat._id === subcategory?.data.categoryId);
          const priceData = prices.find((price: any) => price.data.productName === product?.data.productName);
          const review = reviews.find((r: any) => r.data.productName === product?.data.productName);

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
            discount: product?.data.discount,
            stock: product?.data.stock
          };
        });
        console.log(this.orders);
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
      this.columnData2 = [];
      this.rowLabels.clear();
      this.columnLabels222.clear();
      this.columnLabels.clear()
    }
    this.filterLabels();
  }


  filterLabels() { // Called whenever there is a change in the object checkbox
    console.log("Filtering");
    this.selectedObjects = [];
    this.rowLabels.clear();
    this.columnLabels.clear();
    this.objects.forEach((e) => {  // Filters the selected objects
      if (e.checked)
        this.selectedObjects.push(e.value);
    })
    this.selectedObjects.forEach((value) => {  // This acts as key for the filteredRowColumn
      let availableLabels = this.filteredRowColumn.get(value) ?? [] // All labels for the particular label

      this.mappedRowColumn.forEach((values, key) => {
        if (availableLabels.includes(key) && !this.rowLabels.has(key)) { // Add the key (one) in the row if only exist in the available
          this.rowLabels.set(key, false)
        }
        values.forEach((value) => {
          if (availableLabels.includes(value) && !this.columnLabels.has(value)) // Add the value (multiple) in the column if only exist in the available
            this.columnLabels.set(value, false)
        })
      })
    })
    this.drawChart();
  }

  toggleLabelValue(type: 'row' | 'column', labelName?: string) {

    this.rowLabels.forEach((value, key) => {
      if (key != labelName && type === 'row') // To avoid the clicked label becomes false again - If it false then it became true in next part
        this.rowLabels.set(key, false);
    })
    if (type === 'row' && labelName) { // making the selected checked is true
      if (!this.rowLabels.get(labelName)) {
        this.selectedRowLabel = labelName;
        this.rowLabels.set(labelName, true)
      }
      else { // executed when a selected value is deselected
        this.rowLabels.set(labelName, false)
        this.selectedRowLabel = "";
      }

      let possibleColumnLabels: string[] = this.mappedRowColumn.get(this.selectedRowLabel) ?? []; // all labels for the selected x-axis
      this.columnLabels222.clear();
      this.columnLabels.forEach((value, key) => { // columnLabels contains all the possible values for the x -axis, we filtering for the selected row (x-axis)
        if (possibleColumnLabels.includes(key))
          this.columnLabels222.set(key, false);  // columnLabels222 - only valid labels
      })
    }



    if (type === 'column' && labelName) {
      this.resetAllData();
      if (this.additionalColumnMap.get(this.selectedColumnLabel) === labelName) { // checking for Clicked label is mapped with column label
        if (this.columnLabels222.get(labelName)) {  // Deselecting the label
          this.columnLabels222.set(labelName, false);
          this.additionalColumnLabel = "";
          this.updateGraph();
          return;
        }
        else
          this.columnLabels222.set(labelName, true);
        this.additionalColumnLabel = labelName;
        console.log("VALID label");
        console.log(this.additionalColumnMap.get(this.selectedColumnLabel));
        this.updateGraph();
        this.columnData2 = [];
        return;
      }
      this.columnLabels222.forEach((value, key) => {
        if (labelName != key && !value)
          this.columnLabels222.set(key, false);
        if (key == labelName && !value) {
          this.selectedColumnLabel = labelName;
          this.columnLabels222.set(key, true);
        }
        else { // executed when a selected value is deselected
          this.columnLabels222.set(key, false);
          console.log("Deselecting");
          console.log(this.additionalColumnLabel);
          
          }
        console.log("Column label : ", this.selectedColumnLabel);
      })
      // console.log(this.columnLabels222);

    }
    this.updateGraph();
  }

  updateGraph() {
    this.temColumnData = []
    this.columnData2 = [];
    // let salesIndex = this.columnLabels222.findIndex(col => col.value === "Sales");
    // let orderIndex = this.columnLabels222.findIndex(col => col.value === "Orders");
    // let quantityIndex = this.columnLabels222.findIndex(col => col.value === "Quantity");
    // let additionalLabelIndex = this.columnLabels222.findIndex(col => col.value === this.additionalColumnLabel);
    // let sellingPriceIndex = this.columnLabels222.findIndex(col => col.value === "Selling Price");
    switch (this.selectedRowLabel) {
      case "Products Name":
        this.labels = [];
        this.columnData = [];
        this.productData.forEach((value, key) => { this.labels.push(key); this.temColumnData.push(value); });
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
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.profit === undefined ? value.sales : value.profit); if (value.profit === undefined) { this.selectedColumnLabel = "Sales"; this.columnLabels222.set("Sales", true); } });
        break;
      case "Sales":
        this.temColumnData.forEach((value: any) => { (this.columnData.push(value.sales)); this.selectedColumnLabel = "Sales"; this.columnLabels222.set("Sales", true); });
        break;
      case "Quantity":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.quantity === undefined ? value.sales : value.quantity); if (value.quantity === undefined) { this.selectedColumnLabel = "Sales"; this.columnLabels222.set("Sales", true); } });
        break;
      case "Selling Price":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.discountedSellingPrice === undefined ? value.sales : value.discountedSellingPrice); if (value.discountedSellingPrice === undefined) { this.selectedColumnLabel = "Sales"; this.columnLabels222.set("Sales", true); } });
        break;
      case "Orders":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.orderCount === undefined ? value.sales : value.orderCount); if (value.orderCount === undefined) { this.selectedColumnLabel = "Sales"; this.columnLabels222.set("Sales", true); } });
        break;
      case "Customers":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.customerCount === undefined ? value.sales : value.customerCount); if (value.customerCount === undefined) { this.selectedColumnLabel = "Sales"; this.columnLabels222.set("Sales", true); } });
        break;
      case "Original Price":
        this.temColumnData.forEach((value: any) => { this.columnData.push(value.originalPrice === undefined ? value.sales : value.originalPrice); if (value.originalPrice === undefined) { this.selectedColumnLabel = "Sales"; this.columnLabels222.set("Sales", true); } });
        break;
      default:
        this.resetAllData();
        console.log("Invalid column value");
    }
    switch (this.additionalColumnLabel) {
      case "Original Price":
        this.temColumnData.forEach((value: any) => { this.columnData2.push(value.originalPrice); this.columnLabels222.set("Original Price", true); });
        break;
      case "Selling Price":
        this.temColumnData.forEach((value: any) => { this.columnData2.push(value.discountedSellingPrice); this.columnLabels222.set("Selling Price", true); });
        break;
      case "Quantity":
        this.temColumnData.forEach((value: any) => { this.columnData2.push(value.quantity); this.columnLabels222.set("Quantity", true); });
        break;
      case "Orders":
        this.temColumnData.forEach((value: any) => { this.columnData2.push(value.orderCount); this.columnLabels222.set("Orders", true); });
        break;

      default:
        console.log("Invalid additional Label");

    }

    // console.log(this.labels);
    // console.log(this.columnData);
    console.log(this.columnLabels222);

    this.labels = this.labels.map((e) => e.slice(0, 1).toUpperCase() + e.slice(1, e.length));
    this.drawChart();
  }

  resetAllData() {
    this.labels = [];
    this.columnData = [];
    this.columnData2 = [];
    this.additionalColumnLabel = "";
  }

  ngAfterViewInit(): void {
    this.drawChart(); // Draw default chart on load
    window.addEventListener('resize', () => this.drawChart()); // Make it responsive
  }

  onChartTypeChange(event: any): void {
    this.selectedChart = event.target.value;
    this.drawChart();
  }

  private drawChart(): void {
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

    if (this.additionalColumnLabel != "")
      this.drawLegend(svg, width, [this.selectedColumnLabel, this.additionalColumnLabel]);
    else if (this.selectedChart != 'pie')
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

    // These will  be used later
    // if (this.selectedChart === 'bar') {
    //   svg.selectAll('.bar')
    //     .data(this.columnData)
    //     .enter()
    //     .append('rect')
    //     .attr('class', 'bar')
    //     .attr('x', (_: any, i: any) => x(this.labels[i])!)
    //     .attr('y', height - margin.top - margin.bottom)
    //     .attr('width', x.bandwidth())
    //     .attr('height', 0)
    //     .attr('fill', 'steelblue')
    //     .on('mouseover', (event, d) => {
    //       const [x, y] = d3.pointer(event); // Get correct x, y coordinates
    //       tooltip
    //         .style('visibility', 'visible')
    //         .text(`Label: ${this.labels[this.columnData.indexOf(d)]}, ${this.selectedColumnLabel}: ${d}`)
    //         .style('top', `${y - 20}px`)
    //         .style('left', `${x + 10}px`);
    //     })
    //     .on('mousemove', (event) => {
    //       const [x, y] = d3.pointer(event);
    //       tooltip
    //         .style('top', `${y - 20}px`)
    //         .style('left', `${x + 10}px`);
    //     })
    //     .on('mouseout', () => {
    //       tooltip.style('visibility', 'hidden')
    //     })
    //     .transition()
    //     .duration(1000)
    //     .attr('y', (d: any) => y(d))
    //     .attr('height', (d: any) => height - margin.top - margin.bottom - y(d));
    //   svg.append('g')
    //     .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
    //     .call(d3.axisBottom(x))
    //     .selectAll("text")  // Select all X-axis labels
    //     .style("font-size", "14px")  // Increase font size
    //     .attr("dx", "-0.5em")  // Adjust horizontal spacing if needed
    //     .attr("dy", "0em")   // Adjust vertical spacing if needed
    //     .attr("text-anchor", "end")
    //     .attr("transform", "rotate(-30)"); // Keep it centered
    //   svg.append('g')
    //     .call(d3.axisLeft(y))
    //     .selectAll("text")  // Select all Y-axis labels
    //     .style("font-size", "14px")  // Increase font size
    //   // .style("font-weight", "bold");  // Make it bold


    // } 
    else if (this.selectedChart === 'line') {
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
          .ease(d3.easeSinOut);
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