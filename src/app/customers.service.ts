import {
  SortColumn,
  SortEvent,
  SortDirection,
} from './../directive/sort.directive';
import { Injectable, PipeTransform } from '@angular/core';
import { BehaviorSubject, Observable, of, pipe, Subject } from 'rxjs';
import { Customers } from './../config/customers';
import { Customer } from './../interface/customer';
import { DecimalPipe } from '@angular/common';
import { debounceTime, delay, switchMap, tap } from 'rxjs/operators';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

interface SearchResult {
  customers: Customer[];
  total: number;
}

const compare = (v1: string | number, v2: string | number) =>
  v1 < v2 ? -1 : v1 > v2 ? 1 : 0;

function sort(
  customer: Customer[],
  column: SortColumn,
  direction: any
): Customer[] {
  if (direction === '' || column === '') {
    return customer;
  }

  return [...customer].sort((a, b) => {
    const res = compare(a[column], b[column]);
    return (direction = 'asc' ? res : -res);
  });
}

function matches(customer: Customer, term: string) {
  return (
    customer.name.toLowerCase().includes(term.toLowerCase()) ||
    customer.email.toLowerCase().includes(term.toLowerCase()) ||
    customer.phone.toLowerCase().includes(term.toLowerCase()) ||
    customer.address.toLowerCase().includes(term.toLowerCase())
  );
}

interface State {
  page: number;
  pageSize: number;
  searchTerm: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}

@Injectable({
  providedIn: 'root',
})
export class CustomersService {
  private _loading$ = new BehaviorSubject<boolean>(true);
  private _search$ = new Subject<void>();
  _customers$ = new BehaviorSubject<Customer[]>([]);
  private _total$ = new BehaviorSubject<number>(0);

  datas = Customers;

  fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  fileExtension = '.xlsx';

  private _state: State = {
    page: 1,
    pageSize: 30,
    searchTerm: '',
    sortColumn: '',
    sortDirection: '',
  };

  constructor(private pipe: DecimalPipe) {
    this._search$
      .pipe(
        tap(() => this._loading$.next(true)),
        debounceTime(200),
        switchMap(() => this._search()),
        delay(200),
        tap(() => this._loading$.next(false))
      )
      .subscribe((res) => {
        this._customers$.next(res.customers);
        this._total$.next(res.total);
      });

    this._search$.next();
  }

  get customers$() {
    return this._customers$.asObservable();
  }
  get total$() {
    return this._total$.asObservable();
  }
  get loading$() {
    return this._loading$.asObservable();
  }
  get page() {
    return this._state.page;
  }
  get pageSize() {
    return this._state.pageSize;
  }
  get searchTerm() {
    return this._state.searchTerm;
  }

  set page(page: number) {
    this._set({ page });
  }
  set pageSize(pageSize: number) {
    this._set({ pageSize });
  }
  set searchTerm(searchTerm: string) {
    this._set({ searchTerm });
  }
  set sortColumn(sortColumn: SortColumn) {
    this._set({ sortColumn });
  }
  set sortDirection(sortDirection: SortDirection) {
    this._set({ sortDirection });
  }

  private _set(patch: Partial<State>) {
    Object.assign(this._state, patch);
    this._search$.next();
  }

  private _search(): Observable<SearchResult> {
    const { sortColumn, sortDirection, pageSize, page, searchTerm } =
      this._state;
    // 1. sort
    let customers = sort(this.datas, sortColumn, sortDirection);

    // 2. filter
    customers = customers.filter((cus) => matches(cus, searchTerm));
    const total = customers.length;

    // 3. paginate
    customers = customers.slice(
      (page - 1) * pageSize,
      (page - 1) * pageSize + pageSize
    );

    return of({ customers, total });
  }

  public exportExcel(jsonData: any[], fileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(jsonData);
    const wb: XLSX.WorkBook = { Sheets: { 'data': ws }, SheetNames: ['data'] };
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    this.saveExcelFile(excelBuffer, fileName);
  }

  private saveExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], {type: this.fileType});
    FileSaver.saveAs(data, fileName + this.fileExtension);
  }
}
