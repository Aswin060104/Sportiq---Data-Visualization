import { Component, ElementRef, inject } from '@angular/core';
import { CouchDbService } from '../../Services/couchdb.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.css',
  standalone : false
})
export class TrackingComponent {
  constructor(readonly el : ElementRef, readonly dbConnector: CouchDbService){}

  productNameId : Map<string, [string, string]> = new Map();
  productStockDate : {stock : string, date : Date}[] = [];
  productPriceDate :     {productName : string, originalPrice : number, sellingPrice : number, discountedSellingPrice :number, discount : number, profit : number, type : string, date : Date}[] = [];
  trackingProductName : string = "";
  trackingProductImageUrl :string = "";
  
  isStockView : boolean = false;
  isPriceView : boolean = false;
  isTableView : boolean = false;
  toggleButtonValue : string = "View as Table"
  selectedColumnLabel : string = "originalPrice";
  priceLabels : string[] = ["sellingPrice","profit","discountedSellingPrice","originalPrice","discount"];

  toggleDetailView : boolean = false;

  searchBarValue : string = "";
  isValueFound : boolean = true;
  columnData : number[] = [10,20,40];
  rowLabels : string[] = ['123','23','45'];

  ngOnInit(){
    this.getProductsNameAndImg();
  }

  getProductsNameAndImg(){
    this.dbConnector.getProductsMap().subscribe({
      next : (response : any) => {  
        response.rows.forEach((e : any) => {
          this.productNameId.set(e.key, [e.id, e.value.productImageUrl]);
          console.log(this.productNameId.get(e.key)?.[1]);
        });
      },
       error : () => {
       }
    })
  }
  get productName() : string[]{
    return Array.from(this.productNameId.keys());
  }

  getStockTrack(productName : string, productImageUrl : string){
    this.isStockView = true;
    this.isPriceView = false;
    console.log(productName);
    
    this.dbConnector.getParticularProductStock(productName).subscribe({
      next :(response) => {
        console.log(response);
        this.productStockDate = [];
        this.trackingProductName = productName;
        this.trackingProductImageUrl = productImageUrl;
        this.rowLabels = [];
        this.columnData = [];
        response.rows.forEach( (e : any) => {
          this.productStockDate.push({stock : e.value.stock, date : e.value.updatedAt });
          this.rowLabels.push(e.value.updatedAt.split('T')[0]);
          this.columnData.push(e.value.stock);
          console.log(this.rowLabels);
        })
        this.drawChart('bar','Stock');
      },
      error(error : any){
        console.log(error);
      }
    });
    
   
  }

  getPriceTrack(productName : string, productImageUrl : string){
    this.isPriceView = true;
    this.isStockView = false;
    this.dbConnector.getParticularProductPrice(productName).subscribe({
      next :(response) => {
        console.log(response);
        this.productPriceDate = [];
        this.trackingProductName = productName;
        this.trackingProductImageUrl = productImageUrl;
        this.columnData = [];
        this.rowLabels = [];
        response.rows.forEach( (e : any) => {
          this.productPriceDate.push({productName : e.doc.data.productName, originalPrice : e.doc.data.originalPrice, sellingPrice : e.doc.data.sellingPrice, profit : e.doc.data.profit, discountedSellingPrice : e.doc.data.discountedSellingPrice, discount : e.doc.data.discount, type : e.doc.data.type, date : e.doc.data.updatedAt });
          this.rowLabels.push(e.doc.data.updatedAt.split('T')[0]);
          this.columnData.push(e.doc.data.originalPrice);
        })
        console.log(this.productPriceDate);
        console.log("calling");
        
        this.drawChart('bar','Price');
      },
      error(error : any){
        console.log(error);
      }
    });
  }

  changePriceData(){
    this.columnData = []
    this.columnData = this.productPriceDate.map((e : any) => e[this.selectedColumnLabel])
    console.log(this.columnData);
    this.drawChart('bar','Price'); 
  }

  toggleGraphView(){
    this.isTableView = !this.isTableView;
    if(this.isTableView)
      this.toggleButtonValue = "View as Graph"
    else{
      this.toggleButtonValue = "View as Table"
      setTimeout(() => {
        if(this.isPriceView)
          this.drawChart('bar','Price');    
        else    
          this.drawChart('bar','Stocks');
      }, 100);
    }
  }
  
