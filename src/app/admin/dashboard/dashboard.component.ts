import { Component, ElementRef, inject } from '@angular/core';
import * as d3 from 'd3';
import { CouchDbService } from '../../Services/couchdb.service';
import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  standalone: false
})
export class DashboardComponent {

  query: string = '';
  results: any = "";

  onSearch() {
    console.log("calling");

    if (this.searchValue.trim()) {
      this.dbConnector.searchDocs(this.searchValue).subscribe({
        next: (response) => {
          console.log(response);
        },
        error: (error) => {
          console.log(error);
        }
      });
    }
  }

  salesLabel: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  yearlySalesLabel: string[] = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "August", "Sep", "Oct", "Nov", "Dec"]

  searchValue: string = ""
  salesDataMap: Map<string, number> = new Map();
  customerCount: Map<string, number> = new Map();
  totalRegistrations : number = 0;
  totalSales: number = 0;
  salesData: number[] = [];
  orderCount: number[] = [];
  totalOrders: number = 0;
  el: ElementRef = inject(ElementRef);
  dbConnector: CouchDbService = inject(CouchDbService);

  recentOrders: { orderId: string, email: string, city: string, state: string, totalPrice: number }[] = []
  topSellingProducts: { productName: string, productImageUrl: string, quantity: number }[] = [];

  get customerCountValue() : number[]{
    return Array.from(this.customerCount.values());
  }

  ngOnInit() {
    const todayIndex = new Date().getDay() + 1;
    this.salesLabel = [...this.salesLabel.slice(todayIndex), ...this.salesLabel.slice(0, todayIndex)];
    this.getRecentOrders();
    this.getTopProducts();
    this.getRecentCustomer();
  }

  ngAfterViewInit() {
    this.drawChart('.yearly-sales-chart', this.yearlySalesLabel, this.salesData4, 'line', 'sales');
    this.getOrderSales();
  }

  getOrderSales() {  // Only gets the last seven days sales
    this.dbConnector.getAllOrdersMap().subscribe({
      next: (response) => {
        console.log(response)
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // Ensure exactly 7 days (including today)

        const salesDataTemp = new Map<string, { total: number; count: number }>();

        response.rows.forEach((e: { key: string; value: { total: number; count: number } }) => {
          salesDataTemp.set(e.key, e.value);
        });

        // Fill missing dates with default values
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(sevenDaysAgo.getDate() + i);
          const dateKey = date.toISOString().split('T')[0]; // Format YYYY-MM-DD

          const value = salesDataTemp.get(dateKey) || { total: 0, count: 0 };

          this.salesDataMap.set(dateKey, value.count);
          this.salesData.push(value.total);
          this.orderCount.push(value.count);
          this.totalSales += value.total;
          this.totalOrders += value.count;
        }
        console.log(this.salesDataMap);
        this.drawChart('.sales-chart', this.salesLabel, this.salesData, 'bar', 'sales');
        this.drawChart('.order-chart', this.salesLabel, this.orderCount, 'bar', 'orders');
      },
      error: () => {
        console.log("Error while fetching orders")
      }
    });
  }

  getTopProducts() {
    this.dbConnector.getCartMap().subscribe({
      next: (response) => {
        // Sort data
        response.rows.sort((a: any, b: any) => b.value - a.value);
        const sortedData = response.rows.slice(0, 5);

        console.log("Sorted Data", sortedData);

        // Map each request to an observable
        const productRequests = sortedData.map((e: any) =>
          this.dbConnector.getParticularProductMap(e.key).pipe(
            map((productResponse) => ({
              productName: e.key,
              productImageUrl: productResponse.rows[0].value.productImageUrl,
              quantity: e.value
            }))
          )
        );

        // Execute all requests and maintain the order
        forkJoin(productRequests).subscribe({
          next: (products: any) => {
            this.topSellingProducts = products;
            console.log(this.topSellingProducts);
          },
          error: () => {
            console.log("Error while fetching recent orders");
          }
        });
      },
      error: () => {
        console.log("Error while fetching orders");
      }
    });
  }

  getRecentOrders() {
    this.dbConnector.getRecentOrders().subscribe({
      next: (response) => {
        console.log(response);
        const requests = response.rows.map((e: any) =>
          this.dbConnector.getCustomerDetails(e.doc.data.customerAddressId).pipe(
            map((customerDetail: any) => (
              {
                key: e.id,
                value: {
                  email: customerDetail.data.email,
                  city: customerDetail.data.city,
                  state: customerDetail.data.state,
                  totalPrice: e.doc.data.totalPrice
                },
              }))
          )
        );

        forkJoin(requests).subscribe({
          next: (customerDetails: any) => {
            customerDetails.forEach((e: any) => {
              this.recentOrders.push({ orderId: e.key, email: e.value.email, city: e.value.city, state: e.value.state, totalPrice: e.value.totalPrice })
            })
            console.log("Customer Details:", customerDetails);
          },
          error: () => {
            console.log("Error while fetching customer details");
          },
        });
      },
      error: () => {
        console.log("Error while fetching recent orders");
      },
    });
  }

  getRecentCustomer() {
    this.dbConnector.getAllCustomers().subscribe({
      next: (response) => {
        console.log(response);
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // Include today

        // Temporary storage for customer registrations
        const customerDataTemp = new Map<string, number>();

        // Process customer documents
        response.rows.forEach((e: any) => {
          const customer = e.doc.data;
          if (customer?.createdDate) {
            customerDataTemp.set(customer.createdDate, (customerDataTemp.get(customer.createdDate) ?? 0) + 1);
          }
        });
        console.log("Temporary ");
        
        console.log(customerDataTemp);
        console.log(this.customerCount);
        
        // Fill last 7 days with registration counts
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(sevenDaysAgo.getDate() + i);
          const dateKey = date.toISOString().split('T')[0]; // Format YYYY-MM-DD

          const count = customerDataTemp.get(dateKey) ?? 0;
          this.customerCount.set(dateKey, count);
          this.totalRegistrations += count;
        }

        console.log("Registration Count for Last 7 Days:", this.customerCount);
        console.log("Total Registrations in Last 7 Days:", this.totalRegistrations);
        this.drawChart('.user-chart', this.salesLabel, this.customerCountValue, 'line', 'new users');
    
      },
      error: (error) => {
        console.log(error)
      }
    })
  }

  salesData2: number[] = [15, 25, 35, 25, 55, 20, 40]; // Line chart 1 data
  salesData3: number[] = [5, 10, 6, 10, 12, 8];  // Line chart 2 data
  salesData4: number[] = [10, 15, 13, 10, 12, 8, 6, 10, 15, 12, 7, 11];  // Line chart 2 data

  private drawChart(containerClass: string, labels: string[], data: number[], type: string, label: string): void {
    const container = this.el.nativeElement.querySelector(containerClass);
    if (!container) return;

    let width = 400, height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };

    if (containerClass === '.yearly-sales-chart') {
      width = 700;
      height = 250;
    }

    d3.select(container).select('svg').remove(); // Clear previous chart
    d3.select(container).select('.tooltip').remove();

    let svg = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    svg.style('padding', '50px');

    const tooltip = this.createTooltip(container);

    let x = d3.scaleBand()
      .domain(labels)
      .range([0, width - margin.left - margin.right])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data) ?? 0])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    if (type === 'bar') {
      svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (_, i) => x(labels[i])!)
        .attr('y', height - margin.top - margin.bottom)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', 'steelblue')
        .on('mouseover', (event, d) => this.showTooltip(event, tooltip, label, d))
        .on('mousemove', (event) => this.moveTooltip(event, tooltip))
        .on('mouseout', () => this.hideTooltip(tooltip))
        .transition()
        .duration(1000)
        .attr('y', (d) => y(d))
        .attr('height', (d) => height - margin.top - margin.bottom - y(d));
    }

    if (type === 'line') {
      if (containerClass === '.yearly-sales-chart') {
        x = d3.scaleBand()
          .domain(labels)
          .range([0, width - margin.left - margin.right])
          .padding(1);
        svg.attr('width', x.bandwidth() * 10.7);
      }

      const line = d3.line<number>()
        .x((_, i) => x(labels[i])! + x.bandwidth() / 2)
        .y((d) => y(d));

      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', 'green')
        .attr('stroke-width', 2)
        .attr('d', line);

      svg.selectAll('.dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', (_, i) => x(labels[i])! + x.bandwidth() / 2)
        .attr('cy', (d) => y(d))
        .attr('r', 4)
        .attr('fill', 'green')
        .on('mouseover', (event, d) => this.showTooltip(event, tooltip, label, d))
        .on('mousemove', (event) => this.moveTooltip(event, tooltip))
        .on('mouseout', () => this.hideTooltip(tooltip));
    }

    svg.append('g')
      .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x))
      .style("font-size", "14px");

    svg.append('g').call(d3.axisLeft(y));
  }

  /** Utility function to create a tooltip */
  private createTooltip(container: any) {
    return d3.select(container)
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'lightgray')
      .style('padding', '5px')
      .style('border-radius', '4px');
  }

  /** Utility function to show the tooltip */
  private showTooltip(event: any, tooltip: any, label: string, data: number) {
    tooltip
      .style('visibility', 'visible')
      .text(`${label}: ${data}`)
      .style('top', `${event.pageY - 30}px`)
      .style('left', `${event.pageX + 10}px`);
  }

  /** Utility function to move the tooltip */
  private moveTooltip(event: any, tooltip: any) {
    tooltip
      .style('top', `${event.pageY - 30}px`)
      .style('left', `${event.pageX + 10}px`);
  }

  /** Utility function to hide the tooltip */
  private hideTooltip(tooltip: any) {
    tooltip.style('visibility', 'hidden');
  }
}