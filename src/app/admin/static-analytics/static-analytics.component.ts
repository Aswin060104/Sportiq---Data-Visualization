import { Component, ElementRef, inject } from '@angular/core';
import { CouchDbService } from '../../Services/couchdb.service';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import * as d3 from 'd3';

@Component({
  selector: 'app-analytics',
  templateUrl: './static-analytics.component.html',
  styleUrl: './static-analytics.component.css',
  standalone: false
})
export class AnalyticsComponent {
  dbConnector: CouchDbService = inject(CouchDbService);

  labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G']; // Labels for X-axis
  selectedChart = 'bar'; // Default chart type
  colors = d3.scaleOrdinal(d3.schemeCategory10);

  productLabels: string[] = [];
  categoryLabels: string[] = [];
  cityLabels: string[] = [];

  rowLabels: string[] = ["Products", "Category"];
  columnLabels: string[] = ["Profit", "Sales", "Quantity"];

  selectedRowLabel: string = "Products";  //Default values
  selectedColumnLabel: string = "Sales";

  productData: Map<string, { sales: number | undefined, profit: number | undefined, quantity: number | undefined, subCategoryId: string | undefined, categoryId: string }> = new Map();
  categoryData: Map<string | undefined, { categoryName: string | undefined, sales: number | undefined, profit: number | undefined, quantity: number | undefined }> = new Map();
  cityData: Map<string, { sales: number | undefined, profit: number | undefined, quantity: number | undefined }> = new Map();

  //Preparing city and state values
  orderIdLocationMap: Map<string, { city: string, state: string }> = new Map();
  cartIdOrderId: Map<string, string> = new Map();
  cartIdProductName: Map<string, string> = new Map();
  productNameCity: Map<string, Map<string, number>> = new Map();
  cityCount: Map<string, number> = new Map();

  columnData: number[] = [];

  comparisonField1: string = "";
  comparisonField2: string = "";
  comparisonDataField1: number[] = [];
  comparisonDataField2: number[] = [];

  ngOnInit() {
    this.getProductData();
    this.getOrderLocations();
    this.getOrderIdCartId();
  }

  updateComparisonGraph() {
    console.log("Updating");
  }

  getOrderIdCartId() {
    this.dbConnector.getOrderDetailsMap().subscribe({
      next: (response) => {
        response.rows.forEach((e: any) => {
          this.cartIdOrderId.set(e.value, e.key);
        })
      },
      error: () => {
        console.log("Error in  fetching orderId and cartId")
      }
    });
  }

  getCartDetail() { // only purchased
    this.dbConnector.getDetailedCartMap().subscribe({ // productName and 
      next: (response) => {
        response.rows.forEach((e: any) => {   // e.id --> cartId
          this.cartIdProductName.set(e.id, e.doc.data.productName);
          const orderId = this.cartIdOrderId.get(e.id);
          if (orderId) {
            const orderId = this.cartIdOrderId.get(e.id);
            const locationData = orderId ? this.orderIdLocationMap.get(orderId) : undefined;
            const city = locationData?.city ?? undefined;
            if (city) {
              const productName = e.doc.data.productName;

              // Ensure each product has its own city count map
              if (!this.productNameCity.has(productName)) {
                this.productNameCity.set(productName, new Map<string, number>());
              }

              // Get the city count map for the specific product
              const productCityCount = this.productNameCity.get(productName)!;

              // Get current count for the city
              const currentCityCount = productCityCount.get(city) ?? 0;

              // Update the city count for the product
              productCityCount.set(city, currentCityCount + 1);

              // Store the updated productCityCount back into productNameCity
              this.productNameCity.set(productName, productCityCount);
            }

          }
          else {
            console.log("No order Id", e.id);
          }
        })
        console.log(this.productNameCity);
        console.log(this.cartIdProductName);
        console.log(this.cartIdOrderId);

      },
      error: () => {
        console.log("Error in  fetching orderId and cartId")
      }
    });
  }

