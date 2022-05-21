import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { CustomersService } from './customers.service';
import { Observable } from 'rxjs';
import { QueryList, ViewChildren } from '@angular/core';
import { Customers } from './../config/customers';
import { Customer } from './../interface/customer';
import { SortDirective, SortEvent } from 'src/directive/sort.directive';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder } from '@angular/forms';
import { Validators } from '@angular/forms';
import { read, writeFileXLSX } from 'xlsx';
/* load the codepage support library for extended support with older formats  */
// import { set_cptable } from 'xlsx';
// import * as cptable from 'xlsx/dist/cpexcel.full.mjs';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js';
// set_cptable(cptable);
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [CustomersService, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  customers$: Observable<Customer[]>;
  total$: Observable<number>;
  closeResult: string = '';
  isEdit = false;
  isShow = false;
  isChart = false;
  selectedCustomer: any = [];

  // Chart customer Type
  public barChartOptions: ChartOptions = {
    responsive: true,
  };
  public barChartLabels = ['popular', 'special', 'Blind'];
  public barChartType: ChartType = 'bar';
  public barChartLegend = true;
  public barChartPlugins = [];

  public barChartData: ChartDataset[] = [
    { data: [65, 59, 80], label: 'Customer Type' },
  ];

  customerForm = this.formBuilder.group({
    id: this.makeid(4),
    name: ['', Validators.required],
    email: ['', Validators.required],
    phone: ['', Validators.required],
    address: ['', Validators.required],
  });
  data: any = [];

  @ViewChildren(SortDirective)
  headers!: QueryList<SortDirective>;

  constructor(
    public customerService: CustomersService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private ref: ChangeDetectorRef
  ) {
    this.customers$ = customerService.customers$;
    customerService.customers$.subscribe((res) => {
      if (res) {
        this.data = res;
      }
    });
    this.total$ = customerService.total$;
  }

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.data = this.customerService.datas;
  }

  onSort({ column, direction }: SortEvent) {
    // resetting other headers
    this.headers.forEach((header) => {
      if (header.sortable !== column) {
        header.direction = '';
      }
    });

    this.customerService.sortColumn = column;
    this.customerService.sortDirection = direction;
  }

  open(content: any) {
    this.modalService
      .open(content, { ariaLabelledBy: 'modal-basic-title' })
      .result.then(
        (result) => {
          this.closeResult = `Closed with: ${result}`;
        },
        (reason) => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        }
      );
  }

  saveCustomer() {
    const value = this.customerForm.value;
    this.customerForm.controls['id'].setValue(this.makeid(4));
    if (value) {
      // this.data.push(value);
      this.customerService.datas.push(value);
      this.customerService._customers$.next(this.data);
      this.customerService.searchTerm = "";
      this.ref.detectChanges();
      this.modalService.dismissAll();
    }
  }

  openEdit(content: any, cus: any = {}) {
    this.isEdit = true;
    if (this.isEdit) {
      // SET VALUE
      this.customerForm.controls['id'].setValue(cus.id);
      this.customerForm.controls['name'].setValue(cus.name);
      this.customerForm.controls['email'].setValue(cus.email);
      this.customerForm.controls['phone'].setValue(cus.phone);
      this.customerForm.controls['address'].setValue(cus.address);
    }
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' });
  }

  updateForm() {
    const value = this.customerForm.value;
    this.data.forEach((res: any) => {
      if (res.id === value.id) {
        Object.assign(res, value);
      }
    });
    this.customerService.datas.push(value);
    this.customerService._customers$.next(this.data);
    this.modalService.dismissAll();
  }

  deleteCustomer(cus: any = {}) {
    const filterCus = this.data.filter((res: any) => res.id !== cus.id);
    this.customerService.datas = filterCus;
    this.customerService._customers$.next(filterCus);
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  makeid(length: number) {
    var result = '';
    var characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  exportFile(isCustom: boolean) {
    if (!isCustom) {
      return this.customerService.exportExcel(this.data, 'Customers');
    }

    return this.customerService.exportExcel(this.selectedCustomer, 'Customers');
  }

  selected(customer: any = {}) {
    if (this.selectedCustomer.length <= 0) {
      this.selectedCustomer.push(customer);
    } else {
      const isExist = this.checkExistId(customer.id, this.selectedCustomer);
      if (!isExist) {
        this.selectedCustomer.push(customer);
      } else {
        this.selectedCustomer = this.selectedCustomer.filter((res: any = {}) => res.id !== customer.id);
      }
    }
    this.selectedCustomer.length > 0 ? this.isShow = true : this.isShow = false;
  }

  checkExistId( id: string, arr: []) {
    return arr.some(function(arrVal: any) {
      return +arrVal.id === +id;
    });
  }

  chart() {
    this.isChart = !this.isChart;
  }
}
