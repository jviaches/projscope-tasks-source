import { Component, OnInit } from '@angular/core';
import { ElectronService } from '../../core/services';
import { ThemeService } from '../../core/services/theme.service';

// export interface PeriodicElement {
//   name: string;
//   position: number;
//   weight: number;
//   symbol: string;
// }

// const ELEMENT_DATA: PeriodicElement[] = [
//   {position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H'},
//   {position: 2, name: 'Helium', weight: 4.0026, symbol: 'He'},
//   {position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li'},
//   {position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be'},
//   {position: 5, name: 'Boron', weight: 10.811, symbol: 'B'},
//   {position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C'},
//   {position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N'},
//   {position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O'},
//   {position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F'},
//   {position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne'},
// ];

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {

  constructor(private themeService: ThemeService, private electronService: ElectronService) { }

  //displayedColumns: string[] = ['name', 'actions'];
  //dataSource = ELEMENT_DATA;

  ngOnInit(): void {
    this.themeService.setLightTheme();
  }

  loadProject() {
      this.electronService.loadProject().then(value => {
        this.electronService.ipcRenderer.send('close-project-enable', true)
        this.electronService.redirectTo('/project', false);
      });
  }

  newProject() {
    this.electronService.newProject().then(value => {
      this.electronService.ipcRenderer.send('close-project-enable', true)
      this.electronService.redirectTo('/project', false);
    });

    // this.electronService.newProject().then(value => {
    //   this.router.navigateByUrl('/project');
    // });
  }

  exitProject() {
    this.electronService.exitProgram();
  }
}