  getProductData() {
    this.dbConnector.getCartMap().subscribe({  // This (cart) view only have the purchased products
      next: (response: any) => { // key as ProductName and value as quantity
        const requests = response.rows.map((productAndQuantity: any) =>
          this.dbConnector.getParticularProduct(productAndQuantity.key).pipe(  // Transforms the response into key value pair 
            //                                                                      stores inside the requests variable
            map((productResponse: any) => ({
              key: productAndQuantity.key,
              value: {
                quantity: productAndQuantity.value, // The quantity is fetched used reduce from the cart view
                sales: productResponse.rows[0].doc.data.productSellingPrice,
                profit: productResponse.rows[0].doc.data.discountedSellingPrice - productResponse.rows[0].doc.data.productOriginalPrice,
                subCategoryId: productResponse.rows[0].doc.data.productSubCategoryId,
                categoryId: ""
              }
            })
            ))
        );

        forkJoin(requests).subscribe({ // Fork is used to log the productData correctly
          next: (productsData: any) => { // This will have key (Name) value (more Property inside a object) pair
            this.productData = new Map();
            productsData.forEach((item: any) => this.productData.set(item.key, item.value));
            this.getCategoryId();
          },
          error: (error) => {
            console.error(error);
          }
        });
      },
      error: (error: any) => {
        console.log(error);
      }
    });
  }


  getCategoryId() {
    const categoryRequests: Promise<void>[] = []; // Store promises to wait for all updates
    this.productData.forEach((value: any, key: any) => {
      const request = new Promise<void>((resolve) => {
        this.dbConnector.getParticularSubCategory(this.productData.get(key)?.subCategoryId ?? "")
          .pipe(map((response: any) => response.data.categoryId)) // only need categoryId -- Fetched from subcategory view for the products which are purchased
          .subscribe({
            next: (categoryId: any) => {
              let currentProductData = this.productData.get(key) ?? {
                sales: 0,
                quantity: 0,
                profit: 0,
                subCategoryId: "",
                categoryId: ""
              };
              // Update productData
              this.productData.set(key, { ...currentProductData, categoryId });
              resolve(); // Mark this request as completed
            },
            error: (error: any) => {
              console.log(error);
              resolve(); // Prevent blocking if an error occurs
            }
          });
      });
      categoryRequests.push(request);
    });

    // Wait for all updates to complete before logging
    Promise.all(categoryRequests).then(() => {
      // console.log("Final productData after all updates:", this.productData);
      this.setCategoryData();
    });
  }

  setCategoryData() {

    let categoryIdRequest: Promise<void>[] = [];
    this.productData.forEach((value: any, key: any) => {

      const categoryId: string | undefined = this.productData.get(key)?.categoryId;

      if (categoryId) { // Ensure categoryId is not undefined
        const request = new Promise<void>((resolve) => {

          this.dbConnector.getParticularCategory(categoryId).subscribe({
            next: (response: any) => {
              let existingCategoryData = this.categoryData.get(categoryId) ?? { sales: 0, profit: 0, quantity: 0 };
              this.categoryData.set(categoryId, {
                sales: (existingCategoryData.sales ?? 0) + (value.sales ?? 0),
                profit: (existingCategoryData.profit ?? 0) + (value.profit ?? 0),
                quantity: (existingCategoryData.quantity ?? 0) + (value.quantity ?? 0),
                categoryName: response.data.categoryName
              });
              resolve();
            },
            error: () => {
              resolve();
            }
          });
        })
        categoryIdRequest.push(request);
      }
    });
    Promise.all(categoryIdRequest).then(() => {
      // console.log(this.categoryData);
      this.updateGraph();
    })
  }

  getOrderLocations() {
    this.dbConnector.getAllOrders().subscribe({
      next: (response) => {
        const orderLocations = response.rows.map((e: any) => {
          return this.dbConnector.getCustomerDetails(e.doc.data.customerAddressId).pipe(
            map((customerDetail) => ({
              key: e.id,
              value: { city: customerDetail.data.city, state: customerDetail.data.state }
            }))
          )
        })
        forkJoin(orderLocations).subscribe({
          next: (response: any) => {
            // console.log("order");
            response.forEach((e: any) => {
              this.orderIdLocationMap.set(e.key, e.value);
            })
            console.log("Order Locations");

            console.log(this.orderIdLocationMap);
            setTimeout(() => {

            }, 200);
            this.getCartDetail();
          },
          error: (error) => {
            // console.log(orderLocations);

            console.log("Error in orderLocation", error);

          }
        })
      },
      error: (error) => {
        console.log("error while fetching all orders")
      }
    })
  }