  showAllProducts(){
    this.isPriceView = false;
    this.isStockView = false;
  }

  checkSearchValueFound(){
    this.isValueFound = this.productName.some((e : any) => {
      return e.toLowerCase().includes(this.searchBarValue?.toLowerCase() ?? '');
    })
    return this.searchBarValue.length === 0 ? true : this.isValueFound;
  }

  private createTooltip(container: HTMLElement): d3.Selection<HTMLDivElement, unknown, null, undefined> {
    return d3.select(container)
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'lightgray')
      .style('padding', '5px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none'); // Prevents tooltip from interfering with mouse events
  }
  
  private addTooltipEvents(
    selection: d3.Selection<d3.BaseType, { index: number; value: number }, SVGGElement, unknown>, 
    tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>, 
    container: HTMLElement,
    labels: string[], 
    labelName: string
  ): void {
    selection
      .on('mouseover', (event: MouseEvent, d) => {
        tooltip
          .style('visibility', 'visible')
          .text(`Label: ${labels[d.index]}, ${labelName}: ${d.value}`);
      })
      .on('mousemove', (event: MouseEvent) => {
        const containerRect = container.getBoundingClientRect(); // Get chart container position
        tooltip
          .style('top', `${event.clientY - containerRect.top + 20}px`) // Adjusted to container
          .style('left', `${event.clientX - containerRect.left + 30}px`);
      })
      .on('mouseout', () => tooltip.style('visibility', 'hidden'));
  }
  
  
  drawChart(type: string, labelName: string): void {
    const container = this.el.nativeElement.querySelector('.graph-container');
    if (!container) {
      console.log("No container");
      return;
    }
  
    let data = this.columnData.map((value, index) => ({ index, value }));
    let labels = this.rowLabels.map((label, index) => `${label}-${index}`);
  
    let width = container.clientWidth || 300;
    let height = container.clientHeight;
  
    const margin = { top: 20, right: 30, bottom: 100, left: 50 };
  
    d3.select(container).select('svg').remove();
    d3.select(container).select('.tooltip').remove();
  
    let svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
  
    const tooltip = this.createTooltip(container);
  
    let x = d3.scaleBand()
      .domain(labels)
      .range([0, width - margin.left - margin.right])
      .padding(0.3);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(data.map(d => d.value)) ?? 10])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);
  
    if (type === 'bar') {
      let bars = svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(labels[d.index])!)
        .attr('y', height - margin.top - margin.bottom)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', 'steelblue')
        .transition()
        .duration(1000)
        .attr('y', d => y(d.value))
        .attr('height', d => height - margin.top - margin.bottom - y(d.value));
  
      this.addTooltipEvents(svg.selectAll('.bar'), tooltip, container, labels, labelName);
  
      svg.append('g')
        .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat((d, i) => labels[i]))
        .selectAll('text')
        .attr('fill', 'black')
        .attr('font-size', '12px')
        .style('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .attr('transform', 'rotate(-30)');
  
      svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll('text')
        .attr('fill', 'black')
        .attr('font-size', '12px');
    } else {
      const line = d3.line<{ index: number, value: number }>()
        .x(d => x(labels[d.index])! + x.bandwidth() / 2)
        .y(d => y(d.value));
  
      svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', line)
        .attr('opacity', 0)
        .transition()
        .duration(1000)
        .attr('opacity', 1);
  
      let circles = svg.selectAll('.circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', d => x(labels[d.index])! + x.bandwidth() / 2)
        .attr('cy', height - margin.top - margin.bottom)
        .attr('r', 5)
        .attr('fill', 'steelblue')
        .transition()
        .duration(1000)
        .attr('cy', d => y(d.value))
        .ease(d3.easeSinOut);
  
      this.addTooltipEvents(svg.selectAll('.circle'), tooltip, container, labels, labelName);
  
      svg.append('g')
        .attr('transform', `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .attr('transform', 'rotate(-30)');
  
      svg.append('g').call(d3.axisLeft(y));
    }
  }  
}