  updateGraph() {
    let finalColumnData: any[] = []; // This will store the columnData of the selectedRowLabel
    if (this.selectedRowLabel === 'Products') {
      this.columnData = [];
      this.labels = [];
      this.productData.forEach((value, key) => {
        this.labels.push(key);
        finalColumnData.push(value);
      })
    }
    else if (this.selectedRowLabel === 'Category') {
      this.labels = [];
      this.columnData = [];
      this.categoryData.forEach((value, key) => {
        this.labels.push(value.categoryName ?? "No name");
        finalColumnData.push(value);
      })
    }
    else {
      console.log("No matching row label");
    }
    if (this.selectedColumnLabel === 'Sales') {
      finalColumnData.forEach((value) => {
        this.columnData.push(value.sales ?? 0);
      })
    }
    else if (this.selectedColumnLabel === 'Profit') {
      finalColumnData.forEach((value) => {
        this.columnData.push(value.profit ?? 0);
      })
    }
    else if (this.selectedColumnLabel === 'Quantity') {
      finalColumnData.forEach((value) => {
        this.columnData.push(value.quantity ?? 0);
      })
    }
    else {
      console.log("No matching column label");
    }
    this.drawChart();
  }

  constructor(readonly el: ElementRef) { }

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

    const y = d3.scaleLinear()
      .domain([0, d3.max(this.columnData) ?? 0])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    if (this.selectedChart === 'bar') {

      svg.selectAll('.bar')
        .data(this.columnData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (_: any, i: any) => x(this.labels[i])!)
        .attr('y', height - margin.top - margin.bottom)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', 'steelblue')
        .on('mouseover', (event, d) => {
          const [x, y] = d3.pointer(event); // Get correct x, y coordinates
          tooltip
            .style('visibility', 'visible')
            .text(`Label: ${this.labels[this.columnData.indexOf(d)]}, ${this.selectedColumnLabel}: ${d}`)
            .style('top', `${y - 20}px`)
            .style('left', `${x + 10}px`);
        })
        .on('mousemove', (event) => {
          const [x, y] = d3.pointer(event);
          tooltip
            .style('top', `${y - 20}px`)
            .style('left', `${x + 10}px`);
        })
        .on('mouseout', () => {
          tooltip.style('visibility', 'hidden')
        })
        .transition()
        .duration(1000)
        .attr('y', (d: any) => y(d))
        .attr('height', (d: any) => height - margin.top - margin.bottom - y(d));


      svg.append('g')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")  // Select all X-axis labels
        .style("font-size", "14px")  // Increase font size
        .attr("dx", "-0.5em")  // Adjust horizontal spacing if needed
        .attr("dy", "0em")   // Adjust vertical spacing if needed
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-30)"); // Keep it centered

      svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll("text")  // Select all Y-axis labels
        .style("font-size", "14px")  // Increase font size
      // .style("font-weight", "bold");  // Make it bold


    } else if (this.selectedChart === 'line') {
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

      svg.selectAll('.circle')
        .data(this.columnData)
        .enter()
        .append('circle')
        .attr('cx', (_: any, i: any) => x(this.labels[i])! + x.bandwidth() / 2)
        .attr('cy', height - margin.top - margin.bottom)
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .on('mouseover', (event, d) => {
          tooltip
            .style('visibility', 'visible')
            .text(`Label: ${this.labels[this.columnData.indexOf(d)]}, ${this.selectedColumnLabel}: ${d}`)
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

      svg.append('g')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`) // Fix Y-positioning
        .call(d3.axisBottom(x))
        .selectAll('text')  // Select the labels
        .style('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .attr('transform', 'translate(0,20)'); // Rotate labels for better visibility

      svg.append('g').call(d3.axisLeft(y));

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

      this.drawLegend(svg, width);
    }
  }

  drawLegend(svg: any, width: number) {
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 350}, 20)`);

    this.labels.forEach((label, i) => {
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